import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pythonBin = process.env.PYTHON_BIN || "python";
const pollMs = Math.max(1000, Number(process.env.MODEL_WORKER_POLL_MS) || 3000);
const once = process.argv.includes("--once");
const generatorPath = fileURLToPath(new URL("./generate.py", import.meta.url));

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required by the model worker.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function extensionFor(mimeType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function runGenerator({
  imagePath,
  outputPath,
  heightCm,
  widthCm,
  shapeMode,
  backTexture,
}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      pythonBin,
      [
        generatorPath,
        "--image",
        imagePath,
        "--output",
        outputPath,
        "--height-cm",
        String(heightCm),
        "--width-cm",
        String(widthCm),
        "--shape-mode",
        shapeMode,
        "--back-texture",
        backTexture,
      ],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else
        reject(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `Generator exited with code ${code}.`,
          ),
        );
    });
  });
}

async function claimNextJob() {
  const { data: claimed, error } = await supabase
    .rpc("claim_model_job")
    .maybeSingle();
  if (error) throw error;
  return claimed;
}

async function processJob(job) {
  const startedAt = Date.now();
  let tempDirectory;
  let uploadedModelPath;

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id,height_cm,width_cm,shape_mode,back_texture,artisans!inner(owner_id)",
      )
      .eq("id", job.product_id)
      .single();
    if (productError) throw productError;

    const artisan = Array.isArray(product.artisans)
      ? product.artisans[0]
      : product.artisans;
    if (!artisan?.owner_id)
      throw new Error("The product artisan does not have an owner account.");
    if (!product.height_cm || !product.width_cm)
      throw new Error("Product dimensions are missing.");

    const { data: source, error: sourceError } = await supabase
      .from("product_source_assets")
      .select("storage_path,mime_type")
      .eq("product_id", job.product_id)
      .eq("ordinal", 0)
      .single();
    if (sourceError) throw sourceError;

    const { data: download, error: downloadError } = await supabase.storage
      .from("product-source")
      .download(source.storage_path);
    if (downloadError) throw downloadError;

    tempDirectory = await mkdtemp(path.join(tmpdir(), "crafttrust-model-"));
    const inputPath = path.join(
      tempDirectory,
      `source${extensionFor(source.mime_type)}`,
    );
    const outputPath = path.join(tempDirectory, "model.glb");
    await writeFile(inputPath, Buffer.from(await download.arrayBuffer()));

    await supabase
      .from("products")
      .update({ model_status: "processing", model_error: null })
      .eq("id", job.product_id);

    await runGenerator({
      imagePath: inputPath,
      outputPath,
      heightCm: product.height_cm,
      widthCm: product.width_cm,
      shapeMode: product.shape_mode,
      backTexture: product.back_texture,
    });

    const model = await readFile(outputPath);
    const report = JSON.parse(
      await readFile(path.join(tempDirectory, "model.json"), "utf8"),
    );
    const version = randomUUID();
    uploadedModelPath = `${artisan.owner_id}/${job.product_id}/model-${version}.glb`;

    const { error: uploadError } = await supabase.storage
      .from("product-assets")
      .upload(uploadedModelPath, model, {
        contentType: "model/gltf-binary",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: publicAsset } = supabase.storage
      .from("product-assets")
      .getPublicUrl(uploadedModelPath);
    const modelUrl = publicAsset.publicUrl;
    const generationMs = Date.now() - startedAt;

    const { error: updateError } = await supabase
      .from("products")
      .update({
        model_url: modelUrl,
        ar_url: modelUrl,
        model_status: "review",
        model_report: report,
        model_error: null,
        model_version: version,
      })
      .eq("id", job.product_id);
    if (updateError) throw updateError;

    const { error: finishError } = await supabase
      .from("model_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        generation_ms: generationMs,
        error: null,
      })
      .eq("id", job.id);
    if (finishError) throw finishError;

    console.log(`[model-worker] completed ${job.id} in ${generationMs} ms`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 2000)
        : String(error).slice(0, 2000);
    if (uploadedModelPath) {
      await supabase.storage.from("product-assets").remove([uploadedModelPath]);
    }
    await Promise.all([
      supabase
        .from("products")
        .update({ model_status: "failed", model_error: message })
        .eq("id", job.product_id),
      supabase
        .from("model_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          generation_ms: Date.now() - startedAt,
          error: message,
        })
        .eq("id", job.id),
    ]);
    console.error(`[model-worker] failed ${job.id}: ${message}`);
  } finally {
    if (tempDirectory)
      await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function main() {
  console.log(
    `[model-worker] ready; polling every ${pollMs} ms${once ? " (once)" : ""}`,
  );
  do {
    try {
      const job = await claimNextJob();
      if (job) await processJob(job);
      else if (once) return;
    } catch (error) {
      console.error(
        "[model-worker] poll error:",
        error instanceof Error ? error.message : error,
      );
      if (once) process.exitCode = 1;
    }
    if (!once && !stopping) await sleep(pollMs);
  } while (!once && !stopping);
}

await main();

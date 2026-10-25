import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, hostname } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const workerDirectory = fileURLToPath(new URL("./", import.meta.url));
const venvPython = path.join(workerDirectory, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const configuredPython = process.env.PYTHON_BIN;
const pythonBin =
  configuredPython
    ? (configuredPython.includes("/") || configuredPython.includes("\\")
        ? path.resolve(workerDirectory, configuredPython)
        : configuredPython)
    : (existsSync(venvPython) ? venvPython : "python");
const pollMs = Math.max(1000, Number(process.env.MODEL_WORKER_POLL_MS) || 3000);
const once = process.argv.includes("--once");
const generatorPath = fileURLToPath(new URL("./generate.py", import.meta.url));
const workerId = process.env.WORKER_ID || `worker-${process.pid}-${hostname()}`;
const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max runtime watchdog

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
  console.log(`[model-worker] SIGINT received, stopping gracefully...`);
  stopping = true;
});
process.on("SIGTERM", () => {
  console.log(`[model-worker] SIGTERM received, stopping gracefully...`);
  stopping = true;
});

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function extensionFor(mimeType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

async function sendHeartbeat(jobId, step, progress = 0) {
  try {
    const { error } = await supabase.rpc("heartbeat_model_job", {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_step: step,
      p_progress: progress,
    });
    if (error) throw error;
  } catch (err) {
    // Non-fatal warning
    console.warn(`[model-worker] heartbeat warning for ${jobId}:`, err?.message || err);
  }
}

function runGenerator({
  imagePath,
  backImagePath,
  outputPath,
  heightCm,
  widthCm,
  shapeMode,
  backTexture = "mirror",
  engine = "auto",
  rimFlare = 1.0,
  wallThickness = 0.04,
  publicCode = "CT-BTG-NVA-2026-0085",
  traceUrl = "https://craft-trust.vercel.app/trace/CT-BTG-NVA-2026-0085",
}) {
  return new Promise((resolve, reject) => {
    const args = [
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
      "--engine",
      engine,
      "--rim-flare",
      String(rimFlare),
      "--wall-thickness",
      String(wallThickness),
      "--public-code",
      publicCode,
      "--trace-url",
      traceUrl,
    ];
    if (backImagePath) {
      args.push("--back-image", backImagePath);
    }

    const child = spawn(pythonBin, args, {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {}
      reject(new Error(`Generator timed out after ${JOB_TIMEOUT_MS / 1000} seconds.`));
    }, JOB_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;
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
    .rpc("claim_model_job", { p_worker_id: workerId })
    .maybeSingle();
  if (error) throw error;
  return claimed;
}

async function reapStaleJobs() {
  try {
    const { data: count, error } = await supabase.rpc("reap_stale_model_jobs", {
      p_timeout_minutes: 5,
    });
    if (error) throw error;
    if (!error && count && count > 0) {
      console.log(`[model-worker] reaped ${count} stale/abandoned jobs`);
    }
  } catch (err) {
    console.warn("[model-worker] stale-job check failed:", err?.message || err);
  }
}

async function processJob(job) {
  const startedAt = Date.now();
  let tempDirectory;
  let uploadedModelPath;
  let heartbeatInterval;

  try {
    console.log(`[model-worker] claimed job ${job.id} for product ${job.product_id} (${job.engine || "auto"})`);

    // Step: preprocessing
    await sendHeartbeat(job.id, "preprocessing", 10);

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
      throw new Error("Product artisan does not have a linked owner account.");
    if (!product.height_cm || !product.width_cm)
      throw new Error("Product real dimensions (height_cm, width_cm) are required.");

    // Fetch all source assets ordered by ordinal
    const { data: sources, error: sourceError } = await supabase
      .from("product_source_assets")
      .select("storage_path,mime_type,ordinal")
      .eq("product_id", job.product_id)
      .order("ordinal", { ascending: true });
    if (sourceError) throw sourceError;
    if (!sources || sources.length === 0)
      throw new Error("No source photographs found for this product.");

    const frontSource = sources.find((s) => s.ordinal === 0) || sources[0];
    const backSource = sources.find((s) => s.ordinal === 1);

    tempDirectory = await mkdtemp(path.join(tmpdir(), "crafttrust-model-"));
    const inputPath = path.join(
      tempDirectory,
      `front${extensionFor(frontSource.mime_type)}`,
    );
    const outputPath = path.join(tempDirectory, "model.glb");

    const { data: frontDownload, error: frontDlError } = await supabase.storage
      .from("product-source")
      .download(frontSource.storage_path);
    if (frontDlError) throw frontDlError;
    await writeFile(inputPath, Buffer.from(await frontDownload.arrayBuffer()));

    let backImagePath = null;
    if (backSource) {
      try {
        const { data: backDownload, error: backDlError } = await supabase.storage
          .from("product-source")
          .download(backSource.storage_path);
        if (!backDlError && backDownload) {
          backImagePath = path.join(
            tempDirectory,
            `back${extensionFor(backSource.mime_type)}`,
          );
          await writeFile(
            backImagePath,
            Buffer.from(await backDownload.arrayBuffer()),
          );
        }
      } catch (err) {
        console.warn("[model-worker] could not download back image:", err?.message || err);
      }
    }

    const { error: processingError } = await supabase
      .from("products")
      .update({ model_status: "processing", model_error: null })
      .eq("id", job.product_id);
    if (processingError) throw processingError;

    // Fetch or prepare passport public code for base QR hallmark
    const { data: passport } = await supabase
      .from("passport_records")
      .select("public_code")
      .eq("product_id", job.product_id)
      .maybeSingle();

    const publicCode = passport?.public_code || "CT-BTG-NVA-2026-0085";
    const appBaseUrl = process.env.APP_BASE_URL || "https://craft-trust.vercel.app";
    const traceUrl = `${appBaseUrl.replace(/\/$/, "")}/trace/${publicCode}`;

    // Step: reconstructing
    await sendHeartbeat(job.id, "reconstructing", 30);

    // Start heartbeat timer every 4 seconds during Python processing
    heartbeatInterval = setInterval(() => {
      void sendHeartbeat(job.id, "reconstructing", 50);
    }, 4000);

    await runGenerator({
      imagePath: inputPath,
      backImagePath,
      outputPath,
      heightCm: product.height_cm,
      widthCm: product.width_cm,
      shapeMode: product.shape_mode,
      backTexture: product.back_texture,
      engine: job.engine || "auto",
      publicCode,
      traceUrl,
    });

    if (heartbeatInterval) clearInterval(heartbeatInterval);

    // Step: validating
    await sendHeartbeat(job.id, "validating", 80);

    if (!existsSync(outputPath)) {
      throw new Error("GLB model file was not generated by 3D pipeline.");
    }

    const model = await readFile(outputPath);
    if (model.byteLength < 500) {
      throw new Error(`Generated GLB file size is too small (${model.byteLength} bytes). Corrupt output.`);
    }

    const reportPath = path.join(tempDirectory, "model.json");
    let report = {};
    if (existsSync(reportPath)) {
      try {
        report = JSON.parse(await readFile(reportPath, "utf8"));
      } catch {}
    }

    // Step: uploading
    await sendHeartbeat(job.id, "uploading", 90);

    const version = randomUUID();
    uploadedModelPath = `${artisan.owner_id}/${job.product_id}/model-${version}.glb`;

    const { error: uploadError } = await supabase.storage
      .from("product-models")
      .upload(uploadedModelPath, model, {
        contentType: "model/gltf-binary",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const modelUrl = `/api/models/${version}`;
    const { error: assetError } = await supabase.from("product_model_assets").insert({
      id: version,
      product_id: job.product_id,
      storage_path: uploadedModelPath,
      original_filename: "generated-model.glb",
      file_size: model.byteLength,
      origin: "generated",
      status: "pending_review",
      uploaded_by: artisan.owner_id,
      settings: {
        heightCm: product.height_cm,
        widthCm: product.width_cm,
        scale: 1,
        orientation: [0, 0, 0],
        cameraOrbit: "0deg 75deg auto",
        arEnabled: true,
        regions: [],
        qrPlacement: {
          enabled: true,
          sizePercent: 60,
          rotation: 0,
          position: [0, 0],
        },
      },
    });
    if (assetError) throw assetError;

    // Check if master high-res GLB exists and upload it
    const masterPath = path.join(tempDirectory, "model-master.glb");
    if (existsSync(masterPath)) {
      try {
        const masterModel = await readFile(masterPath);
        const masterUploadPath = `${artisan.owner_id}/${job.product_id}/model-master-${version}.glb`;
        const { error: masterUploadError } = await supabase.storage
          .from("product-models")
          .upload(masterUploadPath, masterModel, {
            contentType: "model/gltf-binary",
            cacheControl: "31536000",
            upsert: false,
          });
        if (!masterUploadError) {
          report.masterModelPath = masterUploadPath;
        }
      } catch (err) {
        console.warn("[model-worker] master GLB upload warning:", err?.message || err);
      }
    }

    const generationMs = Date.now() - startedAt;

    // Update product status
    const { error: updateError } = await supabase
      .from("products")
      .update({
        model_url: modelUrl,
        ar_url: null,
        model_status: "review",
        model_report: report,
        model_error: null,
        model_version: version,
      })
      .eq("id", job.product_id);
    if (updateError) throw updateError;

    // Update job completed
    const { error: finishError } = await supabase
      .from("model_jobs")
      .update({
        status: "completed",
        current_step: "completed",
        progress: 100,
        finished_at: new Date().toISOString(),
        generation_ms: generationMs,
        error: null,
      })
      .eq("id", job.id);
    if (finishError) throw finishError;

    console.log(
      `[model-worker] successfully completed job ${job.id} in ${generationMs} ms (${report.engine || "ceramic"}, ${report.assetBytes || model.byteLength} bytes)`,
    );
  } catch (error) {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    const message =
      error instanceof Error
        ? error.message.slice(0, 2000)
        : (error?.message || String(error)).slice(0, 2000);
    if (uploadedModelPath) {
      await supabase.storage.from("product-models").remove([uploadedModelPath]).catch(() => {});
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
          current_step: "failed",
          finished_at: new Date().toISOString(),
          generation_ms: Date.now() - startedAt,
          error: message,
        })
        .eq("id", job.id),
    ]).catch((err) => console.error("[model-worker] error updating failed status:", err));
    console.error(`[model-worker] failed job ${job.id}: ${message}`);
    if (once) process.exitCode = 1;
  } finally {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function main() {
  console.log(
    `[model-worker] ID: ${workerId} ready; polling every ${pollMs} ms${once ? " (once)" : ""}`,
  );
  let pollCount = 0;
  do {
    try {
      pollCount++;
      // Periodically check for stale jobs every ~30 seconds (10 polls at 3s)
      if (pollCount % 10 === 0) {
        await reapStaleJobs();
      }

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

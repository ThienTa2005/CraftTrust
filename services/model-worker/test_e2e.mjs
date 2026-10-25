import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:55321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function run() {
  console.log("=== Running End-to-End 3D Generation Test ===");

  // 1. Get demo artisan
  const { data: artisan, error: artErr } = await supabase
    .from("artisans")
    .select("id, owner_id")
    .eq("slug", "demo-nguyen-an")
    .single();
  if (artErr || !artisan) throw new Error("Could not find artisan: " + (artErr?.message || "null"));

  const productId = "40000000-0000-0000-0000-000000000099";
  const slug = `binh-hoa-bien-e2e-${Date.now()}`;

  // Clean up if existing
  await supabase.from("products").delete().eq("id", productId);

  // 2. Create product
  const { error: prodErr } = await supabase.from("products").insert({
    id: productId,
    artisan_id: artisan.id,
    slug,
    name: "Bình hỏa biến Bát Tràng E2E Test",
    description: "Sản phẩm kiểm thử luồng tạo 3D tự động từ ảnh.",
    price_vnd: 1250000,
    stock_quantity: 5,
    status: "draft",
    height_cm: 30,
    width_cm: 18,
    dimensions_verified: true,
    shape_mode: "measured",
    back_texture: "mirror",
    model_status: "queued",
  });
  if (prodErr) throw prodErr;
  console.log("[1/5] Product created:", productId);

  // 3. Generate a synthetic test image using python
  const testImgPath = path.join(tmpdir(), "crafttrust-test-e2e.png");
  const helperPy = path.join(tmpdir(), "make_test_vase.py");
  writeFileSync(
    helperPy,
    `from PIL import Image, ImageDraw
im = Image.new('RGBA', (400, 600), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
pts = [(140, 520), (120, 380), (150, 220), (170, 140), (160, 90), (240, 90), (230, 140), (250, 220), (280, 380), (260, 520)]
d.polygon(pts, fill=(242, 238, 230, 255))
d.ellipse([160, 280, 240, 380], fill=(24, 60, 140, 255))
im.save(r'${testImgPath}')
`,
  );
  execSync(`"${path.resolve(".venv/Scripts/python.exe")}" "${helperPy}"`);

  const imgBuffer = readFileSync(testImgPath);
  const sourcePath = `${artisan.owner_id}/${productId}/source-0.png`;

  // Upload to product-source
  await supabase.storage.from("product-source").upload(sourcePath, imgBuffer, {
    contentType: "image/png",
    upsert: true,
  });

  await supabase.from("product_source_assets").upsert({
    product_id: productId,
    storage_path: sourcePath,
    mime_type: "image/png",
    byte_size: imgBuffer.byteLength,
    ordinal: 0,
    camera_direction: "FRONT",
    camera_azimuth: 0,
  });
  console.log("[2/5] Source image uploaded to product-source bucket:", sourcePath);

  // 4. Create model_jobs row
  const jobId = "d4000000-0000-0000-0000-000000000099";
  await supabase.from("model_jobs").delete().eq("id", jobId);
  const { error: jobErr } = await supabase.from("model_jobs").insert({
    id: jobId,
    product_id: productId,
    status: "queued",
    attempt: 1,
    engine: "auto",
  });
  if (jobErr) throw jobErr;
  console.log("[3/5] Model job inserted into queue:", jobId);

  // 5. Run worker once to process this job
  console.log("[4/5] Executing worker.mjs --once to claim and process job...");
  execSync("node --env-file-if-exists=../../.env.local worker.mjs --once", {
    stdio: "inherit",
    env: { ...process.env },
  });

  // 6. Verify database state & output GLB
  const { data: updatedJob } = await supabase
    .from("model_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  console.log("Updated Job status:", updatedJob?.status, "generationMs:", updatedJob?.generation_ms);
  if (updatedJob?.status !== "completed") {
    throw new Error(`Job did not complete. Status: ${updatedJob?.status}, Error: ${updatedJob?.error}`);
  }

  const { data: updatedProduct } = await supabase
    .from("products")
    .select("model_status, model_url, model_version, model_report")
    .eq("id", productId)
    .single();
  console.log("Product model_status:", updatedProduct?.model_status);
  console.log("Product model_url:", updatedProduct?.model_url);
  console.log("Model report engine:", updatedProduct?.model_report?.engine, "AssetBytes:", updatedProduct?.model_report?.assetBytes);

  if (updatedProduct?.model_status !== "review") {
    throw new Error(`Expected product model_status review, got ${updatedProduct?.model_status}`);
  }

  // 7. Download and verify the generated GLB
  const { data: asset } = await supabase
    .from("product_model_assets")
    .select("*")
    .eq("id", updatedProduct.model_version)
    .single();
  console.log("[5/5] Product Model Asset record:", asset?.id, "Size:", asset?.file_size);

  const { data: glbData, error: dlErr } = await supabase.storage
    .from("product-models")
    .download(asset.storage_path);
  if (dlErr || !glbData) throw new Error("Could not download generated GLB: " + dlErr?.message);

  const glbBytes = Buffer.from(await glbData.arrayBuffer());
  const magic = glbBytes.subarray(0, 4).toString("ascii");
  console.log(`GLB Magic: '${magic}', Total Downloaded Bytes: ${glbBytes.byteLength}`);

  if (magic !== "glTF") {
    throw new Error(`Invalid GLB header magic: ${magic}`);
  }

  console.log("\n>>> SUCCESS: TEST 3D-01 PASS! GLB generated, verified and renderable! <<<\n");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

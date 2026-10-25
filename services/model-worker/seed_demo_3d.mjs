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

async function main() {
  console.log("=== Seeding Verified 3D Model for Demo Passport CT-BTG-NVA-2026-0085 ===");

  const productId = "40000000-0000-0000-0000-000000000001";
  const ownerId = "10000000-0000-0000-0000-000000000001";

  // 1. Update product dimensions and status
  await supabase.from("products").update({
    height_cm: 28,
    width_cm: 16,
    dimensions_verified: true,
    shape_mode: "measured",
    back_texture: "mirror",
    model_status: "queued",
  }).eq("id", productId);

  // 2. Generate synthetic ceramic vase with traditional lotus motif
  const frontImg = path.join(tmpdir(), "vase-front-0085.png");
  const pyCode = `from PIL import Image, ImageDraw
im = Image.new('RGBA', (400, 600), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
pts = [(140, 520), (120, 380), (150, 220), (170, 140), (160, 90), (240, 90), (230, 140), (250, 220), (280, 380), (260, 520)]
d.polygon(pts, fill=(244, 240, 232, 255))
d.ellipse([160, 280, 240, 380], fill=(24, 60, 140, 255))
d.ellipse([180, 300, 220, 360], fill=(244, 240, 232, 255))
im.save(r'${frontImg.replace(/\\/g, "/")}')
`;
  const helperPy = path.join(tmpdir(), "gen_vase_0085.py");
  writeFileSync(helperPy, pyCode);
  execSync(`".venv/Scripts/python.exe" "${helperPy}"`);

  const imgBuf = readFileSync(frontImg);
  const sourcePath = `${ownerId}/${productId}/source-0.png`;

  await supabase.storage.from("product-source").upload(sourcePath, imgBuf, {
    contentType: "image/png",
    upsert: true,
  });

  await supabase.from("product_source_assets").upsert({
    product_id: productId,
    storage_path: sourcePath,
    mime_type: "image/png",
    byte_size: imgBuf.byteLength,
    ordinal: 0,
  });

  console.log("Uploaded source photograph for product 0001.");

  // 3. Insert model job
  const jobId = "d4000000-0000-0000-0000-000000000085";
  await supabase.from("model_jobs").delete().eq("id", jobId);
  await supabase.from("model_jobs").insert({
    id: jobId,
    product_id: productId,
    status: "queued",
    attempt: 1,
    engine: "auto",
  });

  console.log("Enqueued model job 0085. Running worker to process...");

  // 4. Run worker
  execSync("node --env-file-if-exists=../../.env.local worker.mjs --once", {
    stdio: "inherit",
  });

  // 5. Publish the model asset
  const { data: prod } = await supabase
    .from("products")
    .select("model_version, model_url")
    .eq("id", productId)
    .single();

  if (prod?.model_version) {
    await supabase.from("product_model_assets").update({
      status: "published",
      approved_by: "10000000-0000-0000-0000-000000000010", // admin
      approved_at: new Date().toISOString(),
    }).eq("id", prod.model_version);

    await supabase.from("products").update({
      model_status: "ready",
    }).eq("id", productId);

    console.log(`Published model version ${prod.model_version} for product 0001! URL: ${prod.model_url}`);
  }

  console.log("=== Demo Passport 3D Model Seed Complete! ===");
}

main().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});

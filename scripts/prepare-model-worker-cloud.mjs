import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "services/model-worker");
const template = path.join(source, "deploy");
const destination = path.join(root, "outputs/model-worker-cloud");

// Refuse unknown files rather than accidentally including credentials in a deployment.
async function assertAllowed(directory, allowed) {
  const entries = await readdir(directory).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const entry of entries) {
    if (!allowed.includes(entry)) {
      throw new Error(`Unexpected file in deployment directory: ${path.join(directory, entry)}. Review and move it out before packaging.`);
    }
  }
}

const runtimeFiles = ["worker.mjs", "supabase-config.mjs", "generate.py", "ai_adapter.py", "requirements.txt"];
const templateFiles = ["Dockerfile", ".dockerignore", "package.json", "package-lock.json"];
await assertAllowed(destination, ["worker", "public", "vercel.json", ".vercelignore", ".gitignore", ".vercel"]);
await assertAllowed(path.join(destination, "worker"), [...runtimeFiles, ...templateFiles]);
await assertAllowed(path.join(destination, "public"), ["index.html"]);
await mkdir(path.join(destination, "worker"), { recursive: true });
await mkdir(path.join(destination, "public"), { recursive: true });
for (const name of runtimeFiles) await copyFile(path.join(source, name), path.join(destination, "worker", name));
for (const name of templateFiles) await copyFile(path.join(template, name), path.join(destination, "worker", name));
await copyFile(path.join(template, "vercel.json"), path.join(destination, "vercel.json"));
await writeFile(path.join(destination, ".vercelignore"), ".env*\n**/.env*\n.vercel\n**/node_modules\n**/.venv\n");
await writeFile(path.join(destination, ".gitignore"), ".vercel\n.env*\n");
await writeFile(path.join(destination, "public/index.html"), '<!doctype html><html lang="vi"><meta charset="utf-8"><title>CraftTrust worker</title><p>Project xử lý mô hình 3D CraftTrust. Kiểm tra tiến trình trong Vercel Logs; trang này không phải kiểm tra sức khỏe worker.</p></html>\n');
console.log(`Prepared worker-only deployment at ${destination}`);
console.log("No credentials were copied. Configure Production environment variables in the separate Vercel worker project before deploying.");

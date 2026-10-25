import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

function readConfiguration(relative) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  return existsSync(filename) ? parseEnv(readFileSync(filename, "utf8")) : {};
}

// Match Node --env-file precedence: shell > worker file > root file.
const env = { ...readConfiguration("../../.env.local"), ...readConfiguration(".env.local"), ...process.env };
const webEnv = readConfiguration("../../apps/web/.env.local");
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
const webUrl = webEnv.NEXT_PUBLIC_SUPABASE_URL;
console.log(JSON.stringify({ workerUrl: url, webUrl, serviceKeyConfigured: Boolean(key), python: env.PYTHON_BIN || "auto-detect" }));
if (url && webUrl && url.replace(/\/$/, "") !== webUrl.replace(/\/$/, "")) {
  console.warn("Web and worker URLs differ. Confirm that they address the same Supabase project.");
}
if (!url || !key) {
  console.error("Worker credentials are missing. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exitCode = 1;
} else {
  const client = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
  for (const [table, columns] of [
    ["model_jobs", "id,product_id,status,created_at,started_at,finished_at,worker_id,heartbeat_at,current_step,progress,error"],
    ["products", "id,name,model_status,model_error,created_at"],
  ]) {
    const { data, error } = await client.from(table).select(columns).order("created_at", { ascending: false }).limit(10);
    console.log(JSON.stringify({ table, data, error }));
    if (error) process.exitCode = 1;
  }
  try {
    const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    const schema = await response.json();
    if (!response.ok) throw new Error(`Schema request failed: HTTP ${response.status}`);
    for (const name of ["claim_model_job", "heartbeat_model_job", "reap_stale_model_jobs"]) {
      const route = schema.paths?.[`/rpc/${name}`];
      const argumentsSchema = route?.post?.parameters?.find((parameter) => parameter.in === "body")?.schema;
      const available = Boolean(route) && (name !== "claim_model_job" || Boolean(argumentsSchema?.properties?.p_worker_id));
      console.log(JSON.stringify({ rpc: name, available, arguments: Object.keys(argumentsSchema?.properties || {}) }));
      if (!available) process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

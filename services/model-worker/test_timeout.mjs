import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:55321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function run() {
  console.log("=== Testing 3D-02: Watchdog & Stale Job Recovery ===");

  const productId = "40000000-0000-0000-0000-000000000099";
  const jobId = "d4000000-0000-0000-0000-000000000098";

  // Simulate a job that was claimed 15 minutes ago and worker crashed/disconnected
  await supabase.from("model_jobs").upsert({
    id: jobId,
    product_id: productId,
    status: "processing",
    current_step: "reconstructing",
    worker_id: "worker-dead-process-9999",
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    heartbeat_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  });

  await supabase.from("products").update({
    model_status: "processing",
    model_error: null,
  }).eq("id", productId);

  console.log("Simulated stale job inserted with heartbeat 15 minutes ago.");

  // Call reap_stale_model_jobs
  const { data: reapedCount, error } = await supabase.rpc("reap_stale_model_jobs", {
    p_timeout_minutes: 5,
  });
  if (error) throw error;
  console.log(`reap_stale_model_jobs reaped: ${reapedCount} job(s)`);

  const { data: job } = await supabase.from("model_jobs").select("*").eq("id", jobId).single();
  console.log("Job status:", job.status, "Error:", job.error);

  const { data: product } = await supabase.from("products").select("model_status, model_error").eq("id", productId).single();
  console.log("Product status:", product.model_status, "Error:", product.model_error);

  if (job.status !== "failed" || product.model_status !== "failed") {
    throw new Error("Job or product was not failed by stale job reaper!");
  }

  console.log("\n>>> SUCCESS: TEST 3D-02 PASS! Stale job detected and recovered without infinite loading! <<<\n");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

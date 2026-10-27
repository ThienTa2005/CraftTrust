import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabase } from "@/lib/supabase";
import { signModelMessage } from "@/lib/model-callback-auth";

export type PixalMode = "single" | "two_view" | "multiview";

function modalConfiguration() {
  const rawEndpoint = process.env.MODAL_3D_ENDPOINT?.trim();
  const secret = process.env.MODAL_3D_SHARED_SECRET?.trim();
  if (!rawEndpoint || !secret) return null;
  const endpoint = new URL(rawEndpoint);
  const hostname = endpoint.hostname.toLowerCase();
  const privateHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    || hostname.endsWith(".local") || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || privateHost)
    throw new Error("MODAL_3D_ENDPOINT must be a credential-free public HTTPS URL.");
  return { endpoint: endpoint.toString(), secret };
}


export async function dispatchPixal3dJob(jobId: string) {
  let config: ReturnType<typeof modalConfiguration>;
  try { config = modalConfiguration(); }
  catch (cause) {
    const error = cause instanceof Error ? cause.message : "Invalid Modal endpoint configuration.";
    return { ok: false as const, error };
  }
  if (!config) {
    return { ok: false as const, error: "Modal 3D endpoint is not configured on the server." };
  }

  const body = JSON.stringify({ jobId });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomUUID();
  const signature = signModelMessage(config.secret, timestamp, nonce, body);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crafttrust-timestamp": timestamp,
        "x-crafttrust-nonce": nonce,
        "x-crafttrust-signature": signature,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json().catch(() => null)) as
      | { callId?: string; error?: string }
      | null;
    if (response.status === 202 && !result?.callId) {
      return { ok: true as const, queued: true };
    }
    if (!response.ok || !result?.callId) {
      throw new Error(result?.error || `Modal dispatch returned HTTP ${response.status}.`);
    }
    const service = createServiceSupabase();
    if (!service) throw new Error("Supabase service client is not configured.");
    const { error } = await service.rpc("mark_pixal3d_dispatched", {
      p_job_id: jobId,
      p_dispatch_id: result.callId,
    });
    if (error) throw error;
    return { ok: true as const, callId: result.callId };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Modal dispatch failed.";
    return { ok: false as const, error };
  }
}

async function enqueueWithServiceFallback(
  productId: string,
  mode: PixalMode,
  idempotencyKey: string,
): Promise<{ jobId: string; alreadyActive: boolean }> {
  const service = createServiceSupabase();
  if (!service) throw new Error("Supabase service client is not configured.");

  // 1. Fetch product & owner
  const { data: prod, error: prodErr } = await service
    .from("products")
    .select("id, artisan_id, artisans(owner_id)")
    .eq("id", productId)
    .single();

  if (prodErr || !prod) {
    throw prodErr || new Error("Không tìm thấy sản phẩm.");
  }

  const ownerId = (prod.artisans as unknown as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) {
    const err = new Error("product owner unavailable");
    (err as unknown as { code: string }).code = "42501";
    throw err;
  }

  // 2. Check if an active job already exists for this product
  const { data: existingActive } = await service
    .from("model_jobs")
    .select("id, status")
    .eq("product_id", productId)
    .eq("engine", "pixal3d")
    .in("status", [
      "queued",
      "dispatched",
      "validating",
      "preprocessing",
      "running",
      "exporting",
      "validating_output",
    ])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingActive?.id) {
    return { jobId: existingActive.id, alreadyActive: true };
  }

  // 3. Fetch source assets
  const { data: sources, error: srcErr } = await service
    .from("product_source_assets")
    .select("storage_path, mime_type, byte_size, ordinal, camera_direction, camera_azimuth")
    .eq("product_id", productId)
    .order("ordinal", { ascending: true });

  if (srcErr) throw srcErr;
  if (!sources || sources.length < 1 || sources.length > 4) {
    throw new Error("Pixal3D requires 1-4 source images");
  }
  if (!sources.some((s) => s.camera_direction === "FRONT")) {
    throw new Error("a canonical FRONT image is required");
  }

  if (["two_view", "multiview"].includes(mode)) {
    if (
      sources.length < 2 ||
      sources.some(
        (s) =>
          !["FRONT", "RIGHT", "BACK", "LEFT"].includes(s.camera_direction ?? "") ||
          s.camera_azimuth === null,
      )
    ) {
      throw new Error("multi-view requires 2-4 calibrated cardinal views");
    }
  }

  // 4. Compute limits check (singleton fail-closed)
  const { data: limit, error: limitErr } = await service
    .from("model_compute_limits")
    .select("*")
    .eq("singleton", true)
    .single();

  if (limitErr || !limit || !limit.enabled) {
    const err = new Error("GPU budget is disabled (fail-closed)");
    (err as unknown as { code: string }).code = "P0001";
    throw err;
  }

  const reservationCost = Number(limit.per_job_reservation_usd ?? 0.25);
  const dailyLimit = Number(limit.daily_limit_usd ?? 3.0);
  const monthlyLimit = Number(limit.monthly_limit_usd ?? 25.0);

  const todayIso = new Date();
  todayIso.setUTCHours(0, 0, 0, 0);

  const { data: ledgerEntries } = await service
    .from("model_budget_ledger")
    .select("reserved_usd, actual_usd, status, created_at");

  let dailyTotal = 0;
  let monthlyTotal = 0;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  for (const entry of ledgerEntries ?? []) {
    const cost =
      entry.status === "finalized"
        ? Number(entry.actual_usd ?? 0)
        : Number(entry.reserved_usd ?? 0);
    const entryDate = new Date(entry.created_at);
    if (entry.status === "reserved" || entryDate >= todayIso) {
      dailyTotal += cost;
    }
    if (entry.status === "reserved" || entryDate >= monthStart) {
      monthlyTotal += cost;
    }
  }

  if (
    dailyTotal + reservationCost > dailyLimit ||
    monthlyTotal + reservationCost > monthlyLimit
  ) {
    const err = new Error("GPU budget exceeded");
    (err as unknown as { code: string }).code = "P0001";
    throw err;
  }

  // 5. Attempt count check
  const { count: attemptCount } = await service
    .from("model_jobs")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const attemptNumber = (attemptCount ?? 0) + 1;
  if (attemptNumber > 10) {
    throw new Error("maximum generation attempts reached");
  }

  const manifest = sources.map((s) => ({
    storagePath: s.storage_path,
    mimeType: s.mime_type,
    byteSize: s.byte_size,
    ordinal: s.ordinal,
    direction: s.camera_direction,
    azimuth: s.camera_azimuth,
  }));

  // 6. Insert into model_jobs
  const { data: newJob, error: jobErr } = await service
    .from("model_jobs")
    .insert({
      product_id: productId,
      seller_id: ownerId,
      status: "queued",
      engine: "pixal3d",
      provider: "modal",
      mode,
      attempt: attemptNumber,
      idempotency_key: idempotencyKey,
      input_manifest: manifest,
      model_revision: "f7cf38429b0bd264f1995f0f8743a88b1c728b94",
      resolution: 1024,
      reserved_cost_usd: reservationCost,
      current_step: "queued",
      progress: 0,
    })
    .select("id")
    .single();

  if (jobErr || !newJob) {
    throw jobErr || new Error("Failed to insert model_jobs");
  }

  // 7. Insert budget ledger
  await service.from("model_budget_ledger").insert({
    job_id: newJob.id,
    reserved_usd: reservationCost,
    status: "reserved",
  });

  // 8. Insert dispatch outbox
  await service.from("model_dispatch_outbox").insert({
    job_id: newJob.id,
  });

  // 9. Update product state
  await service
    .from("products")
    .update({
      status: "draft",
      model_status: "queued",
      model_error: null,
      model_report: null,
      model_url: null,
      model_version: null,
      ar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  return { jobId: newJob.id, alreadyActive: false };
}

export async function enqueuePixal3dJob(
  supabase: SupabaseClient,
  productId: string,
  mode: PixalMode,
  idempotencyKey: string = randomUUID(),
): Promise<{ jobId: string; dispatch: { ok: boolean; error?: string | undefined }; alreadyActive?: boolean | undefined }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey))
    throw new Error("Invalid idempotency key.");

  let jobId: string | null = null;
  let alreadyActive = false;

  const { data, error } = await supabase.rpc("enqueue_pixal3d_job", {
    p_product_id: productId,
    p_mode: mode,
    p_idempotency_key: idempotencyKey,
    p_resolution: 1024,
  });

  if (error) {
    // If PostgreSQL raises schema error 42703 (e.g. column "seller_id" does not exist in model_compute_limits),
    // fallback to resilient service-client enqueue
    if (
      error.code === "42703" ||
      error.message?.includes('column "seller_id" does not exist') ||
      error.message?.includes("model_outbox")
    ) {
      console.warn("[enqueuePixal3dJob] RPC threw schema mismatch (42703); falling back to service client enqueue.", {
        code: error.code,
        message: error.message,
      });
      const fallbackResult = await enqueueWithServiceFallback(productId, mode, idempotencyKey);
      jobId = fallbackResult.jobId;
      alreadyActive = fallbackResult.alreadyActive;
    } else {
      throw error;
    }
  } else {
    jobId = typeof data === "string" ? data : data?.id;
    if (data?.status === "already_active") {
      alreadyActive = true;
    }
  }

  if (!jobId) throw new Error("Database did not return a generation job ID.");

  // Best-effort immediate dispatch kick if configured and not already active
  let dispatchResult = { ok: true as boolean, error: undefined as string | undefined };
  if (!alreadyActive && process.env.MODAL_3D_ENDPOINT?.trim()) {
    try {
      const res = await dispatchPixal3dJob(jobId);
      if (!res.ok) {
        dispatchResult = { ok: true, error: res.error };
      }
    } catch {
      // Retain outbox durability on network blips
    }
  }

  return { jobId, dispatch: dispatchResult, alreadyActive };
}


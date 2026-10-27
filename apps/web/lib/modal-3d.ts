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

export async function enqueuePixal3dJob(
  supabase: SupabaseClient,
  productId: string,
  mode: PixalMode,
  idempotencyKey: string = randomUUID(),
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey))
    throw new Error("Invalid idempotency key.");
  const { data, error } = await supabase.rpc("enqueue_pixal3d_job", {
    p_product_id: productId,
    p_mode: mode,
    p_idempotency_key: idempotencyKey,
    p_resolution: 1024,
  });
  if (error) throw error;
  const jobId = typeof data === "string" ? data : data?.id;
  if (!jobId) throw new Error("Database did not return a generation job ID.");

  // Best-effort immediate dispatch kick if configured; the transaction outbox
  // guarantees the job is durable and will be drained even if immediate dispatch times out.
  let dispatchResult = { ok: true as boolean, error: undefined as string | undefined };
  if (process.env.MODAL_3D_ENDPOINT?.trim()) {
    try {
      const res = await dispatchPixal3dJob(jobId);
      if (!res.ok) {
        dispatchResult = { ok: true, error: res.error };
      }
    } catch {
      // Retain outbox durability on network blips
    }
  }

  return { jobId, dispatch: dispatchResult };
}

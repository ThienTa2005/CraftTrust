import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyModelMessage } from "@/lib/model-callback-auth";
import { createServiceSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
const MAX_CALLBACK_BYTES = 64 * 1024;

async function readCallbackBody(request: Request) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_CALLBACK_BYTES)
    return { ok: false as const, status: 413, error: "Callback payload too large." };
  if (!request.body) return { ok: true as const, raw: "" };
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let raw = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_CALLBACK_BYTES) {
        await reader.cancel();
        return { ok: false as const, status: 413, error: "Callback payload too large." };
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return { ok: true as const, raw };
  } catch {
    return { ok: false as const, status: 400, error: "Invalid callback encoding." };
  }
}

const callbackSchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("completed"), jobId: z.string().uuid(), workerId: z.string().min(1).max(160),
    storagePath: z.string().min(1).max(800), previewPath: z.string().max(800).nullable().optional(),
    fileSize: z.number().int().positive().max(500_000_000), gpuRuntimeMs: z.number().int().nonnegative(),
    totalRuntimeMs: z.number().int().nonnegative(), actualCostUsd: z.number().nonnegative().max(100),
    gpuType: z.string().min(1).max(100), qualityReport: z.record(z.string(), z.unknown()),
  }),
  z.object({
    outcome: z.literal("failed"), jobId: z.string().uuid(), workerId: z.string().min(1).max(160),
    errorCode: z.string().min(1).max(100), error: z.string().min(1).max(2000),
    gpuRuntimeMs: z.number().int().nonnegative().default(0), actualCostUsd: z.number().nonnegative().max(100).default(0),
  }),
]);

export async function POST(request: Request) {
  const body = await readCallbackBody(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const raw = body.raw;
  if (!verifyModelMessage({
    secret: process.env.MODAL_3D_SHARED_SECRET?.trim() ?? "",
    timestamp: request.headers.get("x-crafttrust-timestamp"),
    nonce: request.headers.get("x-crafttrust-nonce"),
    signature: request.headers.get("x-crafttrust-signature"),
    body: raw,
  })) return NextResponse.json({ error: "Invalid callback signature." }, { status: 401 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = callbackSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "Supabase service client is unavailable." }, { status: 503 });
  const nonce = request.headers.get("x-crafttrust-nonce")!;
  const { data: nonceAccepted, error: nonceError } = await service.rpc(
    "consume_model_webhook_nonce",
    { p_nonce: nonce },
  );
  if (nonceError || nonceAccepted !== true)
    return NextResponse.json({ error: "Callback replay rejected." }, { status: 409 });
  const payload = parsed.data;
  const rpc = payload.outcome === "completed"
    ? service.rpc("complete_pixal3d_job", {
        p_job_id: payload.jobId, p_worker_id: payload.workerId, p_storage_path: payload.storagePath,
        p_preview_path: payload.previewPath ?? null, p_file_size: payload.fileSize,
        p_quality_report: payload.qualityReport, p_gpu_type: payload.gpuType,
        p_gpu_runtime_ms: payload.gpuRuntimeMs, p_total_runtime_ms: payload.totalRuntimeMs,
        p_actual_cost_usd: payload.actualCostUsd,
      })
    : service.rpc("fail_pixal3d_job", {
        p_job_id: payload.jobId, p_worker_id: payload.workerId, p_error_code: payload.errorCode,
        p_error: payload.error, p_gpu_runtime_ms: payload.gpuRuntimeMs,
        p_actual_cost_usd: payload.actualCostUsd,
      });
  const { data, error } = await rpc;
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json(data ?? { ok: true });
}

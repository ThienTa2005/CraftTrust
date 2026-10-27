import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthorizedUser } from "@/lib/authz";
import { enqueuePixal3dJob } from "@/lib/modal-3d";
import { parseApiError } from "@/lib/error-utils";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = _request.headers.get("x-request-id") || randomUUID();
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json(
      { error: auth.reason ?? "Không thể xác thực tài khoản.", requestId },
      { status: auth.user ? 403 : 401 },
    );
  }
  const { id } = await context.params;
  const { data: product, error } = await auth.supabase
    .from("products")
    .select("id,model_status")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    const parsed = parseApiError(error);
    console.error(`[Pixal3D Retry] Product query error [${requestId}]:`, {
      requestId,
      productId: id,
      code: parsed.code,
      message: parsed.rawMessage,
      details: parsed.details,
      hint: parsed.hint,
    });
    return NextResponse.json({ error: parsed.message, requestId }, { status: 500 });
  }
  if (!product) {
    return NextResponse.json(
      { error: "Không tìm thấy sản phẩm.", requestId },
      { status: 404 },
    );
  }
  const { searchParams } = new URL(_request.url);
  const force = searchParams.get("force") === "true";

  // Check if there is an active job that is not stuck
  if (["queued", "processing"].includes(product.model_status) && !force) {
    const { data: latestJob } = await auth.supabase
      .from("model_jobs")
      .select("id,created_at,started_at,status")
      .eq("product_id", id)
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

    if (latestJob) {
      const jobAgeMs = latestJob.created_at ? Date.now() - new Date(latestJob.created_at).getTime() : 0;
      if (jobAgeMs < 300_000) {
        return NextResponse.json(
          {
            ok: true,
            jobId: latestJob.id,
            alreadyActive: true,
            message: "Sản phẩm đã có một tiến trình tạo 3D đang chạy. Đang kết nối theo dõi tiến độ.",
          },
          { status: 200 },
        );
      }
    }
  }

  const { data: sources, count: sourceCount, error: sourceError } = await auth.supabase
    .from("product_source_assets")
    .select("id,camera_direction,camera_azimuth", { count: "exact" })
    .eq("product_id", id);

  if (sourceError) {
    const parsed = parseApiError(sourceError);
    console.error(`[Pixal3D Retry] Source assets query error [${requestId}]:`, {
      requestId,
      productId: id,
      code: parsed.code,
      message: parsed.rawMessage,
      details: parsed.details,
      hint: parsed.hint,
    });
    return NextResponse.json({ error: parsed.message, requestId }, { status: 500 });
  }

  if (!sourceCount || sourceCount === 0 || !sources?.length) {
    return NextResponse.json(
      {
        error: "Sản phẩm chưa có ảnh nguồn. Hãy bấm 'Sửa sản phẩm' để tải từ 1 đến 4 ảnh lên trước khi tạo 3D.",
        requestId,
      },
      { status: 400 },
    );
  }
  const hasFront = sources.some((s) => s.camera_direction === "FRONT");
  if (!hasFront) {
    return NextResponse.json(
      {
        error: "Sản phẩm cần ít nhất một ảnh chính diện (FRONT) để tạo mô hình 3D.",
        requestId,
      },
      { status: 400 },
    );
  }

  const calibratedViews = sources.filter((s) => s.camera_azimuth !== null);
  const mode = calibratedViews.length >= 2 ? "multiview" : "single";

  try {
    const { jobId, dispatch, alreadyActive } = await enqueuePixal3dJob(
      auth.supabase,
      id,
      mode,
      _request.headers.get("idempotency-key") ?? undefined,
    );
    return NextResponse.json(
      dispatch.ok
        ? {
            ok: true,
            jobId,
            alreadyActive: Boolean(alreadyActive),
            message: alreadyActive
              ? "Sản phẩm đã có tiến trình 3D đang chạy. Đang kết nối theo dõi tiến độ."
              : "Đã đưa sản phẩm vào hàng đợi tạo mô hình 3D.",
          }
        : { ok: false, jobId, error: dispatch.error, requestId },
      { status: dispatch.ok ? 200 : 502 },
    );
  } catch (cause) {
    const parsed = parseApiError(cause);
    console.error(`[Pixal3D Retry Error] [${requestId}]`, {
      requestId,
      productId: id,
      code: parsed.code,
      message: parsed.rawMessage,
      details: parsed.details,
      hint: parsed.hint,
    });

    // If active job conflict from database (errcode 23505), fetch existing active job and return it gracefully
    if (parsed.code === "23505" || parsed.rawMessage.includes("active Pixal3D job already exists")) {
      const { data: activeJob } = await auth.supabase
        .from("model_jobs")
        .select("id,status,created_at")
        .eq("product_id", id)
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

      if (activeJob) {
        return NextResponse.json(
          {
            ok: true,
            jobId: activeJob.id,
            alreadyActive: true,
            message: "Sản phẩm đã có một tiến trình tạo 3D đang chạy. Đang kết nối theo dõi tiến độ.",
          },
          { status: 200 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: parsed.message,
        code: parsed.code,
        requestId,
      },
      { status: 409 },
    );
  }
}

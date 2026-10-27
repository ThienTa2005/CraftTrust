import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { enqueuePixal3dJob } from "@/lib/modal-3d";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json(
      { error: auth.reason ?? "Không thể xác thực tài khoản." },
      { status: auth.user ? 403 : 401 },
    );
  }
  const { id } = await context.params;
  const { data: product, error } = await auth.supabase
    .from("products")
    .select("id,model_status")
    .eq("id", id)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!product)
    return NextResponse.json(
      { error: "Không tìm thấy sản phẩm." },
      { status: 404 },
    );
  const { searchParams } = new URL(_request.url);
  const force = searchParams.get("force") === "true";

  // Check if there is an active job that is not stuck
  if (["queued", "processing"].includes(product.model_status) && !force) {
    const { data: latestJob } = await auth.supabase
      .from("model_jobs")
      .select("id,created_at,started_at")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const jobAgeMs = latestJob?.created_at ? Date.now() - new Date(latestJob.created_at).getTime() : 0;
    if (jobAgeMs < 120_000) {
      return NextResponse.json(
        { error: "Sản phẩm vừa được đưa vào hàng đợi. Vui lòng đợi worker xử lý (tối đa 2 phút)." },
        { status: 409 },
      );
    }
  }

  const { data: sources, count: sourceCount, error: sourceError } = await auth.supabase
    .from("product_source_assets")
    .select("id,camera_direction,camera_azimuth", { count: "exact" })
    .eq("product_id", id);
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });
  if (!sourceCount || sourceCount === 0 || !sources?.length) {
    return NextResponse.json(
      { error: "Sản phẩm chưa có ảnh nguồn. Hãy bấm 'Sửa sản phẩm' để tải ảnh lên trước khi tạo 3D." },
      { status: 400 },
    );
  }
  const hasFront = sources.some((s) => s.camera_direction === "FRONT");
  if (!hasFront) {
    return NextResponse.json(
      { error: "Sản phẩm cần ít nhất một ảnh chính diện (FRONT) để tạo mô hình 3D." },
      { status: 400 },
    );
  }

  const calibratedViews = sources.filter((s) => s.camera_azimuth !== null);
  const mode = calibratedViews.length >= 2 ? "multiview" : "single";

  try {
    const { jobId, dispatch } = await enqueuePixal3dJob(
      auth.supabase,
      id,
      mode,
      _request.headers.get("idempotency-key") ?? undefined,
    );
    return NextResponse.json(
      dispatch.ok
        ? { ok: true, jobId }
        : { ok: false, jobId, error: dispatch.error },
      { status: dispatch.ok ? 200 : 502 },
    );
  } catch (cause) {
    const rawMessage = cause instanceof Error ? cause.message : String(cause);
    let message = "Không thể tạo job Pixal3D. Vui lòng thử lại.";
    if (rawMessage.includes("GPU budget") || rawMessage.includes("P0001")) {
      message = "Giới hạn ngân sách GPU hôm nay đã đạt mức tối đa. Vui lòng thử lại vào ngày mai hoặc liên hệ ban quản trị để tăng hạn mức.";
    } else if (rawMessage.includes("product ownership required") || rawMessage.includes("42501")) {
      message = "Bạn không có quyền thao tác trên sản phẩm này.";
    } else if (rawMessage.includes("active Pixal3D job already exists") || rawMessage.includes("23505")) {
      message = "Sản phẩm đang có một job 3D đang xếp hàng hoặc xử lý. Vui lòng chờ hoàn tất.";
    } else if (rawMessage) {
      message = rawMessage;
    }
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

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

  const { error: sourceError } = await auth.supabase
    .from("product_source_assets")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });
  try {
    const { jobId, dispatch } = await enqueuePixal3dJob(
      auth.supabase,
      id,
      "single",
      _request.headers.get("idempotency-key") ?? undefined,
    );
    return NextResponse.json(dispatch.ok
      ? { ok: true, jobId }
      : { ok: false, jobId, error: dispatch.error }, { status: dispatch.ok ? 200 : 502 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Không thể tạo lại job Pixal3D.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

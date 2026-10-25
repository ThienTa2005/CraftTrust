import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";

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

  const { count } = await auth.supabase
    .from("model_jobs")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  const attempt = Math.min((count ?? 0) + 1, 10);
  const { error: updateError } = await auth.supabase
    .from("products")
    .update({
      status: "draft",
      model_status: "queued",
      model_error: null,
      model_report: null,
      model_url: null,
      ar_url: null,
    })
    .eq("id", id);
  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  const { error: jobError } = await auth.supabase
    .from("model_jobs")
    .insert({ product_id: id, status: "queued", attempt, engine: "auto" });
  if (jobError) {
    await auth.supabase
      .from("products")
      .update({ model_status: "failed", model_error: jobError.message })
      .eq("id", id);
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

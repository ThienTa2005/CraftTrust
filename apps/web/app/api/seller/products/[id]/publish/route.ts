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
    .select("id,model_status,model_url")
    .eq("id", id)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!product)
    return NextResponse.json(
      { error: "Không tìm thấy sản phẩm." },
      { status: 404 },
    );
  if (product.model_status !== "review" || !product.model_url) {
    return NextResponse.json(
      { error: "Mô hình phải ở bước chờ duyệt trước khi xuất bản." },
      { status: 409 },
    );
  }
  const { error: updateError } = await auth.supabase
    .from("products")
    .update({ status: "active", model_status: "ready", model_error: null })
    .eq("id", id);
  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

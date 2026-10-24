import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";

export async function GET() {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json(
      { error: auth.reason ?? "Không thể xác thực tài khoản." },
      { status: auth.user ? 403 : 401 },
    );
  }
  const { data: artisan, error: artisanError } = await auth.supabase
    .from("artisans")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (artisanError)
    return NextResponse.json({ error: artisanError.message }, { status: 500 });
  if (!artisan)
    return NextResponse.json(
      { error: "Chưa có hồ sơ nghệ nhân." },
      { status: 409 },
    );

  const { data: products, error: productError } = await auth.supabase
    .from("products")
    .select("id")
    .eq("artisan_id", artisan.id);
  if (productError)
    return NextResponse.json({ error: productError.message }, { status: 500 });
  const productIds = (products ?? []).map((product) => product.id);
  if (!productIds.length) return NextResponse.json({ orders: [] });

  const { data: items, error: itemError } = await auth.supabase
    .from("order_items")
    .select(
      "id,order_id,product_id,product_name,quantity,unit_price_vnd,line_total_vnd,created_at",
    )
    .in("product_id", productIds)
    .order("created_at", { ascending: false });
  if (itemError)
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  const orderIds = [...new Set((items ?? []).map((item) => item.order_id))];
  if (!orderIds.length) return NextResponse.json({ orders: [] });

  const { data: orders, error: orderError } = await auth.supabase
    .from("orders")
    .select("id,status,subtotal_vnd,payment_mode,shipping_address,created_at")
    .in("id", orderIds)
    .order("created_at", { ascending: false });
  if (orderError)
    return NextResponse.json({ error: orderError.message }, { status: 500 });

  return NextResponse.json({
    orders: (orders ?? []).map((order) => ({
      ...order,
      seller_items: (items ?? []).filter((item) => item.order_id === order.id),
    })),
  });
}

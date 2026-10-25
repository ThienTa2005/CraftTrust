import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";

export async function GET() {
  const auth = await getAuthorizedUser(["admin", "verifier"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason ?? "Không có quyền truy cập." }, { status: 403 });
  }

  const { data: orders, error } = await auth.supabase
    .from("orders")
    .select(`
      id, status, subtotal_vnd, payment_mode, shipping_address, created_at, updated_at, user_id,
      profiles(display_name),
      order_items(id, product_id, product_name, quantity, unit_price_vnd)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: orders ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await getAuthorizedUser(["admin", "verifier"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason ?? "Không có quyền truy cập." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { orderId, status } = body || {};

  if (!orderId || !["placed", "processing", "fulfilled", "cancelled"].includes(status)) {
    return NextResponse.json(
      { error: "Trạng thái đơn hàng không hợp lệ (hỗ trợ: placed, processing, fulfilled, cancelled)." },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select("id, status, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit event
  await auth.supabase.from("audit_events").insert({
    actor_id: auth.user.id,
    action: `UPDATE_ORDER_STATUS_${status.toUpperCase()}`,
    entity_type: "order",
    entity_id: orderId,
    after_data: { status, updated_at: data?.updated_at },
  });

  return NextResponse.json({ order: data });
}

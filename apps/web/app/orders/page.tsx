import { createRequestSupabase } from "@/lib/supabase";
import { OrdersView } from "@/components/orders-view";

export default async function OrdersPage() {
  const supabase = await createRequestSupabase();
  if (!supabase) {
    return <OrdersView hasBackend={false} />;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return <OrdersView hasBackend={false} />;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id,status,subtotal_vnd,payment_mode,shipping_address,created_at,order_items(id,product_name,quantity,unit_price_vnd,personalization)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  return <OrdersView hasBackend={true} backendOrders={data ?? []} error={error?.message} />;
}

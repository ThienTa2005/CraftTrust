import { createRequestSupabase } from "@/lib/supabase";
import { CartView } from "@/components/cart-view";

export default async function CartPage() {
  const supabase = await createRequestSupabase();
  if (!supabase) {
    return <CartView hasBackend={false} />;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return <CartView hasBackend={false} />;
  }

  const { data: carts } = await supabase
    .from("carts")
    .select("id,cart_items(id,quantity,unit_price_vnd,products(name,slug,poster_url))")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .limit(1);

  const items = (carts?.[0]?.cart_items ?? []) as any[];

  return <CartView hasBackend={true} initialBackendItems={items} />;
}

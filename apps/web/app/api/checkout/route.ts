import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestSupabase } from "@/lib/supabase";

const schema = z.object({ recipient:z.string().min(2).max(100), phone:z.string().min(7).max(24), address:z.string().min(5).max(300), city:z.string().min(2).max(100), idempotencyKey:z.string().uuid() });

export async function POST(request: Request) {
  if (process.env.ENABLE_TEST_CHECKOUT !== "true") return NextResponse.json({ error: "Test checkout is disabled." }, { status: 503 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error:"Invalid delivery details", issues:input.error.flatten() }, { status:400 });
  const supabase = await createRequestSupabase();
  if (!supabase) return NextResponse.json({ error:"Supabase is not configured." }, { status:503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error:"Sign in before checkout." }, { status:401 });
  const { idempotencyKey, ...shippingAddress } = input.data;
  const { data, error } = await supabase.rpc("checkout_test_cart", { p_shipping_address: shippingAddress, p_idempotency_key:idempotencyKey });
  if (error) return NextResponse.json({ error:error.message }, { status:400 });
  const value = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ orderId: value?.order_id ?? value?.id ?? data, mode:"test" }, { status:201 });
}

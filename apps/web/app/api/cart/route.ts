import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestSupabase } from "@/lib/supabase";

const inputSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart input", issues: parsed.error.flatten() }, { status: 400 });
  const supabase = await createRequestSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in before adding products." }, { status: 401 });
  const { data, error } = await supabase.rpc("add_to_cart", { p_product_id: parsed.data.productId, p_quantity: parsed.data.quantity });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cart: data });
}

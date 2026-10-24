import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestSupabase } from "@/lib/supabase";

// PostgreSQL accepts the deterministic UUID fixtures used by the local demo,
// while Zod's strict uuid() validator rejects UUIDs whose version nibble is 0.
const postgresUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const inputSchema = z.object({
  productId: postgresUuid,
  quantity: z.number().int().min(1).max(20),
});
const updateSchema = z.object({
  productId: postgresUuid,
  quantity: z.number().int().min(1).max(99),
});
const removeSchema = z.object({ productId: postgresUuid });

async function updateQuantity(request: Request, remove = false) {
  const parsed = (remove ? removeSchema : updateSchema).safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Thông tin giỏ hàng không hợp lệ.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  const supabase = await createRequestSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json(
      { error: "Hãy đăng nhập để quản lý giỏ hàng." },
      { status: 401 },
    );
  const quantity = remove
    ? 0
    : (parsed.data as z.infer<typeof updateSchema>).quantity;
  const { data, error } = await supabase.rpc("set_cart_quantity", {
    p_product_id: parsed.data.productId,
    p_quantity: quantity,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cart: data });
}

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid cart input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  const supabase = await createRequestSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json(
      { error: "Sign in before adding products." },
      { status: 401 },
    );
  const { data, error } = await supabase.rpc("add_to_cart", {
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cart: data });
}

export async function PATCH(request: Request) {
  return updateQuantity(request);
}

export async function DELETE(request: Request) {
  return updateQuantity(request, true);
}

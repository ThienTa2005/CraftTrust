import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestSupabase } from "@/lib/supabase";

const schema = z.object({
  name: z.string().trim().min(3).max(120),
  villageId: z.string().uuid(),
  bio: z.string().trim().max(1000).optional(),
  yearsPracticing: z.number().int().min(1).max(99).optional().default(5),
});

export async function POST(request: Request) {
  const supabase = await createRequestSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase." }, { status: 503 });
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập trước khi đăng ký xưởng." }, { status: 401 });
  }

  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "Thông tin đăng ký không hợp lệ", issues: input.error.flatten() }, { status: 400 });
  }

  const { name, villageId, bio, yearsPracticing } = input.data;
  const slug = `artisan-${Date.now()}`;

  // Check if artisan already exists
  const { data: existing } = await supabase
    .from("artisans")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  let artisanId = existing?.id;

  if (existing) {
    const { data: updated, error } = await supabase
      .from("artisans")
      .update({
        name,
        village_id: villageId,
        bio: bio ?? "",
        years_practicing: yearsPracticing,
        is_published: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id, name, slug, is_published")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    artisanId = updated.id;
  } else {
    const { data: created, error } = await supabase
      .from("artisans")
      .insert({
        owner_id: auth.user.id,
        village_id: villageId,
        name,
        slug,
        bio: bio ?? "",
        years_practicing: yearsPracticing,
        is_published: true,
      })
      .select("id, name, slug, is_published")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    artisanId = created.id;
  }

  // Grant roles
  await supabase.from("user_roles").upsert([
    { user_id: auth.user.id, role: "seller" },
    { user_id: auth.user.id, role: "artisan" },
  ], { onConflict: "user_id,role" });

  return NextResponse.json({
    success: true,
    artisanId,
    message: "Đăng ký xưởng nghệ nhân thành công! Bạn có thể vào Kênh Người Bán ngay bây giờ.",
  });
}

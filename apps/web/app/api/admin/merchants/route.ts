import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";

export async function GET() {
  const auth = await getAuthorizedUser(["admin", "verifier"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason ?? "Không có quyền truy cập." }, { status: 403 });
  }

  const { data: artisans, error } = await auth.supabase
    .from("artisans")
    .select(`
      id, name, slug, bio, years_practicing, is_published, created_at, updated_at, owner_id,
      villages ( id, name, district ),
      products ( id )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (artisans ?? []).map((art: any) => {
    const village = Array.isArray(art.villages) ? art.villages[0] : art.villages;
    const productsCount = Array.isArray(art.products) ? art.products.length : 0;

    return {
      id: art.id,
      name: art.name,
      slug: art.slug,
      bio: art.bio,
      yearsPracticing: art.years_practicing,
      village: village ? `${village.name} · ${village.district}` : "Hà Nội",
      villageId: village?.id,
      isPublished: Boolean(art.is_published),
      status: art.is_published ? "active" : "pending_verification",
      productsCount,
      ownerId: art.owner_id,
      createdAt: art.created_at,
    };
  });

  return NextResponse.json({ merchants: mapped });
}

export async function PATCH(request: Request) {
  const auth = await getAuthorizedUser(["admin", "verifier"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason ?? "Không có quyền truy cập." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { artisanId, isPublished } = body || {};

  if (!artisanId || typeof isPublished !== "boolean") {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ (cần artisanId và isPublished: boolean)." },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("artisans")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", artisanId)
    .select("id, name, is_published, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit event
  await auth.supabase.from("audit_events").insert({
    actor_id: auth.user.id,
    action: isPublished ? "ACTIVATE_ARTISAN_WORKSHOP" : "SUSPEND_ARTISAN_WORKSHOP",
    entity_type: "artisan",
    entity_id: artisanId,
    after_data: { is_published: isPublished },
  });

  return NextResponse.json({ merchant: data });
}

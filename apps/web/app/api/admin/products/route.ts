import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { demoProducts } from "@/lib/demo-data";

export async function GET() {
  const auth = await getAuthorizedUser(["admin", "verifier"]);
  if (!auth.supabase || auth.reason) {
    return NextResponse.json({ error: auth.reason ?? "Không có quyền truy cập." }, { status: 403 });
  }

  const { data: products, error } = await auth.supabase
    .from("products")
    .select(
      `id, name, slug, price_vnd, stock_quantity, status, poster_url, model_url, model_status,
       artisans(id, name, villages(id, name)),
       product_model_assets(id, status, settings, original_filename, file_size, created_at, approved_at)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (products ?? []).map((p: any) => {
    const artisan = Array.isArray(p.artisans) ? p.artisans[0] : p.artisans;
    const village = Array.isArray(artisan?.villages) ? artisan.villages[0] : artisan?.villages;
    const assets = Array.isArray(p.product_model_assets) ? p.product_model_assets : [];
    const publishedAsset = assets.find((a: any) => a.status === "published");
    const activeAsset = publishedAsset || assets[0];

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceVnd: p.price_vnd,
      stock: p.stock_quantity,
      status: p.status,
      image: p.poster_url ?? "/placeholder-product.svg",
      artisan: artisan?.name ?? "Nghệ nhân Hà Nội",
      artisanId: artisan?.id,
      village: village?.name ?? "Bát Tràng",
      hasModel: Boolean(publishedAsset),
      modelUrl: publishedAsset ? `/api/models/${publishedAsset.id}` : (activeAsset ? `/api/models/${activeAsset.id}` : undefined),
      modelStatus: publishedAsset ? "published" : (activeAsset ? activeAsset.status : (p.model_status ?? "no_model")),
      activeAssetId: activeAsset?.id,
      assets,
    };
  });

  return NextResponse.json({ products: mapped, isDemo: false });
}

export async function PATCH(request: Request) {
  const auth = await getAuthorizedUser(["admin", "verifier"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason ?? "Không có quyền truy cập." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { productId, status, rejectionReason } = body || {};

  if (!productId || !["active", "draft", "archived"].includes(status)) {
    return NextResponse.json(
      { error: "Trạng thái sản phẩm không hợp lệ (hỗ trợ: active, draft, archived)." },
      { status: 400 }
    );
  }

  const { data: updated, error } = await auth.supabase
    .from("products")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select("id, name, status, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit event
  await auth.supabase.from("audit_events").insert({
    actor_id: auth.user.id,
    action: `MODERATE_PRODUCT_${status.toUpperCase()}`,
    entity_type: "product",
    entity_id: productId,
    after_data: { status, rejectionReason: rejectionReason ?? null },
  });

  return NextResponse.json({ product: updated });
}

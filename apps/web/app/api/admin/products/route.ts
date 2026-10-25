import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { demoProducts } from "@/lib/demo-data";

export async function GET() {
  const auth = await getAuthorizedUser(["admin", "verifier"]);
  if (!auth.supabase || auth.reason) {
    return NextResponse.json({ error: auth.reason ?? "Không có quyền truy cập." }, { status: 403 });
  }

  // 1. Query products safely (without embedding product_model_assets to prevent relation missing error)
  let rawProducts: any[] = [];

  const fullRes = await auth.supabase
    .from("products")
    .select(
      `id, name, slug, price_vnd, stock_quantity, status, poster_url, model_url,
       artisans ( id, name, villages ( id, name ) )`
    )
    .order("created_at", { ascending: false });

  if (fullRes.data && fullRes.data.length > 0) {
    rawProducts = fullRes.data;
  } else {
    // Fallback: Query products without nested joins
    const fallbackRes = await auth.supabase
      .from("products")
      .select("id, name, slug, price_vnd, stock_quantity, status, poster_url, model_url")
      .order("created_at", { ascending: false });

    if (fallbackRes.data && fallbackRes.data.length > 0) {
      rawProducts = fallbackRes.data;
    }
  }

  // 2. Query product_model_assets separately (safe against missing table or schema cache delay)
  const assetsMap: Record<string, any[]> = {};
  try {
    const { data: assets } = await auth.supabase
      .from("product_model_assets")
      .select("id, product_id, status, settings, original_filename, file_size, created_at, approved_at");

    if (assets) {
      for (const asset of assets) {
        const list = assetsMap[asset.product_id] ?? [];
        list.push(asset);
        assetsMap[asset.product_id] = list;
      }
    }
  } catch {
    // table or relation may not exist yet on remote, safely ignore
  }

  // 3. If database has no products returned, fallback to demoProducts so the UI never crashes
  if (rawProducts.length === 0) {
    const mappedDemo = demoProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceVnd: p.priceVnd,
      stock: p.stock ?? 10,
      status: "active",
      image: p.image ?? "/placeholder-product.svg",
      artisan: p.artisan ?? "Nghệ nhân Hà Nội",
      artisanId: undefined,
      village: p.village ?? "Bát Tràng",
      hasModel: Boolean(p.modelUrl),
      modelUrl: p.modelUrl,
      modelStatus: p.modelUrl ? "published" : "no_model",
      activeAssetId: undefined,
      assets: [],
    }));
    return NextResponse.json({ products: mappedDemo, isDemo: true });
  }

  // 4. Map products
  const mapped = rawProducts.map((p: any) => {
    const artisan = Array.isArray(p.artisans) ? p.artisans[0] : p.artisans;
    const village = Array.isArray(artisan?.villages) ? artisan.villages[0] : artisan?.villages;
    const assets = assetsMap[p.id] || (Array.isArray(p.product_model_assets) ? p.product_model_assets : []);
    const publishedAsset = assets.find((a: any) => a.status === "published");
    const activeAsset = publishedAsset || assets[0];

    const hasModel = Boolean(publishedAsset || p.model_url);
    const modelUrl = publishedAsset
      ? `/api/models/${publishedAsset.id}`
      : (activeAsset ? `/api/models/${activeAsset.id}` : (p.model_url || undefined));
    const modelStatus = publishedAsset
      ? "published"
      : (activeAsset ? activeAsset.status : (p.model_url ? "ready" : "no_model"));

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceVnd: p.price_vnd,
      stock: p.stock_quantity ?? 0,
      status: p.status,
      image: p.poster_url ?? "/placeholder-product.svg",
      artisan: artisan?.name ?? "Nghệ nhân Hà Nội",
      artisanId: artisan?.id,
      village: village?.name ?? "Bát Tràng",
      hasModel,
      modelUrl,
      modelStatus,
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

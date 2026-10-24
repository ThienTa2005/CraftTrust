import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { demoProducts } from "@/lib/demo-data";

export async function GET() {
  const auth = await getAuthorizedUser(["admin", "verifier"]);
  if (!auth.supabase || auth.reason) {
    // Return demo products with model status if not connected
    return NextResponse.json({
      products: demoProducts.map((p) => ({
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        slug: p.slug,
        priceVnd: p.priceVnd,
        stock: p.stock,
        image: p.image,
        artisan: p.artisan,
        village: p.village,
        passportId: p.passportId,
        tier: p.tier,
        hasModel: Boolean(p.modelUrl),
        modelUrl: p.modelUrl,
        modelStatus: p.modelUrl ? "published" : "no_model",
      })),
      isDemo: true,
    });
  }

  const { data: products, error } = await auth.supabase
    .from("products")
    .select(
      `id, name, slug, price_vnd, stock_quantity, poster_url, model_url, model_status,
       artisans(name, villages(name)),
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
      image: p.poster_url ?? "/placeholder-product.svg",
      artisan: artisan?.name ?? "Nghệ nhân Hà Nội",
      village: village?.name ?? "Bát Tràng",
      hasModel: Boolean(publishedAsset),
      modelUrl: publishedAsset ? `/api/models/${publishedAsset.id}` : (activeAsset ? `/api/models/${activeAsset.id}` : undefined),
      modelStatus: publishedAsset ? "published" : (activeAsset ? activeAsset.status : "no_model"),
      activeAssetId: activeAsset?.id,
      assets,
    };
  });

  return NextResponse.json({ products: mapped, isDemo: false });
}

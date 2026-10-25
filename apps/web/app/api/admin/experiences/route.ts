import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";

export const runtime = "nodejs";

async function loadEligibleProducts(supabase: any) {
  const { data: assets, error: assetError } = await supabase
    .from("product_model_assets")
    .select("id,product_id,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (assetError) throw assetError;
  const latestAssetByProduct = new Map<string, any>();
  for (const asset of assets ?? []) {
    if (!latestAssetByProduct.has(asset.product_id)) latestAssetByProduct.set(asset.product_id, asset);
  }
  const productIds = [...latestAssetByProduct.keys()];
  if (!productIds.length) return [];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,name,slug,poster_url,status,artisans(name)")
    .in("id", productIds)
    .eq("status", "active")
    .order("name");
  if (productError) throw productError;
  return (products ?? []).map((product: any) => {
    const artisan = Array.isArray(product.artisans) ? product.artisans[0] : product.artisans;
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      posterUrl: product.poster_url,
      artisan: artisan?.name ?? "Nghệ nhân CraftTrust",
      modelAssetId: latestAssetByProduct.get(product.id)?.id,
    };
  });
}

export async function GET() {
  const auth = await getAuthorizedUser(["admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason }, { status: auth.user ? 403 : 401 });
  }
  try {
    let rawExperiences: any[] = [];
    let products: any[] = [];

    try {
      products = await loadEligibleProducts(auth.supabase);
    } catch (prodErr: any) {
      console.warn("[admin/experiences] loadEligibleProducts error:", prodErr?.message);
    }

    try {
      const { data, error } = await auth.supabase
        .from("experiences")
        .select("id,title,description,status,product_id,model_asset_id,created_at")
        .order("created_at", { ascending: false });
      if (!error && data) {
        rawExperiences = data;
      } else if (error) {
        // Fallback for legacy table schema
        const { data: legacyData } = await auth.supabase
          .from("experiences")
          .select("id,title,description,status,created_at")
          .order("created_at", { ascending: false });
        if (legacyData) rawExperiences = legacyData;
      }
    } catch (expErr: any) {
      console.warn("[admin/experiences] query warning:", expErr?.message);
    }

    const productsById = new Map(products.map((product: any) => [product.id, product]));
    const experiences = rawExperiences.map((item: any) => ({
      ...item,
      product: productsById.get(item.product_id) ?? null,
    }));

    return NextResponse.json({ experiences, products });
  } catch (error: any) {
    console.error("[admin/experiences] load failed", error?.code, error?.message);
    return NextResponse.json({ experiences: [], products: [] });
  }
}

export async function POST(request: Request) {
  const auth = await getAuthorizedUser(["admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason }, { status: auth.user ? 403 : 401 });
  }
  const body = await request.json().catch(() => null);
  const productId = String(body?.productId ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(productId) || title.length < 3 || title.length > 140 || description.length > 3000) {
    return NextResponse.json({ error: "Chọn sản phẩm hợp lệ; tiêu đề cần 3–140 ký tự và mô tả tối đa 3000 ký tự." }, { status: 400 });
  }
  const { data: asset, error: assetError } = await auth.supabase
    .from("product_model_assets")
    .select("id,product_id,status")
    .eq("product_id", productId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assetError || !asset) {
    return NextResponse.json({ error: "Sản phẩm chưa có mô hình 3D đã được duyệt và xuất bản." }, { status: 409 });
  }
  const id = crypto.randomUUID();
  const { error } = await auth.supabase.from("experiences").insert({
    id, title, description, product_id: productId, model_asset_id: asset.id,
    uploaded_by: auth.user.id, status: "draft",
  });
  if (error) {
    console.error("[admin/experiences] insert failed", error.code, error.message);
    return NextResponse.json({ error: "Không lưu được trải nghiệm." }, { status: 500 });
  }
  return NextResponse.json({ id }, { status: 201 });
}

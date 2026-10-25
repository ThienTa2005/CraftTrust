import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { createServiceSupabase } from "@/lib/supabase";
import { demoProducts } from "@/lib/demo-data";

export const runtime = "nodejs";

async function loadEligibleProducts(supabase: any) {
  let products: any[] = [];
  try {
    const { data: prodData } = await supabase
      .from("products")
      .select("id,name,slug,poster_url,status,model_url,model_status,model_version,created_at,artisans(id,name)")
      .order("created_at", { ascending: false });

    if (prodData && prodData.length > 0) {
      products = prodData;
    } else {
      const { data: fallbackData } = await supabase
        .from("products")
        .select("id,name,slug,poster_url,status,model_url,model_status,model_version,created_at")
        .order("created_at", { ascending: false });
      if (fallbackData && fallbackData.length > 0) products = fallbackData;
    }
  } catch (err: any) {
    console.warn("[admin/experiences] query products error:", err?.message);
  }

  const assetsByProduct = new Map<string, any>();
  try {
    const { data: assets } = await supabase
      .from("product_model_assets")
      .select("id,product_id,status,storage_path,created_at")
      .order("created_at", { ascending: false });

    for (const asset of assets ?? []) {
      const existing = assetsByProduct.get(asset.product_id);
      if (!existing || (existing.status !== "published" && asset.status === "published")) {
        assetsByProduct.set(asset.product_id, asset);
      }
    }
  } catch (assetErr: any) {
    console.warn("[admin/experiences] query product_model_assets warning:", assetErr?.message);
  }

  if (products.length === 0) {
    return demoProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      posterUrl: p.image,
      artisan: p.artisan ?? "Nghệ nhân Bát Tràng",
      modelAssetId: p.modelAssetId || undefined,
      hasModel: Boolean(p.modelUrl || p.modelAssetId),
      modelUrl: p.modelUrl,
      status: "active",
    }));
  }

  return products.map((product: any) => {
    const artisan = Array.isArray(product.artisans) ? product.artisans[0] : product.artisans;
    const asset = assetsByProduct.get(product.id);
    const has3d = Boolean(
      asset ||
      product.model_url ||
      (product.model_version && product.model_version.length > 10) ||
      product.model_status === "ready"
    );

    const modelAssetId = asset?.id || (product.model_version && /^[0-9a-f-]{36}$/i.test(product.model_version) ? product.model_version : undefined);
    const modelUrl = asset?.id
      ? `/api/models/${asset.id}`
      : (product.model_url || undefined);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      posterUrl: product.poster_url || "/placeholder-product.svg",
      artisan: artisan?.name ?? "Nghệ nhân CraftTrust",
      modelAssetId,
      hasModel: has3d,
      modelUrl,
      status: product.status,
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

  const db = createServiceSupabase() ?? auth.supabase;

  let assetId: string | null = null;
  let modelPath: string | null = null;

  try {
    const { data: asset } = await db
      .from("product_model_assets")
      .select("id,product_id,status,storage_path")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (asset?.id) {
      assetId = asset.id;
      modelPath = asset.storage_path;
    }
  } catch (err: any) {
    console.warn("[admin/experiences] query asset error:", err?.message);
  }

  // If not found in product_model_assets, check product table directly
  if (!assetId || !modelPath) {
    try {
      const { data: prod } = await db
        .from("products")
        .select("id, model_url, model_version")
        .eq("id", productId)
        .maybeSingle();

      if (prod?.model_version && /^[0-9a-f-]{36}$/i.test(prod.model_version)) {
        assetId = prod.model_version;
      }
      if (prod?.model_url) {
        modelPath = prod.model_url;
      }
    } catch {}
  }

  const id = crypto.randomUUID();
  const finalModelPath = modelPath || `experiences/${id}/model.glb`;

  // Insert with all fields (including model_path to satisfy legacy not-null constraint)
  let { error } = await db.from("experiences").insert({
    id,
    title,
    description,
    product_id: productId,
    model_asset_id: assetId,
    model_path: finalModelPath,
    uploaded_by: auth.user.id,
    status: "draft",
  });

  // If deployed table has not yet applied 202610250007 migration (missing product_id or model_asset_id columns)
  if (error && (error.code === "42703" || error.message?.includes("product_id") || error.message?.includes("model_asset_id"))) {
    const legacyRes = await db.from("experiences").insert({
      id,
      title,
      description,
      model_path: finalModelPath,
      uploaded_by: auth.user.id,
      status: "draft",
    });
    error = legacyRes.error;
  }

  if (error) {
    console.error("[admin/experiences] insert failed", error.code, error.message);
    const hint = error.code === "42P01"
      ? "Bảng experiences chưa được tạo trên Supabase."
      : error.code === "42501"
      ? "Quyền RLS Supabase bị từ chối. Vui lòng kiểm tra quyền Admin hoặc chạy migration 202610250007."
      : error.message;
    return NextResponse.json({ error: `Không lưu được trải nghiệm: ${hint}` }, { status: 500 });
  }
  return NextResponse.json({ id }, { status: 201 });
}

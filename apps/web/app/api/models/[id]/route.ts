import { NextResponse } from "next/server";
import { createRequestSupabase, createServiceSupabase } from "@/lib/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = createServiceSupabase() ?? (await createRequestSupabase());
  const headers = { "Cache-Control": "private, no-store" };
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Model unavailable" }, { status: 404, headers });
  }

  // 1. Look in product_model_assets directly
  let storagePath: string | null = null;
  const { data: assetData } = await db
    .from("product_model_assets")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (assetData?.storage_path) {
    storagePath = assetData.storage_path;
  }

  // 2. If not found by asset id, check if id is a product_id
  if (!storagePath) {
    const { data: assetByProd } = await db
      .from("product_model_assets")
      .select("storage_path")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assetByProd?.storage_path) {
      storagePath = assetByProd.storage_path;
    }
  }

  // 3. Check experiences table by id or product_id
  if (!storagePath) {
    const { data: exp } = await db
      .from("experiences")
      .select("model_path")
      .or(`id.eq.${id},product_id.eq.${id}`)
      .limit(1)
      .maybeSingle();
    if (exp?.model_path) {
      storagePath = exp.model_path;
    }
  }

  if (!storagePath) {
    return NextResponse.json({ error: "Model unavailable" }, { status: 404, headers });
  }

  // If storagePath is already an HTTP URL or local static path, redirect directly
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://") || storagePath.startsWith("/")) {
    return NextResponse.redirect(storagePath, { status: 307, headers });
  }

  // Create signed URL from product-models or experiences bucket
  const primaryBucket = storagePath.startsWith("experiences/") ? "experiences" : "product-models";
  const { data: asset } = await db.storage.from(primaryBucket).createSignedUrl(storagePath, 3600);
  if (asset?.signedUrl) {
    return NextResponse.redirect(asset.signedUrl, { status: 307, headers });
  }

  const fallbackBucket = primaryBucket === "experiences" ? "product-models" : "experiences";
  const { data: fallbackAsset } = await db.storage.from(fallbackBucket).createSignedUrl(storagePath, 3600);
  if (fallbackAsset?.signedUrl) {
    return NextResponse.redirect(fallbackAsset.signedUrl, { status: 307, headers });
  }

  return NextResponse.json({ error: "Model unavailable" }, { status: 404, headers });
}

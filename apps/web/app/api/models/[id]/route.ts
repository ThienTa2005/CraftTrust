import { NextResponse } from "next/server";
import { createRequestSupabase, createServiceSupabase } from "@/lib/supabase";

function getAbsoluteSignedUrl(signedPathOrUrl: string): string {
  if (signedPathOrUrl.startsWith("http://") || signedPathOrUrl.startsWith("https://")) {
    return signedPathOrUrl;
  }
  const rawBase = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uftgqculikjfsuhgzjcd.supabase.co";
  const baseUrl = rawBase.replace(/\/+$/, "");
  const normalizedPath = signedPathOrUrl.startsWith("/") ? signedPathOrUrl : `/${signedPathOrUrl}`;
  // If the path already contains /storage/v1, append directly; otherwise prefix with /storage/v1
  if (normalizedPath.startsWith("/storage/v1")) {
    return `${baseUrl}${normalizedPath}`;
  }
  return `${baseUrl}/storage/v1${normalizedPath}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const headers = { "Cache-Control": "private, no-store" };
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Model unavailable" }, { status: 404, headers });
  }

  const db = await createRequestSupabase();
  const service = createServiceSupabase();
  const client = service ?? db;
  if (!client) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500, headers });
  }

  // 1. Check product_model_assets
  const { data: asset } = await client
    .from("product_model_assets")
    .select("storage_path,status,product_id")
    .eq("id", id)
    .maybeSingle();

  if (asset?.storage_path) {
    let allowed = asset.status === "published";
    if (!allowed && db) {
      const { data: canManage } = await db.rpc("can_manage_product", { p_product_id: asset.product_id });
      allowed = Boolean(canManage);
    }
    if (allowed) {
      const { data: signed } = await client.storage
        .from("product-models")
        .createSignedUrl(asset.storage_path, 300);
      if (signed?.signedUrl) {
        return NextResponse.redirect(getAbsoluteSignedUrl(signed.signedUrl), { status: 307, headers });
      }
    }
  }

  // 2. Check experiences
  const { data: experience } = await client
    .from("experiences")
    .select("model_path,is_published")
    .eq("id", id)
    .maybeSingle();

  if (experience?.model_path) {
    let allowed = Boolean(experience.is_published);
    if (!allowed && db) {
      const { data: userData } = await db.auth.getUser();
      if (userData?.user) allowed = true;
    }
    if (allowed) {
      const { data: signed } = await client.storage
        .from("experience-models")
        .createSignedUrl(experience.model_path, 300);
      if (signed?.signedUrl) {
        return NextResponse.redirect(getAbsoluteSignedUrl(signed.signedUrl), { status: 307, headers });
      }
    }
  }

  return NextResponse.json({ error: "Model unavailable" }, { status: 404, headers });
}

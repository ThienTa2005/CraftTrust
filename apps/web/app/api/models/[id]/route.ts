import { NextResponse } from "next/server";
import { createRequestSupabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const db = await createRequestSupabase();
  const headers = { "Cache-Control": "private, no-store" };
  if (!db || !/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "Model unavailable" }, { status: 404, headers });

  // RLS exposes published models publicly and draft models only to their owner/admin.
  const { data: asset } = await db
    .from("product_model_assets")
    .select("storage_path,status")
    .eq("id", id)
    .maybeSingle();
  if (asset?.storage_path) {
    const { data: signed } = await db.storage
      .from("product-models")
      .createSignedUrl(asset.storage_path, 300);
    if (signed?.signedUrl)
      return NextResponse.redirect(signed.signedUrl, { status: 307, headers });
  }

  // Experience access follows its own published/admin RLS policy. Never resolve an
  // arbitrary product ID to the newest private model.
  const { data: experience } = await db
    .from("experiences")
    .select("model_path")
    .eq("id", id)
    .maybeSingle();
  if (experience?.model_path) {
    const { data: signed } = await db.storage
      .from("experience-models")
      .createSignedUrl(experience.model_path, 300);
    if (signed?.signedUrl)
      return NextResponse.redirect(signed.signedUrl, { status: 307, headers });
  }

  return NextResponse.json({ error: "Model unavailable" }, { status: 404, headers });
}

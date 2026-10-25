import { NextResponse } from "next/server";
import { createRequestSupabase } from "@/lib/supabase";
import { EXPERIENCE_BUCKET } from "@/lib/experiences";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createRequestSupabase();
  const headers = { "Cache-Control": "private, no-store" };
  if (!supabase) return NextResponse.json({ error: "Dịch vụ chưa sẵn sàng." }, { status: 503, headers });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Không tìm thấy mô hình." }, { status: 404, headers });
  // RLS permits drafts only to admins, including when the URL is guessed directly.
  const { data, error } = await supabase.from("experiences").select("model_path,model_asset_id").eq("id", id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Không tìm thấy mô hình." }, { status: 404, headers });
  if (data.model_asset_id) {
    return NextResponse.redirect(new URL(`/api/models/${data.model_asset_id}`, _request.url), { status: 307, headers });
  }
  if (!data.model_path) return NextResponse.json({ error: "Trải nghiệm chưa được gắn mô hình sản phẩm." }, { status: 404, headers });
  const { data: asset, error: assetError } = await supabase.storage.from(EXPERIENCE_BUCKET).createSignedUrl(data.model_path, 60);
  if (assetError || !asset) return NextResponse.json({ error: "Không tải được mô hình." }, { status: 404, headers });
  return NextResponse.redirect(asset.signedUrl, { status: 307, headers });
}

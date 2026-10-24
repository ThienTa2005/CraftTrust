import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { EXPERIENCE_BUCKET, MAX_EXPERIENCE_BYTES, validateExperienceGlb } from "@/lib/experiences";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthorizedUser(["admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason }, { status: auth.user ? 403 : 401 });
  }
  const { data, error } = await auth.supabase.from("experiences")
    .select("id,title,description,status,created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Không tải được trải nghiệm. Kiểm tra cấu hình dữ liệu." }, { status: 500 });
  return NextResponse.json({ experiences: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthorizedUser(["admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason }, { status: auth.user ? 403 : 401 });
  }
  let form: FormData;
  try { form = await request.formData(); } catch {
    return NextResponse.json({ error: "Dữ liệu tải lên không hợp lệ." }, { status: 400 });
  }
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const file = form.get("model");
  if (title.length < 3 || title.length > 140 || description.length > 3000) {
    return NextResponse.json({ error: "Tiêu đề cần 3–140 ký tự; mô tả tối đa 3000 ký tự." }, { status: 400 });
  }
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".glb") || file.size > MAX_EXPERIENCE_BYTES) {
    return NextResponse.json({ error: "Chọn file GLB tối đa 4 MB." }, { status: 400 });
  }
  const buffer = await file.arrayBuffer();
  const validationError = validateExperienceGlb(buffer);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const id = crypto.randomUUID();
  const path = `${id}/model.glb`;
  const bucket = auth.supabase.storage.from(EXPERIENCE_BUCKET);
  const { error: uploadError } = await bucket.upload(path, buffer, { contentType: "model/gltf-binary", upsert: false });
  if (uploadError) return NextResponse.json({ error: "Không tải được mô hình. Vui lòng thử lại." }, { status: 500 });
  const { error } = await auth.supabase.from("experiences").insert({
    id, title, description, model_path: path, uploaded_by: auth.user.id, status: "draft",
  });
  if (error) {
    await bucket.remove([path]);
    return NextResponse.json({ error: "Không lưu được trải nghiệm." }, { status: 500 });
  }
  return NextResponse.json({ id }, { status: 201 });
}

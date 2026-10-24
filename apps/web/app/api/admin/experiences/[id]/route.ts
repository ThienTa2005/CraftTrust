import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedUser(["admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.reason }, { status: auth.user ? 403 : 401 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["draft", "published"].includes(body?.status)) {
    return NextResponse.json({ error: "Trạng thái hoặc mã trải nghiệm không hợp lệ." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.from("experiences").update({ status: body.status })
    .eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Không cập nhật được trạng thái." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Không tìm thấy trải nghiệm." }, { status: 404 });
  return NextResponse.json({ id: data.id, status: body.status });
}

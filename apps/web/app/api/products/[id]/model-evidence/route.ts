import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.user ? 403 : 401 });
  const { id } = await context.params;
  const { data: allowed, error: accessError } = await auth.supabase.rpc("can_manage_product", { p_product_id: id });
  if (accessError || allowed !== true) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: jobs, error } = await auth.supabase.from("model_jobs")
    .select("id,status,current_step,progress,error_code,created_at,gpu_runtime_ms,estimated_cost_usd,model_asset_id,input_manifest")
    .eq("product_id", id).order("created_at", { ascending: false }).limit(10);
  if (error) return NextResponse.json({ error: "Evidence unavailable" }, { status: 503 });
  const history = await Promise.all((jobs ?? []).map(async ({ input_manifest, ...job }) => {
    const sources = Array.isArray(input_manifest) ? input_manifest : [];
    const images = await Promise.all(sources.slice(0, 4).map(async (source) => {
      const { data } = await auth.supabase!.storage.from("product-source").createSignedUrl(source.storagePath, 300);
      return { direction: source.direction, url: data?.signedUrl ?? null };
    }));
    return { ...job, images };
  }));
  return NextResponse.json({ history }, { headers: { "Cache-Control": "private, no-store" } });
}

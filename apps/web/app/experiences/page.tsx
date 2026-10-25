import { ExperiencesView } from "@/components/experiences-view";
import { createPublicSupabase } from "@/lib/supabase";
import type { Experience } from "@/lib/experiences";

export const metadata = { title: "Trải nghiệm 3D/VR · CraftTrust" };
export const dynamic = "force-dynamic";

export default async function ExperiencesPage() {
  const supabase = createPublicSupabase();
  if (!supabase) return <ExperiencesView experiences={[]} unavailable />;
  let experiences: Experience[] = [];
  let unavailable = false;
  try {
    const { data, error } = await supabase.from("experiences")
      .select("id,title,description,status,product_id,model_asset_id,created_at").eq("status", "published")
      .order("created_at", { ascending: false });
    const productIds = [...new Set((data ?? []).map((item) => item.product_id).filter(Boolean))];
    const { data: products } = productIds.length
      ? await supabase.from("products").select("id,name,slug,poster_url,artisans(name)").in("id", productIds)
      : { data: [] };
    const productsById = new Map((products ?? []).map((product: any) => {
      const artisan = Array.isArray(product.artisans) ? product.artisans[0] : product.artisans;
      return [product.id, { id: product.id, name: product.name, slug: product.slug, posterUrl: product.poster_url, artisan: artisan?.name ?? "Nghệ nhân CraftTrust", modelAssetId: "" }];
    }));
    experiences = (data ?? []).map((item) => ({ ...item, product: productsById.get(item.product_id) ?? null })) as Experience[];
    unavailable = Boolean(error);
  } catch {
    unavailable = true;
  }
  return <ExperiencesView experiences={experiences} unavailable={unavailable} />;
}

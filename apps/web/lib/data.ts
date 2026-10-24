import { createPublicSupabase } from "./supabase";
import { demoProducts, demoVillages, type ProductCard, type VillageCard } from "./demo-data";
export { formatVnd } from "./format";

export type DataResult<T> = { data: T; demo: boolean; error?: string };

export async function getVillages(): Promise<DataResult<VillageCard[]>> {
  const supabase = createPublicSupabase();
  if (!supabase) return { data: demoVillages, demo: true };
  const { data, error } = await supabase
    .from("villages")
    .select("id,slug,name,district,summary,cover_image_url")
    .eq("is_published", true)
    .order("name");
  if (error) return { data: [], demo: false, error: error.message };
  return {
    demo: false,
    data: (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      district: row.district,
      summary: row.summary,
      craft: "Heritage craft",
      image: row.cover_image_url ?? "/placeholder-village.svg"
    }))
  };
}

export async function getProducts(): Promise<DataResult<ProductCard[]>> {
  const supabase = createPublicSupabase();
  if (!supabase) return { data: demoProducts, demo: true };
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,description,price_vnd,stock_quantity,poster_url,model_url,ar_url,artisans(name,villages(name)),passport_records(public_id,tier)")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) return { data: [], demo: false, error: error.message };
  return {
    demo: false,
    data: (data ?? []).map((row: any) => {
      const passport = Array.isArray(row.passport_records) ? row.passport_records[0] : row.passport_records;
      const artisan = Array.isArray(row.artisans) ? row.artisans[0] : row.artisans;
      const village = Array.isArray(artisan?.villages) ? artisan.villages[0] : artisan?.villages;
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        priceVnd: row.price_vnd,
        stock: row.stock_quantity,
        image: row.poster_url ?? "/placeholder-product.svg",
        artisan: artisan?.name ?? "Unknown artisan",
        village: village?.name ?? "Unknown village",
        passportId: passport?.public_id ?? "Pending passport",
        tier: passport?.tier ?? "bronze",
        modelUrl: row.model_url ?? undefined,
        arUrl: row.ar_url ?? undefined
      } satisfies ProductCard;
    })
  };
}

export async function getProduct(slug: string): Promise<DataResult<ProductCard | null>> {
  const result = await getProducts();
  return { ...result, data: result.data.find((product) => product.slug === slug) ?? null };
}

export async function getVillage(slug: string): Promise<DataResult<VillageCard | null>> {
  const result = await getVillages();
  return { ...result, data: result.data.find((village) => village.slug === slug) ?? null };
}


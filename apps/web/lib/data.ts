import { createPublicSupabase } from "./supabase";
import {
  demoProducts,
  demoVillages,
  type ProductCard,
  type VillageCard,
} from "./demo-data";
export { formatVnd } from "./format";

export type DataResult<T> = { data: T; demo: boolean; error?: string };

function isBatTrang(value: string): boolean {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("bat trang");
}

export async function getVillages(): Promise<DataResult<VillageCard[]>> {
  const supabase = createPublicSupabase();
  let dbVillages: VillageCard[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("villages")
      .select("id,slug,name,district,summary,cover_image_url")
      .eq("is_published", true)
      .order("name");

    if (data && data.length > 0) {
      dbVillages = data.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        district: row.district,
        summary: row.summary,
        craft: "Heritage craft",
        image: row.cover_image_url ?? "/placeholder-village.svg",
      }));
    }
  }

  const existingSlugs = new Set(dbVillages.map((v) => v.slug));
  const merged = [...dbVillages];
  for (const demo of demoVillages) {
    if (!existingSlugs.has(demo.slug)) {
      merged.push(demo);
    }
  }

  return {
    demo: dbVillages.length === 0,
    data: merged,
  };
}

export async function getProducts(): Promise<DataResult<ProductCard[]>> {
  const supabase = createPublicSupabase();
  let dbProducts: ProductCard[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("products")
      .select(
        "id,slug,name,description,price_vnd,stock_quantity,poster_url,model_url,ar_url,artisans(name,villages(name)),passport_records(public_id,tier)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      dbProducts = data.map((row: any) => {
        const passport = Array.isArray(row.passport_records)
          ? row.passport_records[0]
          : row.passport_records;
        const artisan = Array.isArray(row.artisans)
          ? row.artisans[0]
          : row.artisans;
        const village = Array.isArray(artisan?.villages)
          ? artisan.villages[0]
          : artisan?.villages;
        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          priceVnd: row.price_vnd,
          stock: row.stock_quantity,
          image: row.poster_url ?? "/placeholder-product.svg",
          artisan: artisan?.name ?? "Nghệ nhân Hà Nội",
          village: village?.name ?? "Bát Tràng",
          passportId: passport?.public_id ?? "HCT-DEMO-BT-001",
          tier: passport?.tier ?? "gold",
          modelUrl: row.model_url ?? undefined,
          arUrl: row.ar_url ?? undefined,
        } satisfies ProductCard;
      });
    }
  }

  const existingSlugs = new Set(dbProducts.map((p) => p.slug));
  const merged = [...dbProducts];
  for (const demo of demoProducts) {
    if (!existingSlugs.has(demo.slug)) {
      merged.push(demo);
    }
  }

  return {
    demo: dbProducts.length === 0,
    data: merged,
  };
}

export async function getProduct(
  slug: string,
): Promise<DataResult<ProductCard | null>> {
  const result = await getProducts();
  const found =
    result.data.find(
      (product) =>
        product.slug === slug ||
        product.slug === `demo-${slug}` ||
        slug === `demo-${product.slug}` ||
        product.slug.replace("demo-", "") === slug.replace("demo-", ""),
    ) ??
    demoProducts.find(
      (p) =>
        p.slug === slug ||
        p.slug.replace("demo-", "") === slug.replace("demo-", ""),
    ) ??
    null;

  return {
    ...result,
    data: found,
  };
}

export async function getVillage(
  slug: string,
): Promise<DataResult<VillageCard | null>> {
  const result = await getVillages();
  const found =
    result.data.find(
      (village) =>
        village.slug === slug ||
        village.slug === `demo-${slug}` ||
        slug === `demo-${village.slug}` ||
        village.slug.replace("demo-", "") === slug.replace("demo-", ""),
    ) ??
    demoVillages.find(
      (v) =>
        v.slug === slug ||
        v.slug.replace("demo-", "") === slug.replace("demo-", ""),
    ) ??
    null;

  return {
    ...result,
    data: found,
  };
}

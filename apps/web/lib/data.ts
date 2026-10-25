import { createPublicSupabase } from "./supabase";
import { modelConfigSchema } from "./model-config";
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
    if (!supabase && !existingSlugs.has(demo.slug)) {
      merged.push(demo);
    }
  }

  return {
    demo: !supabase,
    data: merged,
  };
}

export async function getProducts(): Promise<DataResult<ProductCard[]>> {
  const supabase = createPublicSupabase();
  let dbProducts: ProductCard[] = [];
  let dataError: string | undefined;

  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,slug,name,description,price_vnd,stock_quantity,poster_url,model_url,ar_url,artisans(name,villages(name)),passport_records(public_id,tier)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    dataError = error?.message;
    const { data: assets } = await supabase.from("product_model_assets").select("id,product_id,settings").eq("status", "published");
    if (data && data.length > 0) {
      dbProducts = data.map((row: any) => {
        const asset = assets?.find((a) => a.product_id === row.id);
        const settings = modelConfigSchema.safeParse(asset?.settings);
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
          passportId: passport?.public_id ?? "",
          tier: passport?.tier ?? "unverified",
          modelUrl: asset ? `/api/models/${asset.id}` : undefined,
          modelAssetId: asset?.id,
          modelConfig: settings.success ? settings.data : undefined,
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
    demo: !supabase || dbProducts.length === 0,
    ...(dataError ? { error: dataError } : {}),
    data: merged,
  };
}

export async function getProduct(
  slug: string,
): Promise<DataResult<ProductCard | null>> {
  const result = await getProducts();
  const cleanSlug = slug.replace(/^demo-/, "");
  const found =
    result.data.find(
      (product) =>
        product.slug === slug ||
        product.slug.replace(/^demo-/, "") === cleanSlug,
    ) ??
    demoProducts.find(
      (p) =>
        p.slug === slug ||
        p.slug.replace(/^demo-/, "") === cleanSlug,
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
    (result.demo ? demoVillages : []).find(
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

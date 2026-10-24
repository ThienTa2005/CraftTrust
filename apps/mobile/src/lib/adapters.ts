import type { CraftTrustClient } from "@craft-trust/api-client";
import { asRecord, readNumber, readString, type ArtisanView, type CartLineView, type OrderView, type PassportView, type ProductView, type VillageView } from "../domain";

const rowArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  return Array.isArray(record.data) ? record.data : [];
};

export async function loadVillages(api: CraftTrustClient): Promise<VillageView[]> {
  const rows = rowArray(await api.listVillages());
  return rows.map((item) => {
    const row = asRecord(item);
    return { id: readString(row.id), slug: readString(row.slug), name: readString(row.name), district: readString(row.district), summary: readString(row.summary), coverImageUrl: readString(row.cover_image_url ?? row.coverImageUrl) || null };
  });
}

export async function loadProducts(api: CraftTrustClient): Promise<ProductView[]> {
  const [products, artisans] = await Promise.all([api.listProducts(), api.listArtisans()]);
  const artisanNames = new Map(artisans.map((artisan) => [artisan.id, artisan.name]));
  const rows = rowArray(products);
  return rows.map((item) => {
    const row = asRecord(item);
    const artisan = asRecord(row.artisan ?? row.artisans);
    return { id: readString(row.id), slug: readString(row.slug), name: readString(row.name), description: readString(row.description), artisanName: readString(artisan.name, artisanNames.get(readString(row.artisanId ?? row.artisan_id)) ?? "Unknown artisan"), priceVnd: readNumber(row.price_vnd ?? row.priceVnd), stockQuantity: readNumber(row.stock_quantity ?? row.stockQuantity), posterUrl: readString(row.poster_url ?? row.posterUrl) || null };
  });
}

export async function loadArtisans(api: CraftTrustClient): Promise<ArtisanView[]> {
  return rowArray(await api.listArtisans()).map((item) => {
    const row = asRecord(item);
    return { id: readString(row.id), villageId: readString(row.villageId ?? row.village_id), name: readString(row.name), bio: readString(row.bio), yearsPracticing: readNumber(row.yearsPracticing ?? row.years_practicing), portraitUrl: readString(row.portraitUrl ?? row.portrait_url) || null };
  });
}

export async function loadCart(api: CraftTrustClient): Promise<CartLineView[]> {
  const result = asRecord(await api.getCart());
  const rows = rowArray(result.items ?? result);
  return rows.map((item) => {
    const row = asRecord(item);
    const product = asRecord(row.product ?? row.products);
    return { id: readString(product.id ?? row.productId ?? row.product_id), slug: readString(product.slug), name: readString(product.name), description: readString(product.description), artisanName: readString(asRecord(product.artisan ?? product.artisans).name, "Registered artisan"), priceVnd: readNumber(row.unitPriceVnd ?? row.unit_price_vnd ?? product.priceVnd ?? product.price_vnd), stockQuantity: readNumber(product.stockQuantity ?? product.stock_quantity), posterUrl: readString(product.posterUrl ?? product.poster_url) || null, quantity: readNumber(row.quantity, 1) };
  });
}

export async function loadOrders(api: CraftTrustClient): Promise<OrderView[]> {
  return rowArray(await api.listOrders()).map((item) => {
    const row = asRecord(item);
    return { id: readString(row.id), status: readString(row.status, "unknown"), subtotalVnd: readNumber(row.subtotal_vnd ?? row.subtotalVnd), createdAt: readString(row.created_at ?? row.createdAt) };
  });
}

export function toPassportView(value: unknown, publicId: string): PassportView {
  const envelope = asRecord(value);
  const row = asRecord(envelope.passport ?? envelope.data ?? value);
  const product = asRecord(envelope.product ?? row.product ?? row.products);
  const artisan = asRecord(envelope.artisan ?? product.artisan ?? product.artisans ?? row.artisan);
  const village = asRecord(envelope.village ?? artisan.village ?? artisan.villages ?? row.village);
  const tier = readString(row.tier, "unverified");
  return { publicId: readString(row.public_id ?? row.publicId, publicId), tier: tier === "bronze" || tier === "silver" || tier === "gold" ? tier : "unverified", status: readString(row.status, "unknown"), productName: readString(product.name, "Unknown product"), artisanName: readString(artisan.name, "Unknown artisan"), villageName: readString(village.name, "Unknown village"), evidenceCount: rowArray(row.evidence ?? envelope.evidence ?? envelope.approvedEvidence).length };
}

export function extractPassportId(input: string): string {
  const value = input.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return value;
  }
}

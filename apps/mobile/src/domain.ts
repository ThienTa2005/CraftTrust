export interface VillageView {
  id: string;
  slug: string;
  name: string;
  district: string;
  summary: string;
  coverImageUrl: string | null;
}

export interface ProductView {
  id: string;
  slug: string;
  name: string;
  description: string;
  artisanName: string;
  priceVnd: number;
  stockQuantity: number;
  posterUrl: string | null;
}

export interface ArtisanView {
  id: string;
  villageId: string;
  name: string;
  bio: string;
  yearsPracticing: number;
  portraitUrl: string | null;
}

export interface CartLineView extends ProductView {
  quantity: number;
}

export interface OrderView {
  id: string;
  status: string;
  subtotalVnd: number;
  createdAt: string;
}

export interface PassportView {
  publicId: string;
  tier: "bronze" | "silver" | "gold" | "unverified";
  status: string;
  productName: string;
  artisanName: string;
  villageName: string;
  evidenceCount: number;
}

export const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export const readString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};

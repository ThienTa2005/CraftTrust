import type { Metadata } from "next";
import { getProducts } from "@/lib/data";
import { MarketplaceView } from "@/components/marketplace-view";

export const metadata: Metadata = {
  title: "Chợ thủ công · Marketplace"
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; q?: string; cat?: string; category?: string }>;
}) {
  const products = await getProducts();
  const params = await searchParams;
  const rawCategory = params.cat ?? params.category ?? "";
  const initialFilter = ["tea", "vase", "cobalt"].includes(rawCategory)
    ? rawCategory
    : "all";

  return (
    <MarketplaceView
      products={products.data}
      demo={products.demo}
      error={products.error}
      initialFilter={initialFilter}
      initialSearch={params.q ?? ""}
    />
  );
}

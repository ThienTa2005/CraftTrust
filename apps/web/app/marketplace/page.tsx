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
  const isGold = params.tier === "gold" || params.cat === "gold" || params.category === "gold";
  const initialFilter = isGold
    ? "gold"
    : ["tea", "vase", "cobalt", "gold"].includes(params.cat ?? params.category ?? "")
      ? (params.cat ?? params.category)!
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

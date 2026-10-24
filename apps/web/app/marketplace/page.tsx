import type { Metadata } from "next";
import { getProducts } from "@/lib/data";
import { MarketplaceView } from "@/components/marketplace-view";

export const metadata: Metadata = {
  title: "Chợ thủ công · Marketplace"
};

export default async function MarketplacePage() {
  const products = await getProducts();

  return (
    <MarketplaceView
      products={products.data}
      demo={products.demo}
      error={products.error}
    />
  );
}

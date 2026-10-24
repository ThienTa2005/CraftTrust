import { getProducts, getVillages } from "@/lib/data";
import { HomeView } from "@/components/home-view";

export default async function HomePage() {
  const [villages, products] = await Promise.all([getVillages(), getProducts()]);

  return (
    <HomeView
      villages={villages.data}
      products={products.data}
      demo={villages.demo || products.demo}
      error={villages.error ?? products.error}
    />
  );
}

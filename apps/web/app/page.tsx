import { getProducts } from "@/lib/data";
import { HomeView } from "@/components/home-view";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <HomeView
      products={products.data}
      demo={products.demo}
      error={products.error}
    />
  );
}

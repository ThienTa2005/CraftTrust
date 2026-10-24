import { notFound } from "next/navigation";
import { getProducts, getVillage } from "@/lib/data";
import { VillageDetailView } from "@/components/village-detail-view";

export default async function VillageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, products] = await Promise.all([getVillage(slug), getProducts()]);
  if (!result.data) notFound();

  const village = result.data;
  const villageProducts = products.data.filter((p) => p.village === village.name);

  return (
    <VillageDetailView
      village={village}
      products={villageProducts}
      demo={result.demo}
      error={result.error}
    />
  );
}

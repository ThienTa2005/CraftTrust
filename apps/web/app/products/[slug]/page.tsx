import { notFound } from "next/navigation";
import { getProduct } from "@/lib/data";
import { ProductDetailView } from "@/components/product-detail-view";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (!result.data) notFound();

  return (
    <ProductDetailView
      product={result.data}
      demo={result.demo}
      error={result.error}
    />
  );
}

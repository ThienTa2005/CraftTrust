"use client";

import Link from "next/link";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
import { GlazeEngravingCustomizer } from "@/components/glaze-engraving-customizer";
import { CraftModelViewer } from "@/components/model-viewer";
import { DataNotice } from "@/components/data-state";
import { formatVnd } from "@/lib/format";
import type { ProductCard } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";
import { ProductImageLens } from "@/components/product-image-lens";

export function ProductDetailView({
  product,
  demo,
  error,
}: {
  product: ProductCard;
  demo: boolean;
  error?: string | undefined;
}) {
  const { locale, t } = useLanguage();

  const title =
    locale === "en" && product.nameEn ? product.nameEn : product.name;
  const description =
    locale === "en" && product.descriptionEn
      ? product.descriptionEn
      : product.description;
  const village =
    locale === "en" && product.villageEn ? product.villageEn : product.village;

  return (
    <section className="shell detail">
      <div className="detail-media">
        <ProductImageLens src={product.image} alt={title} />
        {product.modelUrl ? (
          <GlazeEngravingCustomizer product={product} isDemo={demo} />
        ) : (
          <CraftModelViewer
            src={product.modelUrl}
            arUrl={product.arUrl}
            poster={product.image}
          />
        )}
      </div>

      <div className="detail-copy">
        <DataNotice demo={demo} error={error} />
        <h1>{title}</h1>
        <div className="price">{formatVnd(product.priceVnd)}</div>
        <p>{description}</p>

        <div className="fact-list">
          <div className="fact">
            <span>{t.product.artisan}</span>
            <strong>{product.artisan}</strong>
          </div>
          <div className="fact">
            <span>{t.product.village}</span>
            <strong>{village}</strong>
          </div>
          <div className="fact">
            <span>{locale === "vi" ? "Tình trạng kho" : "Availability"}</span>
            <strong>
              {product.stock > 0
                ? locale === "vi"
                  ? `Còn ${product.stock} tác phẩm`
                  : `${product.stock} in stock`
                : t.product.outOfStock}
            </strong>
          </div>
          <div className="fact">
            <span>{locale === "vi" ? "Hồ sơ hộ chiếu số" : "Digital passport"}</span>
            {product.passportId ? <Link href={`/passport/${product.passportId}`}>
              <strong>
                {product.passportId} <ExternalLink size={13} />
              </strong>
            </Link> : <span>{locale === "vi" ? "Chưa có hồ sơ hộ chiếu" : "No passport record"}</span>}
          </div>
        </div>

        <AddToCart
          product={product}
          productId={product.id}
          isDemo={demo}
          disabled={product.stock < 1}
        />
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { formatVnd } from "@/lib/format";
import type { ProductCard as Product } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";

export function ProductCard({ product }: { product: Product }) {
  const { locale, t } = useLanguage();

  const title = locale === "en" && product.nameEn ? product.nameEn : product.name;
  const village = locale === "en" && product.villageEn ? product.villageEn : product.village;
  const tierLabel = t.passport.tierLabels[product.tier] ?? product.tier;

  return (
    <article className="card">
      <Link href={`/products/${product.slug}`}>
        <div className="card-image">
          <Image
            src={product.image}
            alt={title}
            fill
            sizes="(max-width: 700px) 100vw, 33vw"
          />
        </div>
        <div className="card-body">
          <div className="card-meta">
            <span>{village}</span>
            <span className={`badge ${product.tier}`}>
              <BadgeCheck size={12} />
              {tierLabel}
            </span>
          </div>
          <h3>{title}</h3>
          <p>{locale === "vi" ? `Nghệ nhân: ${product.artisan}` : `By ${product.artisan}`}</p>
          <div className="card-bottom">
            <span className="price">{formatVnd(product.priceVnd)}</span>
            <span aria-label={`${product.stock} ${t.product.inStock}`}>
              {locale === "vi" ? `Còn ${product.stock} tác phẩm` : `${product.stock} available`}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

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
  const tierLabel = t.passport.tierLabels[product.tier] ?? product.tier;

  return (
    <section className="shell detail">
      <div className="detail-media">
        <ProductImageLens src={product.image} alt={title} />
        {product.modelUrl ? (
          <GlazeEngravingCustomizer product={product} />
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
        <span className={`badge ${product.tier}`}>
          <BadgeCheck size={13} />
          {tierLabel}
        </span>
        <h1 style={{ marginTop: 16 }}>{title}</h1>
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
            <span>{t.product.passportTier}</span>
            <Link href={`/passport/${product.passportId}`}>
              <strong>
                {product.passportId} <ExternalLink size={13} />
              </strong>
            </Link>
          </div>
        </div>

        <AddToCart
          product={product}
          productId={product.id}
          isDemo={demo}
          disabled={product.stock < 1}
        />

        {demo ? (
          <p className="status" style={{ marginTop: 10 }}>
            {locale === "vi"
              ? "Chế độ trải nghiệm thử: Sản phẩm được lưu vào giỏ hàng mô phỏng để bạn kiểm thử luồng đặt đơn."
              : "Demo mode: Items are added to the simulated cart so you can test the entire checkout flow."}
          </p>
        ) : null}

        <div className="panel" style={{ marginTop: 28 }}>
          <strong>
            {locale === "vi"
              ? "Ý nghĩa của cấp độ hộ chiếu"
              : "What the tier means"}
          </strong>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            {locale === "vi"
              ? "Cấp độ hộ chiếu phản ánh mức độ đầy đủ của hồ sơ bằng chứng được hội đồng thẩm định phê duyệt (Đồng: nguồn gốc cơ bản; Bạc: chi tiết quy trình chế tác; Vàng: kiểm định độc lập & trích dẫn tư liệu chuẩn mực). Cấp độ này không thay thế giấy kiểm định nghệ thuật hay bảo hộ thương mại độc quyền."
              : "Passport tiers reflect approved evidence coverage. They are computed by the database review workflow and do not certify quality, sustainability, or legal origin beyond the cited evidence."}
          </p>
        </div>
      </div>
    </section>
  );
}

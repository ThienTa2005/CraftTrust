"use client";

import Image from "next/image";
import Link from "next/link";
import { DataNotice } from "@/components/data-state";
import { ProductCard } from "@/components/product-card";
import type { ProductCard as Product, VillageCard } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";

interface VillageDetailViewProps {
  village: VillageCard;
  products: Product[];
  demo: boolean;
  error?: string | undefined;
}

export function VillageDetailView({ village, products, demo, error }: VillageDetailViewProps) {
  const { locale, t } = useLanguage();

  const summary = locale === "en" && village.summaryEn ? village.summaryEn : village.summary;
  const craft = locale === "en" && village.craftEn ? village.craftEn : village.craft;

  return (
    <>
      <section className="shell detail">
        <div className="detail-media">
          <Image src={village.image} alt={village.name} width={900} height={1000} />
        </div>
        <div className="detail-copy">
          <DataNotice demo={demo} error={error} />
          <span className="eyebrow">{village.district} · {craft}</span>
          <h1>{village.name}</h1>
          <p>{summary}</p>
          <div className="fact-list">
            <div className="fact">
              <span>{locale === "vi" ? "Trạng thái di sản" : "Heritage status"}</span>
              <strong>{locale === "vi" ? "Tư liệu đang được thẩm định" : "Sources under review"}</strong>
            </div>
            <div className="fact">
              <span>{locale === "vi" ? "Tác phẩm đã công bố" : "Public craft"}</span>
              <strong>{products.length}</strong>
            </div>
            <div className="fact">
              <span>{locale === "vi" ? "Chính sách thẩm định" : "Evidence policy"}</span>
              <strong>{locale === "vi" ? "Minh chứng có trích dẫn" : "Source-cited"}</strong>
            </div>
          </div>
          <Link href="/assistant" className="button" style={{ marginTop: 16 }}>
            {t.footer.heritageGuide}
          </Link>
        </div>
      </section>

      <section className="section soft">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow">{locale === "vi" ? "Từ làng nghề này" : "From this village"}</span>
              <h2>{locale === "vi" ? "Gặp gỡ nghệ nhân qua tác phẩm của họ" : "Meet its makers through their work"}</h2>
            </div>
          </div>
          {products.length ? (
            <div className="grid three">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty">
              {locale === "vi" ? "Chưa có tác phẩm nào từ làng nghề này." : "No active products from this village yet."}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

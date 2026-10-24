"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DataNotice } from "@/components/data-state";
import { ProductCard } from "@/components/product-card";
import type { ProductCard as Product } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";

export function MarketplaceView({ products, demo, error }: { products: Product[]; demo: boolean; error?: string | undefined }) {
  const { locale, t } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filters = useMemo(() => [
    { id: "all", label: locale === "vi" ? "Tất cả tác phẩm" : "All craft" },
    { id: "ceramics", label: locale === "vi" ? "Gốm sứ Bát Tràng" : "Ceramics" },
    { id: "textiles", label: locale === "vi" ? "Lụa Vạn Phúc" : "Textiles & Silk" },
    { id: "wood", label: locale === "vi" ? "Mộc Chàng Sơn" : "Wood craft" },
    { id: "gold", label: locale === "vi" ? "Hạng Vàng (Gold)" : "Gold passport" }
  ], [locale]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filter by category/tier
      if (selectedFilter === "ceramics" && !p.village.includes("Bát Tràng")) return false;
      if (selectedFilter === "textiles" && !p.village.includes("Vạn Phúc")) return false;
      if (selectedFilter === "wood" && !p.village.includes("Chàng Sơn")) return false;
      if (selectedFilter === "gold" && p.tier !== "gold") return false;

      // Filter by search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(term) || (p.nameEn?.toLowerCase().includes(term) ?? false);
        const makerMatch = p.artisan.toLowerCase().includes(term);
        const villageMatch = p.village.toLowerCase().includes(term);
        if (!nameMatch && !makerMatch && !villageMatch) return false;
      }
      return true;
    });
  }, [products, selectedFilter, searchTerm]);

  return (
    <div className="shell">
      <header className="page-hero">
        <span className="eyebrow">{t.marketplace.eyebrow}</span>
        <h1>{t.marketplace.title}</h1>
        <p>{t.marketplace.subtitle}</p>
      </header>

      <DataNotice demo={demo} error={error} />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 24, marginTop: 16 }}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 450 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.marketplace.searchPlaceholder}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: "#fff"
            }}
          />
        </div>

        <div className="filters" aria-label="Marketplace filters" style={{ margin: 0 }}>
          {filters.map((f) => (
            <button
              key={f.id}
              className={`filter ${selectedFilter === f.id ? "active" : ""}`}
              onClick={() => setSelectedFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredProducts.length ? (
        <div className="grid three">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty">{t.marketplace.noResults}</div>
      )}
    </div>
  );
}

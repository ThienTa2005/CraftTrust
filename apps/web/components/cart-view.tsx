"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  clearDemoCart,
  getDemoCart,
  removeFromDemoCart,
  type DemoCartItem,
} from "@/lib/cart-store";
import { formatVnd } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/context";

interface CartViewProps {
  initialBackendItems?: Array<{
    product_id: string;
    quantity: number;
    unit_price_vnd: number;
    products?:
      | {
          name: string;
          slug: string;
          poster_url?: string | undefined;
        }
      | undefined;
  }>;
  hasBackend?: boolean;
}

export function CartView({
  initialBackendItems = [],
  hasBackend = false,
}: CartViewProps) {
  const { locale, t } = useLanguage();
  const [demoItems, setDemoItems] = useState<DemoCartItem[]>([]);
  const [backendItems, setBackendItems] = useState(initialBackendItems);
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!hasBackend) {
      setDemoItems(getDemoCart());
      const handleUpdate = () => setDemoItems(getDemoCart());
      window.addEventListener("hct_cart_updated", handleUpdate);
      return () => window.removeEventListener("hct_cart_updated", handleUpdate);
    }
  }, [hasBackend]);

  const items: DemoCartItem[] = hasBackend
    ? backendItems.map((bi) => ({
        id: bi.product_id,
        productId: bi.product_id,
        name: bi.products?.name ?? "Sản phẩm",
        nameEn: undefined,
        image: bi.products?.poster_url ?? "/placeholder-product.svg",
        priceVnd: bi.unit_price_vnd,
        quantity: bi.quantity,
        village: "Hà Nội",
      }))
    : demoItems;

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.priceVnd,
    0,
  );

  const handleRemove = async (productId: string) => {
    if (!hasBackend) {
      removeFromDemoCart(productId);
      return;
    }
    setBusyProduct(productId);
    setError(null);
    const response = await fetch("/api/cart", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const result = (await response.json()) as { error?: string };
    if (response.ok) {
      setBackendItems((current) =>
        current.filter((item) => item.product_id !== productId),
      );
    } else {
      setError(result.error ?? "Không thể xóa sản phẩm khỏi giỏ.");
    }
    setBusyProduct(null);
  };

  const changeQuantity = async (productId: string, quantity: number) => {
    if (!hasBackend || quantity < 1) return;
    setBusyProduct(productId);
    setError(null);
    const response = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    const result = (await response.json()) as { error?: string };
    if (response.ok) {
      setBackendItems((current) =>
        current.map((item) =>
          item.product_id === productId ? { ...item, quantity } : item,
        ),
      );
    } else {
      setError(result.error ?? "Không thể cập nhật số lượng.");
    }
    setBusyProduct(null);
  };

  const handleClear = () => {
    if (!hasBackend) {
      clearDemoCart();
    }
  };

  return (
    <section className="shell page-hero">
      <span className="eyebrow">{t.cart.eyebrow}</span>
      <h1>{t.cart.title}</h1>

      {!hasBackend && (
        <div className="demo-banner" style={{ marginTop: 16 }}>
          <strong>
            {locale === "vi"
              ? "CHẾ ĐỘ TRẢI NGHIỆM THỬ"
              : "INTERACTIVE DEMO MODE"}
          </strong>{" "}
          — {t.cart.demoNote}
        </div>
      )}
      {error ? (
        <div className="error-banner" style={{ marginTop: 16 }}>
          {error}
        </div>
      ) : null}

      {mounted && items.length > 0 ? (
        <div className="panel" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((item) => {
              const displayName =
                locale === "en" && item.nameEn ? item.nameEn : item.name;
              return (
                <div
                  className="cart-item-row"
                  key={item.productId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 14,
                    borderBottom: "1px solid var(--line)",
                    gap: 16,
                  }}
                >
                  <div
                    className="cart-item-main"
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    {item.image && (
                      <div
                        style={{
                          position: "relative",
                          width: 56,
                          height: 56,
                          borderRadius: 10,
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          src={item.image}
                          alt={displayName}
                          fill
                          sizes="56px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    )}
                    <div>
                      <strong style={{ fontSize: "1.05rem" }}>
                        {displayName}
                      </strong>
                      {item.customNote && (
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--leaf)",
                            fontStyle: "italic",
                            marginTop: 2,
                          }}
                        >
                          ✦ {item.customNote}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        {formatVnd(item.priceVnd)} × {item.quantity}
                      </div>
                    </div>
                  </div>

                  <div
                    className="cart-item-actions"
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    {hasBackend ? (
                      <div
                        className="cart-quantity"
                        aria-label={`Số lượng ${displayName}`}
                      >
                        <button
                          type="button"
                          disabled={
                            busyProduct === item.productId || item.quantity <= 1
                          }
                          onClick={() =>
                            void changeQuantity(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                        >
                          <Minus size={15} />
                        </button>
                        <strong>{item.quantity}</strong>
                        <button
                          type="button"
                          disabled={
                            busyProduct === item.productId ||
                            item.quantity >= 99
                          }
                          onClick={() =>
                            void changeQuantity(
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    ) : null}
                    <strong style={{ fontSize: "1.1rem" }}>
                      {formatVnd(item.quantity * item.priceVnd)}
                    </strong>
                    <button
                      type="button"
                      disabled={busyProduct === item.productId}
                      onClick={() => void handleRemove(item.productId)}
                      aria-label="Remove item"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--terracotta)",
                        padding: 6,
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="cart-summary-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 20,
              paddingTop: 14,
              borderTop: "2px solid var(--line)",
            }}
          >
            <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {t.cart.total}
            </span>
            <strong style={{ fontSize: "1.35rem", color: "var(--terracotta)" }}>
              {formatVnd(total)}
            </strong>
          </div>

          <div
            className="cart-footer-actions"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 24,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {!hasBackend && (
              <button
                type="button"
                className="button secondary small"
                onClick={handleClear}
              >
                {t.cart.clearCart}
              </button>
            )}
            <Link
              href="/checkout"
              className="button terracotta"
              style={{ minWidth: 200 }}
            >
              {t.cart.proceedCheckout} →
            </Link>
          </div>
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 30 }}>
          <p>{t.cart.empty}</p>
          <Link
            href="/marketplace"
            className="button secondary"
            style={{ marginTop: 12 }}
          >
            {t.cart.exploreMarketplace}
          </Link>
        </div>
      )}
    </section>
  );
}

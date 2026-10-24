"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { addToDemoCart } from "@/lib/cart-store";
import type { ProductCard } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";

export function AddToCart({
  product,
  productId,
  isDemo = false,
  disabled = false
}: {
  product?: ProductCard;
  productId?: string;
  isDemo?: boolean;
  disabled?: boolean;
}) {
  const { locale, t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const targetId = product?.id ?? productId ?? "";

  async function submit() {
    setStatus("busy");
    setMessage("");

    if (isDemo && product) {
      try {
        addToDemoCart({
          productId: product.id,
          name: product.name,
          nameEn: product.nameEn,
          image: product.image,
          priceVnd: product.priceVnd,
          quantity,
          village: product.village
        });
        setStatus("done");
        setMessage(t.product.addedNotice);
      } catch {
        setStatus("error");
        setMessage(locale === "vi" ? "Không thể thêm vào giỏ hàng." : "Could not update cart.");
      }
      return;
    }

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: targetId, quantity })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not update cart");
      setStatus("done");
      setMessage(t.product.addedNotice);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not update cart");
    }
  }

  return (
    <div>
      <div className="quantity-row">
        <label htmlFor="quantity">{t.product.qty}</label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={20}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
        />
        <button
          className="button"
          onClick={submit}
          disabled={disabled || status === "busy"}
        >
          {status === "done" ? <Check size={17} /> : <ShoppingBag size={17} />}
          {status === "busy" ? t.product.adding : t.product.addToCart}
        </button>
      </div>

      {message ? (
        <div style={{ marginTop: 12 }}>
          <p className="status" role="status" style={{ color: status === "done" ? "var(--leaf)" : "var(--terracotta)", fontWeight: 600 }}>
            {message}
          </p>
          {status === "done" && (
            <Link href="/cart" className="button secondary small" style={{ marginTop: 6, display: "inline-flex" }}>
              {locale === "vi" ? "Xem giỏ hàng →" : "View cart →"}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}

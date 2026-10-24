"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDemoOrders, type DemoOrder } from "@/lib/cart-store";
import { formatVnd } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/context";

interface OrdersViewProps {
  backendOrders?: any[];
  hasBackend?: boolean;
  error?: string | undefined;
}

export function OrdersView({ backendOrders = [], hasBackend = false, error }: OrdersViewProps) {
  const { locale, t } = useLanguage();
  const [demoOrders, setDemoOrders] = useState<DemoOrder[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDemoOrders(getDemoOrders());
    const handleUpdate = () => setDemoOrders(getDemoOrders());
    window.addEventListener("hct_orders_updated", handleUpdate);
    return () => window.removeEventListener("hct_orders_updated", handleUpdate);
  }, []);

  const hasAnyOrders = hasBackend ? backendOrders.length > 0 : demoOrders.length > 0;

  return (
    <section className="shell page-hero">
      <span className="eyebrow">{locale === "vi" ? "Lịch sử mua hàng" : "Purchase history"}</span>
      <h1>{t.orders.title}</h1>
      <p>{t.orders.subtitle}</p>

      {error ? <div className="error-banner">{error}</div> : null}

      {mounted && !hasBackend && (
        <div className="demo-banner" style={{ marginTop: 16 }}>
          <strong>{locale === "vi" ? "ĐƠN HÀNG THỬ NGHIỆM" : "TEST MODE ORDERS"}</strong> — {locale === "vi" ? "Các đơn hàng kiểm thử được ghi nhận trên trình duyệt này." : "Simulated test orders recorded in this session."}
        </div>
      )}

      {mounted && hasAnyOrders ? (
        <div className="grid" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {hasBackend
            ? backendOrders.map((order: any) => (
                <article className="panel" key={order.id}>
                  <div className="card-bottom">
                    <strong>{t.orders.orderId} #{order.id.slice(0, 8)}</strong>
                    <span className="badge">{order.status}</span>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium" }).format(new Date(order.created_at))} · {order.payment_mode === "test" ? (locale === "vi" ? "Thanh toán thử nghiệm" : "Test mode—no charge") : order.payment_mode}
                  </p>
                  {order.order_items.map((item: any) => (
                    <div className="fact" key={item.id}>
                      <span>{item.product_name} × {item.quantity}</span>
                      <strong>{formatVnd(item.quantity * item.unit_price_vnd)}</strong>
                    </div>
                  ))}
                  <div className="fact" style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                    <strong>{t.orders.total}</strong>
                    <strong style={{ color: "var(--terracotta)" }}>{formatVnd(order.subtotal_vnd)}</strong>
                  </div>
                </article>
              ))
            : demoOrders.map((order) => (
                <article className="panel" key={order.id}>
                  <div className="card-bottom" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{t.orders.orderId} #{order.id}</strong>
                    <span className="badge gold">
                      {locale === "vi" ? "Đã ghi nhận thử nghiệm" : "Test submitted"}
                    </span>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))} · {locale === "vi" ? `Người nhận: ${order.recipient} (${order.phone})` : `Recipient: ${order.recipient} (${order.phone})`}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {locale === "vi" ? "Giao tới:" : "Ship to:"} {order.address}, {order.city}
                  </p>
                  {order.items.map((item) => {
                    const itemName = locale === "en" && item.nameEn ? item.nameEn : item.name;
                    return (
                      <div className="fact" key={item.productId}>
                        <span>{itemName} × {item.quantity}</span>
                        <strong>{formatVnd(item.quantity * item.priceVnd)}</strong>
                      </div>
                    );
                  })}
                  <div className="fact" style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                    <strong>{t.orders.total}</strong>
                    <strong style={{ color: "var(--terracotta)", fontSize: "1.15rem" }}>{formatVnd(order.subtotalVnd)}</strong>
                  </div>
                </article>
              ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 30 }}>
          <p>{t.orders.empty}</p>
          <Link href="/marketplace" className="button secondary" style={{ marginTop: 12 }}>
            {t.cart.exploreMarketplace}
          </Link>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  QrCode,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { getDemoOrders, type DemoOrder, addToDemoCart } from "@/lib/cart-store";
import { formatVnd } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/context";

interface OrdersViewProps {
  backendOrders?: any[];
  hasBackend?: boolean;
  error?: string | undefined;
}

export function OrdersView({
  backendOrders = [],
  hasBackend = false,
  error,
}: OrdersViewProps) {
  const { locale, t } = useLanguage();
  const [demoOrders, setDemoOrders] = useState<DemoOrder[]>([]);
  const [mounted, setMounted] = useState(false);
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setDemoOrders(getDemoOrders());
    const handleUpdate = () => setDemoOrders(getDemoOrders());
    window.addEventListener("hct_orders_updated", handleUpdate);
    return () => window.removeEventListener("hct_orders_updated", handleUpdate);
  }, []);

  const hasAnyOrders = hasBackend
    ? backendOrders.length > 0
    : demoOrders.length > 0;

  // Status Filter Tabs
  const statusTabs = [
    { id: "all", label: locale === "vi" ? "Tất cả" : "All" },
    { id: "pending", label: locale === "vi" ? "Chờ xác nhận" : "Pending" },
    { id: "processing", label: locale === "vi" ? "Chờ lấy hàng" : "Processing" },
    { id: "shipping", label: locale === "vi" ? "Đang giao" : "Shipping" },
    { id: "delivered", label: locale === "vi" ? "Hoàn thành" : "Delivered" },
    { id: "cancelled", label: locale === "vi" ? "Đã hủy" : "Cancelled" },
  ];

  const filteredDemoOrders = useMemo(() => {
    return demoOrders.filter((order) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesItem = order.items.some(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.nameEn && i.nameEn.toLowerCase().includes(q)),
        );
        if (!matchesId && !matchesItem) return false;
      }
      return true;
    });
  }, [demoOrders, searchQuery]);

  function handleReorder(order: DemoOrder) {
    order.items.forEach((item) => {
      addToDemoCart({
        productId: item.productId,
        name: item.name,
        nameEn: item.nameEn,
        priceVnd: item.priceVnd,
        image: item.image,
        quantity: item.quantity,
        village: item.village,
        artisan: item.artisan,
      });
    });
    alert(
      locale === "vi"
        ? "Đã thêm lại các sản phẩm vào giỏ hàng!"
        : "Re-added items to cart!",
    );
  }

  return (
    <section className="shell page-hero buyer-orders-page">
      <span className="eyebrow">
        {locale === "vi" ? "Đơn mua của tôi" : "My Orders"}
      </span>
      <h1>{t.orders.title}</h1>
      <p>{t.orders.subtitle}</p>

      {error ? <div className="error-banner">{error}</div> : null}

      {/* Shopee-Style Order Tabs */}
      <div className="buyer-orders-tab-bar" style={{ marginTop: 24 }}>
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`buyer-order-tab ${selectedStatusTab === tab.id ? "active" : ""}`}
            onClick={() => setSelectedStatusTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order Search Box */}
      <div className="buyer-order-search-wrap" style={{ marginTop: 16 }}>
        <Search size={16} />
        <input
          type="search"
          placeholder={
            locale === "vi"
              ? "Tìm kiếm theo Tên Shop, ID Đơn hàng hoặc Tên sản phẩm..."
              : "Search by Shop name, Order ID, or Product name..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {mounted && hasAnyOrders ? (
        <div
          className="grid"
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {hasBackend
            ? backendOrders.map((order: any) => {
                const artisanNote =
                  order.shipping_address?.artisan_note ||
                  order.shipping_address?.note ||
                  order.artisan_note;
                const shipping = order.shipping_address;

                return (
                  <article className="panel buyer-order-card" key={order.id}>
                    <div className="buyer-order-card-header">
                      <div className="shop-badge">
                        <ShoppingBag size={16} />
                        <strong>Xưởng Gốm Bát Tràng</strong>
                      </div>
                      <span className="buyer-order-status-pill success">
                        {order.status}
                      </span>
                    </div>

                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.85rem",
                        margin: "8px 0 12px",
                      }}
                    >
                      {t.orders.orderId} #{order.id.slice(0, 8)} ·{" "}
                      {new Intl.DateTimeFormat(
                        locale === "vi" ? "vi-VN" : "en-GB",
                        { dateStyle: "medium" },
                      ).format(new Date(order.created_at))}
                    </p>

                    <div className="buyer-order-items-list">
                      {order.order_items.map((item: any) => (
                        <div className="buyer-order-item-row" key={item.id}>
                          <div className="item-text">
                            <strong>{item.product_name}</strong>
                            <small>Số lượng: × {item.quantity}</small>
                            {item.personalization && (
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: "0.8rem",
                                  color: "var(--terracotta)",
                                  background: "var(--paper)",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  border: "1px dashed var(--gold)",
                                  display: "inline-block",
                                }}
                              >
                                <strong>✨ {locale === "vi" ? "Khắc chữ:" : "Engraved:"}</strong> &ldquo;{item.personalization.text}&rdquo;
                              </div>
                            )}
                          </div>
                          <strong className="item-price">
                            {formatVnd(item.quantity * item.unit_price_vnd)}
                          </strong>
                        </div>
                      ))}
                    </div>

                    {artisanNote && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: "linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(180, 83, 9, 0.04) 100%)",
                          border: "1px dashed var(--gold, #d97706)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: "var(--terracotta, #c2410c)",
                            fontWeight: 600,
                            fontSize: "0.84rem",
                          }}
                        >
                          <Sparkles size={14} />
                          <span>{locale === "vi" ? "Yêu cầu chế tác cho Nghệ nhân:" : "Artisan crafting request:"}</span>
                        </div>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "0.92rem",
                            fontStyle: "italic",
                            color: "var(--ink, #1f2937)",
                            fontWeight: 500,
                          }}
                        >
                          &ldquo;{artisanNote}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="buyer-order-card-footer">
                      {shipping && (
                        <div className="delivery-info">
                          <Truck size={15} />
                          <span>
                            {locale === "vi" ? "Giao tới:" : "Ship to:"}{" "}
                            {shipping.recipient_name} ({shipping.phone}) · {shipping.address_line}, {shipping.city}
                          </span>
                        </div>
                      )}
                      <div className="total-display">
                        <span>{t.orders.total}:</span>
                        <strong className="total-vnd">
                          {formatVnd(order.subtotal_vnd)}
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })
            : filteredDemoOrders.map((order) => (
                <article className="panel buyer-order-card" key={order.id}>
                  <div className="buyer-order-card-header">
                    <div className="shop-badge">
                      <ShoppingBag size={16} />
                      <strong>Xưởng Nghệ Nhân Bát Tràng</strong>
                    </div>
                    <span className="buyer-order-status-pill gold">
                      <CheckCircle2 size={14} />
                      {locale === "vi"
                        ? "Đã đặt hàng thành công"
                        : "Order Confirmed"}
                    </span>
                  </div>

                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.85rem",
                      margin: "6px 0 12px",
                    }}
                  >
                    {t.orders.orderId} #{order.id} ·{" "}
                    {new Intl.DateTimeFormat(
                      locale === "vi" ? "vi-VN" : "en-GB",
                      { dateStyle: "medium", timeStyle: "short" },
                    ).format(new Date(order.createdAt))}
                  </p>

                  <div className="buyer-order-items-list">
                    {order.items.map((item) => {
                      const itemName =
                        locale === "en" && item.nameEn
                          ? item.nameEn
                          : item.name;
                      return (
                        <div
                          className="buyer-order-item-row"
                          key={item.productId}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image}
                            alt={itemName}
                            className="order-thumb"
                          />
                          <div className="item-text">
                            <strong>{itemName}</strong>
                            <small>
                              {item.village} · Số lượng: × {item.quantity}
                            </small>
                            {item.personalization && (
                              <div
                                className="order-personalization-badge"
                                style={{
                                  marginTop: 6,
                                  padding: "6px 10px",
                                  background: "var(--paper)",
                                  border: "1px dashed var(--gold)",
                                  borderRadius: 6,
                                  fontSize: "0.82rem",
                                }}
                              >
                                <strong style={{ color: "var(--terracotta)" }}>
                                  ✨ {locale === "vi" ? "Khắc chữ cá nhân hóa:" : "Personalized engraving:"}{" "}
                                </strong>
                                <span>&quot;{item.personalization.text}&quot;</span>
                                <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 2 }}>
                                  {locale === "vi" ? "Hoàn thiện:" : "Finish:"}{" "}
                                  {{ ink: "Chữ men / Ink", gold: "Dát vàng / Gold", recessed: "Khắc chìm / Recessed", raised: "Khắc nổi / Raised" }[item.personalization.finish] || item.personalization.finish} · {item.personalization.fontSizeMm}mm
                                </div>
                                {item.personalization.previewDataUrl && (
                                  <img
                                    src={item.personalization.previewDataUrl}
                                    alt="Bản xem trước cá nhân hóa"
                                    style={{
                                      width: 64,
                                      height: 64,
                                      objectFit: "contain",
                                      marginTop: 4,
                                      borderRadius: 4,
                                      border: "1px solid var(--line)",
                                      background: "#fff",
                                    }}
                                  />
                                )}
                              </div>
                            )}
                            <Link
                              href="/trace/CT-BTG-NVA-2026-0085"
                              className="order-passport-link"
                            >
                              <QrCode size={13} />
                              <span>
                                {locale === "vi"
                                  ? "Xem Hộ chiếu số tác phẩm"
                                  : "View Digital Passport"}
                              </span>
                            </Link>
                          </div>
                          <strong className="item-price">
                            {formatVnd(item.quantity * item.priceVnd)}
                          </strong>
                        </div>
                      );
                    })}
                  </div>

                  {order.artisanNote && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(180, 83, 9, 0.04) 100%)",
                        border: "1px dashed var(--gold, #d97706)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--terracotta, #c2410c)",
                          fontWeight: 600,
                          fontSize: "0.84rem",
                        }}
                      >
                        <Sparkles size={14} />
                        <span>{locale === "vi" ? "Yêu cầu chế tác cho Nghệ nhân:" : "Artisan crafting request:"}</span>
                      </div>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "0.92rem",
                          fontStyle: "italic",
                          color: "var(--ink, #1f2937)",
                          fontWeight: 500,
                        }}
                      >
                        &ldquo;{order.artisanNote}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Order Footer & Actions */}
                  <div className="buyer-order-card-footer">
                    <div className="delivery-info">
                      <Truck size={15} />
                      <span>
                        {locale === "vi" ? "Giao tới:" : "Ship to:"}{" "}
                        {order.recipient} ({order.phone}) · {order.address},{" "}
                        {order.city}
                      </span>
                    </div>

                    <div className="total-and-actions">
                      <div className="total-display">
                        <span>{t.orders.total}:</span>
                        <strong className="total-vnd">
                          {formatVnd(order.subtotalVnd)}
                        </strong>
                      </div>

                      <div className="order-action-buttons">
                        <button
                          type="button"
                          className="button terracotta small"
                          onClick={() => handleReorder(order)}
                        >
                          <RotateCcw size={14} />
                          {locale === "vi" ? "Mua lại" : "Buy again"}
                        </button>
                        <Link
                          href="/trace/CT-BTG-NVA-2026-0085"
                          className="button secondary small"
                        >
                          <QrCode size={14} />
                          {locale === "vi"
                            ? "Hộ chiếu di sản"
                            : "Digital Passport"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 30 }}>
          <p>{t.orders.empty}</p>
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

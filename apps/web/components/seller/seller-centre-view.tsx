"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Boxes,
  Eye,
  FileCheck2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { SellerHeader } from "./seller-header";
import { SellerSidebar } from "./seller-sidebar";
import {
  Seller3DStudio,
  type SellerProduct,
} from "@/components/seller-3d-studio";
import { formatVnd } from "@/lib/format";
import type { AppRole } from "@/lib/authz";
import type { SellerOrderRecord } from "@/app/seller/page";

interface SellerCentreViewProps {
  artisanName: string;
  roles: AppRole[];
  initialProducts: SellerProduct[];
  initialOrders?: SellerOrderRecord[];
  initialError?: string | undefined;
}

function parseShippingInfo(shippingAddress: unknown) {
  if (!shippingAddress) return { addressText: "Địa chỉ mặc định", recipientName: "", phone: "", artisanNote: "" };
  let obj: any = shippingAddress;
  if (typeof shippingAddress === "string") {
    try {
      obj = JSON.parse(shippingAddress);
    } catch {
      return { addressText: shippingAddress, recipientName: "", phone: "", artisanNote: "" };
    }
  }
  if (typeof obj !== "object" || obj === null) {
    return { addressText: String(shippingAddress), recipientName: "", phone: "", artisanNote: "" };
  }
  const parts: string[] = [];
  if (obj.recipient_name) parts.push(obj.recipient_name);
  if (obj.phone) parts.push(obj.phone);
  if (obj.address_line) parts.push(obj.address_line);
  if (obj.city) parts.push(obj.city);

  return {
    addressText: parts.length > 0 ? parts.join(" • ") : "Địa chỉ mặc định",
    recipientName: obj.recipient_name || "",
    phone: obj.phone || "",
    artisanNote: (obj.artisan_note || obj.note || "").trim(),
  };
}

export function SellerCentreView({
  artisanName,
  roles,
  initialProducts,
  initialOrders = [],
  initialError,
}: SellerCentreViewProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<SellerProduct[]>(initialProducts);
  const [orders, setOrders] = useState<SellerOrderRecord[]>(initialOrders);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Vouchers state - editable by seller
  const [vouchers, setVouchers] = useState([
    {
      code: "BATTRANG50",
      discount: "50.000 ₫",
      minOrder: "500.000 ₫",
      used: 0,
      limit: 100,
      status: "Đang kích hoạt",
    },
  ]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (productFilter === "active" && p.status !== "active") return false;
      if (productFilter === "draft" && p.status !== "draft") return false;
      if (productFilter === "3d_ready" && p.model_status !== "ready") return false;
      if (productSearch.trim()) {
        const query = productSearch.toLowerCase();
        if (!p.name.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [products, productFilter, productSearch]);

  // Real KPI statistics computed from actual database records
  const stats = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const totalRevenue = validOrders.reduce((sum, o) => {
      const itemsSum = o.seller_items?.reduce((isum, it) => isum + Number(it.line_total_vnd || 0), 0);
      return sum + (itemsSum || Number(o.subtotal_vnd || 0));
    }, 0);

    const pendingOrders = orders.filter((o) => o.status === "placed").length;
    const processingOrders = orders.filter((o) => o.status === "processing").length;
    const fulfilledOrders = orders.filter((o) => o.status === "fulfilled").length;
    const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

    const availableBalance = orders
      .filter((o) => o.status === "fulfilled")
      .reduce((sum, o) => {
        const itemsSum = o.seller_items?.reduce((isum, it) => isum + Number(it.line_total_vnd || 0), 0);
        return sum + (itemsSum || Number(o.subtotal_vnd || 0));
      }, 0);

    const holdingBalance = orders
      .filter((o) => o.status === "processing" || o.status === "placed")
      .reduce((sum, o) => {
        const itemsSum = o.seller_items?.reduce((isum, it) => isum + Number(it.line_total_vnd || 0), 0);
        return sum + (itemsSum || Number(o.subtotal_vnd || 0));
      }, 0);

    return {
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      processingOrders,
      fulfilledOrders,
      cancelledOrders,
      availableBalance,
      holdingBalance,
      activeProductsCount: products.filter((p) => p.status === "active").length,
      ready3DCount: products.filter((p) => p.model_status === "ready").length,
    };
  }, [orders, products]);

  async function handleUpdateOrderStatus(orderId: string, nextStatus: string) {
    setOrderActionLoading(orderId);
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật trạng thái đơn hàng.");
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
      );
      setFeedbackMsg({
        type: "success",
        text: `Đơn hàng #${orderId.slice(0, 8).toUpperCase()} đã chuyển sang trạng thái "${
          nextStatus === "processing"
            ? "Đang đóng gói"
            : nextStatus === "fulfilled"
            ? "Đã giao bưu cục"
            : nextStatus
        }".`,
      });
    } catch (err: unknown) {
      setFeedbackMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi khi xử lý đơn hàng.",
      });
    } finally {
      setOrderActionLoading(null);
    }
  }

  return (
    <div className="seller-portal-layout">
      {/* SELLER HEADER */}
      <SellerHeader
        artisanName={artisanName}
        roles={roles}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onToggleMobileMenu={() => setMobileMenuOpen(true)}
      />

      <div className="seller-body-container">
        {/* SELLER SIDEBAR */}
        <SellerSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          orderCount={orders.length}
          pendingOrderCount={stats.pendingOrders + stats.processingOrders}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* SELLER MAIN WORKSPACE */}
        <main className="seller-main-viewport">
          <nav className="portal-mobile-actions" aria-label="Sản phẩm nghệ nhân">
            <button type="button" className="button secondary" onClick={() => setActiveTab("products")}>
              Sản phẩm ({products.length})
            </button>
            <button type="button" className="button" onClick={() => setActiveTab("new-product")}>
              Đăng sản phẩm & tạo 3D
            </button>
          </nav>

          {feedbackMsg && (
            <div className={`seller-alert-box ${feedbackMsg.type === "success" ? "success" : "error"}`} style={{ marginBottom: 16 }}>
              {feedbackMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {initialError && (
            <div className="seller-alert-box error">
              <AlertCircle size={18} />
              <span>{initialError}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD (BẢNG ĐIỀU KHIỂN CHÍNH) */}
          {activeTab === "dashboard" && (
            <div className="seller-view-fade">
              {/* To-Do List (Việc Cần Làm) */}
              <div className="seller-card todo-card">
                <div className="seller-card-header">
                  <div>
                    <h3>Danh Sách Cần Làm</h3>
                    <p className="card-subtitle">
                      Những việc bạn cần xử lý ngay để phục vụ người mua tốt nhất
                    </p>
                  </div>
                </div>

                <div className="seller-todo-grid">
                  <button
                    type="button"
                    className="todo-box"
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className={`todo-count ${stats.pendingOrders > 0 ? "highlight" : ""}`}>
                      {stats.pendingOrders}
                    </span>
                    <span className="todo-label">Chờ Xác Nhận</span>
                  </button>

                  <button
                    type="button"
                    className="todo-box"
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className="todo-count">
                      {stats.processingOrders}
                    </span>
                    <span className="todo-label">Chờ Lấy Hàng</span>
                  </button>

                  <button
                    type="button"
                    className="todo-box"
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className="todo-count">
                      {stats.fulfilledOrders}
                    </span>
                    <span className="todo-label">Đang Vận Chuyển / Hoàn Tất</span>
                  </button>

                  <button
                    type="button"
                    className="todo-box"
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className="todo-count">{stats.cancelledOrders}</span>
                    <span className="todo-label">Đơn Hủy / Trả Hàng</span>
                  </button>
                </div>
              </div>

              {/* Business Analytics Cards */}
              <div className="seller-metrics-grid">
                <div className="seller-metric-card">
                  <div className="metric-header">
                    <span>Tổng Doanh Thu Gian Hàng</span>
                    <TrendingUp size={18} className="metric-trend up" />
                  </div>
                  <strong className="metric-value">{formatVnd(stats.totalRevenue)}</strong>
                  <span className="metric-delta positive">
                    {stats.totalOrders > 0
                      ? `${stats.totalOrders} đơn hàng phát sinh`
                      : "Chưa phát sinh giao dịch"}
                  </span>
                </div>

                <div className="seller-metric-card">
                  <div className="metric-header">
                    <span>Tổng Đơn Hàng</span>
                    <Package size={18} />
                  </div>
                  <strong className="metric-value">{stats.totalOrders} đơn</strong>
                  <span className="metric-delta positive">
                    {stats.pendingOrders + stats.processingOrders} đơn cần hoàn tất
                  </span>
                </div>

                <div className="seller-metric-card">
                  <div className="metric-header">
                    <span>Sản Phẩm Đang Bán</span>
                    <Boxes size={18} />
                  </div>
                  <strong className="metric-value">{stats.activeProductsCount} tác phẩm</strong>
                  <span className="metric-delta positive">
                    {products.length} tổng số sản phẩm đã đăng
                  </span>
                </div>

                <div className="seller-metric-card">
                  <div className="metric-header">
                    <span>Mô Hình 3D / AR Sẵn Sàng</span>
                    <Sparkles size={18} />
                  </div>
                  <strong className="metric-value">{stats.ready3DCount} hiện vật</strong>
                  <span className="metric-delta positive">Đã đồng bộ Studio 3D</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="seller-quick-actions">
                <button
                  type="button"
                  className="quick-action-btn primary"
                  onClick={() => setActiveTab("new-product")}
                >
                  <Plus size={18} />
                  <span>Đăng Sản Phẩm Mới</span>
                </button>

                <button
                  type="button"
                  className="quick-action-btn secondary"
                  onClick={() => setActiveTab("studio-3d")}
                >
                  <Sparkles size={18} />
                  <span>Mở Studio 3D & AI Scan</span>
                </button>

                <button
                  type="button"
                  className="quick-action-btn secondary"
                  onClick={() => setActiveTab("marketing")}
                >
                  <Tag size={18} />
                  <span>Tạo Mã Giảm Giá</span>
                </button>
              </div>

              {/* Recent Orders Overview */}
              <div className="seller-card" style={{ marginTop: 20 }}>
                <div className="seller-card-header">
                  <div>
                    <h3>Đơn Hàng Gần Đây Của Shop</h3>
                    <p className="card-subtitle">Theo dõi và cập nhật trạng thái đóng gói giao hàng thực tế</p>
                  </div>
                  {orders.length > 0 && (
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => setActiveTab("orders")}
                    >
                      Xem tất cả ({orders.length} đơn)
                    </button>
                  )}
                </div>

                <div className="seller-table-wrap">
                  {orders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                      <Package size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                      <p>Chưa có đơn hàng nào phát sinh cho gian hàng này.</p>
                      <small>Khi khách hàng đặt mua các tác phẩm gốm sứ của bạn, đơn hàng sẽ hiển thị tại đây.</small>
                    </div>
                  ) : (
                    <table className="seller-table">
                      <thead>
                        <tr>
                          <th>Mã Đơn</th>
                          <th>Thời Gian</th>
                          <th>Địa Chỉ Giao Hàng</th>
                          <th>Sản Phẩm</th>
                          <th>Tổng Tiền</th>
                          <th>Trạng Thái</th>
                          <th>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((o) => {
                          const shipInfo = parseShippingInfo(o.shipping_address);
                          const itemsSummary = o.seller_items?.length
                            ? o.seller_items.map((it) => `${it.product_name} × ${it.quantity}`).join(", ")
                            : "Sản phẩm thủ công";
                          const totalVal = o.seller_items?.reduce((s, it) => s + Number(it.line_total_vnd || 0), 0) || Number(o.subtotal_vnd || 0);

                          return (
                            <tr key={o.id}>
                              <td><strong>#{o.id.slice(0, 8).toUpperCase()}</strong></td>
                              <td><small>{new Date(o.created_at).toLocaleString("vi-VN")}</small></td>
                              <td>
                                <div style={{ maxWidth: 220, fontSize: "0.85rem", lineHeight: 1.35 }}>
                                  <div>{shipInfo.addressText}</div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div>{itemsSummary}</div>
                                  {o.seller_items?.map((it) => {
                                    const pText = it.personalization?.text;
                                    const pFinish = it.personalization?.finish;
                                    if (!pText) return null;
                                    return (
                                      <div
                                        key={it.id}
                                        style={{
                                          fontSize: "0.78rem",
                                          background: "rgba(217, 119, 6, 0.1)",
                                          color: "#b45309",
                                          padding: "3px 8px",
                                          borderRadius: 4,
                                          border: "1px dashed rgba(217, 119, 6, 0.4)",
                                          display: "inline-block",
                                          width: "fit-content",
                                        }}
                                      >
                                        ✍️ Khắc tên: <strong>&ldquo;{pText}&rdquo;</strong> {pFinish ? `(${pFinish})` : ""}
                                      </div>
                                    );
                                  })}
                                  {shipInfo.artisanNote && (
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        background: "rgba(180, 83, 9, 0.12)",
                                        color: "#92400e",
                                        padding: "6px 10px",
                                        borderRadius: 6,
                                        border: "1px solid rgba(217, 119, 6, 0.4)",
                                        fontWeight: 500,
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      💌 <strong>Yêu cầu chế tác:</strong> &ldquo;{shipInfo.artisanNote}&rdquo;
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td><strong className="text-terracotta">{formatVnd(totalVal)}</strong></td>
                              <td>
                                {o.status === "placed" && <span className="seller-status-pill warning">Chờ xác nhận</span>}
                                {o.status === "processing" && <span className="seller-status-pill info">Đang đóng gói</span>}
                                {o.status === "fulfilled" && <span className="seller-status-pill success">Đã giao / Hoàn thành</span>}
                                {o.status === "cancelled" && <span className="seller-status-pill danger">Đã hủy</span>}
                              </td>
                              <td>
                                {o.status === "placed" && (
                                  <button
                                    type="button"
                                    className="button small terracotta"
                                    disabled={orderActionLoading === o.id}
                                    onClick={() => handleUpdateOrderStatus(o.id, "processing")}
                                  >
                                    {orderActionLoading === o.id ? "Đang xử lý..." : "Xác nhận đóng gói"}
                                  </button>
                                )}
                                {o.status === "processing" && (
                                  <button
                                    type="button"
                                    className="button small secondary"
                                    disabled={orderActionLoading === o.id}
                                    onClick={() => handleUpdateOrderStatus(o.id, "fulfilled")}
                                  >
                                    {orderActionLoading === o.id ? "Đang xử lý..." : "Giao bưu cục"}
                                  </button>
                                )}
                                {o.status === "fulfilled" && <CheckCircle2 size={18} color="#059669" />}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUẢN LÝ SẢN PHẨM & CRUD */}
          {activeTab === "products" && (
            <div className="seller-view-fade">
              <div className="seller-card">
                <div className="seller-card-header">
                  <div>
                    <h2>Quản Lý Sản Phẩm Gian Hàng</h2>
                    <p className="card-subtitle">
                      Danh sách gốm sứ thủ công đang bán, kiểm soát kho và quản lý mô hình 3D AR
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button terracotta"
                    onClick={() => setActiveTab("studio-3d")}
                  >
                    <Plus size={16} /> Thêm Sản Phẩm 3D
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="seller-filter-strip">
                  <div className="seller-filter-tabs">
                    <button
                      type="button"
                      className={`filter-tab ${productFilter === "all" ? "active" : ""}`}
                      onClick={() => setProductFilter("all")}
                    >
                      Tất cả ({products.length})
                    </button>
                    <button
                      type="button"
                      className={`filter-tab ${productFilter === "active" ? "active" : ""}`}
                      onClick={() => setProductFilter("active")}
                    >
                      Đang bán ({products.filter((p) => p.status === "active").length})
                    </button>
                    <button
                      type="button"
                      className={`filter-tab ${productFilter === "3d_ready" ? "active" : ""}`}
                      onClick={() => setProductFilter("3d_ready")}
                    >
                      Có mô hình 3D ({products.filter((p) => p.model_status === "ready").length})
                    </button>
                  </div>

                  <div className="seller-search-box">
                    <Search size={16} />
                    <input
                      type="search"
                      placeholder="Tìm theo tên sản phẩm..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Products Table */}
                <div className="seller-table-wrap">
                  <table className="seller-table">
                    <thead>
                      <tr>
                        <th>Sản Phẩm</th>
                        <th>Giá Bán</th>
                        <th>Kho</th>
                        <th>Trạng Thái</th>
                        <th>Mô Hình 3D / AR</th>
                        <th>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="product-table-item">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={p.poster_url ?? "/placeholder-product.svg"}
                                  alt={p.name}
                                  className="table-thumb"
                                />
                                <div>
                                  <strong>{p.name}</strong>
                                  <br />
                                  <small className="text-muted">Mã: {p.slug}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong>{formatVnd(p.price_vnd)}</strong>
                            </td>
                            <td>
                              <span className={p.stock_quantity > 0 ? "stock-ok" : "stock-empty"}>
                                {p.stock_quantity > 0 ? `${p.stock_quantity} cái` : "Hết hàng"}
                              </span>
                            </td>
                            <td>
                              {p.status === "active" ? (
                                <span className="seller-status-pill success">Đang bán</span>
                              ) : (
                                <span className="seller-status-pill warning">Chờ duyệt / Nháp</span>
                              )}
                            </td>
                            <td>
                              {p.model_status === "ready" ? (
                                <span className="seller-status-pill success">
                                  <Sparkles size={12} /> Sẵn sàng
                                </span>
                              ) : p.model_status === "processing" ? (
                                <span className="seller-status-pill info">
                                  <RefreshCw size={12} className="spin" /> Đang tạo
                                </span>
                              ) : (
                                <span className="seller-status-pill neutral">Chưa có 3D</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className="button small secondary"
                                  onClick={() => setActiveTab("studio-3d")}
                                >
                                  Mở Studio
                                </button>
                                <Link
                                  href={`/product/${p.slug}`}
                                  target="_blank"
                                  className="button small ghost"
                                  title="Xem trên sàn"
                                >
                                  <Eye size={14} />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                            Chưa có sản phẩm nào phù hợp điều kiện lọc.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STUDIO 3D & AI SCAN PIPELINE */}
          {(activeTab === "studio-3d" || activeTab === "new-product") && (
            <div className="seller-view-fade">
              <div className="seller-studio-embedded">
                <Seller3DStudio
                  onProductsChange={setProducts}
                  artisanName={artisanName}
                  roles={roles}
                  initialProducts={products}
                  initialError={initialError}
                />
              </div>
            </div>
          )}

          {/* TAB 4: QUẢN LÝ ĐƠN HÀNG */}
          {(activeTab === "orders" || activeTab === "orders-todo" || activeTab === "orders-returns") && (
            <div className="seller-view-fade">
              <div className="seller-card">
                <div className="seller-card-header">
                  <div>
                    <h2>Quản Lý Đơn Hàng Của Shop ({orders.length})</h2>
                    <p className="card-subtitle">
                      Xác nhận đơn, in phiếu gửi gốm sứ chống vỡ và phối hợp với đơn vị vận chuyển
                    </p>
                  </div>
                </div>

                <div className="seller-table-wrap">
                  {orders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
                      <Package size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                      <h3>Chưa có đơn hàng nào</h3>
                      <p>Tất cả đơn hàng phát sinh từ sàn thương mại điện tử sẽ xuất hiện tại đây.</p>
                    </div>
                  ) : (
                    <table className="seller-table">
                      <thead>
                        <tr>
                          <th>Mã Đơn Hàng</th>
                          <th>Ngày Đặt</th>
                          <th>Địa Chỉ Nhận</th>
                          <th>Chi Tiết Tác Phẩm</th>
                          <th>Tổng Giá Trị</th>
                          <th>Thanh Toán</th>
                          <th>Trạng Thái</th>
                          <th>Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const shipInfo = parseShippingInfo(o.shipping_address);
                          const itemsSummary = o.seller_items?.length
                            ? o.seller_items.map((it) => `${it.product_name} × ${it.quantity}`).join(", ")
                            : "Sản phẩm thủ công";
                          const totalVal = o.seller_items?.reduce((s, it) => s + Number(it.line_total_vnd || 0), 0) || Number(o.subtotal_vnd || 0);

                          return (
                            <tr key={o.id}>
                              <td><strong>#{o.id.slice(0, 8).toUpperCase()}</strong></td>
                              <td><small>{new Date(o.created_at).toLocaleString("vi-VN")}</small></td>
                              <td>
                                <div style={{ maxWidth: 220, fontSize: "0.85rem", lineHeight: 1.35 }}>
                                  <div>{shipInfo.addressText}</div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div>{itemsSummary}</div>
                                  {o.seller_items?.map((it) => {
                                    const pText = it.personalization?.text;
                                    const pFinish = it.personalization?.finish;
                                    if (!pText) return null;
                                    return (
                                      <div
                                        key={it.id}
                                        style={{
                                          fontSize: "0.78rem",
                                          background: "rgba(217, 119, 6, 0.1)",
                                          color: "#b45309",
                                          padding: "3px 8px",
                                          borderRadius: 4,
                                          border: "1px dashed rgba(217, 119, 6, 0.4)",
                                          display: "inline-block",
                                          width: "fit-content",
                                        }}
                                      >
                                        ✍️ Khắc tên: <strong>&ldquo;{pText}&rdquo;</strong> {pFinish ? `(${pFinish})` : ""}
                                      </div>
                                    );
                                  })}
                                  {shipInfo.artisanNote && (
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        background: "rgba(180, 83, 9, 0.12)",
                                        color: "#92400e",
                                        padding: "6px 10px",
                                        borderRadius: 6,
                                        border: "1px solid rgba(217, 119, 6, 0.4)",
                                        fontWeight: 500,
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      💌 <strong>Yêu cầu chế tác:</strong> &ldquo;{shipInfo.artisanNote}&rdquo;
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td><strong className="text-terracotta">{formatVnd(totalVal)}</strong></td>
                              <td><span className="badge">{o.payment_mode === "cod" ? "COD Khi nhận" : "Chuyển khoản"}</span></td>
                              <td>
                                {o.status === "placed" && <span className="seller-status-pill warning">Chờ xác nhận</span>}
                                {o.status === "processing" && <span className="seller-status-pill info">Đang đóng gói</span>}
                                {o.status === "fulfilled" && <span className="seller-status-pill success">Hoàn thành / Đang giao</span>}
                                {o.status === "cancelled" && <span className="seller-status-pill danger">Đã hủy</span>}
                              </td>
                              <td>
                                {o.status === "placed" && (
                                  <button
                                    type="button"
                                    className="button small terracotta"
                                    disabled={orderActionLoading === o.id}
                                    onClick={() => handleUpdateOrderStatus(o.id, "processing")}
                                  >
                                    {orderActionLoading === o.id ? "Đang lưu..." : "Xác nhận đơn"}
                                  </button>
                                )}
                                {o.status === "processing" && (
                                  <button
                                    type="button"
                                    className="button small secondary"
                                    disabled={orderActionLoading === o.id}
                                    onClick={() => handleUpdateOrderStatus(o.id, "fulfilled")}
                                  >
                                    {orderActionLoading === o.id ? "Đang lưu..." : "Giao bưu cục"}
                                  </button>
                                )}
                                {o.status === "fulfilled" && (
                                  <span style={{ color: "#059669", fontSize: "0.85rem", fontWeight: 600 }}>
                                    ✓ Đã xử lý
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VẬN CHUYỂN & CÀI ĐẶT ĐÓNG GÓI */}
          {activeTab === "shipping" && (
            <div className="seller-view-fade">
              <div className="seller-card">
                <div className="seller-card-header">
                  <div>
                    <h2>Cài Đặt Vận Chuyển Gốm Sứ Chuyên Dụng</h2>
                    <p className="card-subtitle">
                      Quy chuẩn bảo vệ sản phẩm dễ vỡ khi xuất xưởng từ làng nghề Bát Tràng
                    </p>
                  </div>
                </div>

                <div className="shipping-guideline-box">
                  <Truck size={24} style={{ color: "var(--terracotta)" }} />
                  <div>
                    <strong>Quy chuẩn bọc chống sốc 3 lớp Hanoi CraftTrust</strong>
                    <p>
                      Mọi sản phẩm gốm sứ gửi qua sàn bắt buộc bọc xốp khí nổ 3 lớp, chèn mút xốp đệm góc hộp carton 5 lớp để được bảo hiểm vỡ hỏng 100% từ sàn.
                    </p>
                  </div>
                </div>

                <div className="seller-carrier-list">
                  <div className="carrier-item active">
                    <div className="carrier-info">
                      <strong>ViettelPost Fragile (Chuyên vận chuyển đồ dễ vỡ)</strong>
                      <p>Lấy hàng tận xưởng Bát Tràng · Đền bù 100% nếu nứt vỡ trong quá trình di chuyển</p>
                    </div>
                    <span className="badge success">Đang kích hoạt</span>
                  </div>

                  <div className="carrier-item active">
                    <div className="carrier-info">
                      <strong>VNPost Tiết Kiệm & Nhanh</strong>
                      <p>Mạng lưới phủ kín 63 tỉnh thành · Hỗ trợ đồng kiểm khi nhận hàng</p>
                    </div>
                    <span className="badge success">Đang kích hoạt</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: KÊNH MARKETING & VOUCHER */}
          {activeTab === "marketing" && (
            <div className="seller-view-fade">
              <div className="seller-card">
                <div className="seller-card-header">
                  <div>
                    <h2>Kênh Khuyến Mãi Của Shop</h2>
                    <p className="card-subtitle">Tạo mã giảm giá để kích cầu người mua khám phá gốm sứ</p>
                  </div>
                  <button
                    type="button"
                    className="button terracotta small"
                    onClick={() => {
                      const code = window.prompt("Nhập mã giảm giá mới (VD: BATTRANG20):");
                      if (code) {
                        setVouchers((prev) => [
                          ...prev,
                          {
                            code: code.trim().toUpperCase(),
                            discount: "20.000 ₫",
                            minOrder: "300.000 ₫",
                            used: 0,
                            limit: 50,
                            status: "Đang kích hoạt",
                          },
                        ]);
                      }
                    }}
                  >
                    <Plus size={16} /> Tạo Voucher Mới
                  </button>
                </div>

                <div className="seller-table-wrap">
                  <table className="seller-table">
                    <thead>
                      <tr>
                        <th>Mã Voucher</th>
                        <th>Mức Giảm</th>
                        <th>Đơn Tối Thiểu</th>
                        <th>Đã Dùng / Giới Hạn</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((v) => (
                        <tr key={v.code}>
                          <td><strong>{v.code}</strong></td>
                          <td><strong className="text-terracotta">{v.discount}</strong></td>
                          <td>{v.minOrder}</td>
                          <td>{v.used} / {v.limit}</td>
                          <td><span className="seller-status-pill success">{v.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: TÀI CHÍNH & VÍ */}
          {activeTab === "finance" && (
            <div className="seller-view-fade">
              <div className="seller-card">
                <div className="seller-card-header">
                  <div>
                    <h2>Tài Chính & Doanh Thu Gian Hàng</h2>
                    <p className="card-subtitle">Theo dõi dòng tiền bán hàng thực tế từ cơ sở dữ liệu đơn hàng</p>
                  </div>
                </div>

                <div className="seller-finance-cards">
                  <div className="finance-box primary">
                    <span>Số Dư Khả Dụng (Đã hoàn thành giao hàng)</span>
                    <strong>{formatVnd(stats.availableBalance)}</strong>
                    <button
                      type="button"
                      className="button terracotta small"
                      style={{ marginTop: 12 }}
                      disabled={stats.availableBalance <= 0}
                      onClick={() => alert(`Yêu cầu đối soát ${formatVnd(stats.availableBalance)} đã được gửi đến Ban Quản Trị.`)}
                    >
                      <Wallet size={16} /> Rút Tiền Về Ngân Hàng
                    </button>
                  </div>

                  <div className="finance-box">
                    <span>Doanh Thu Tạm Giữ (Đang xử lý / giao hàng)</span>
                    <strong>{formatVnd(stats.holdingBalance)}</strong>
                    <small>Sẽ giải ngân vào số dư khả dụng sau khi đơn hàng được giao thành công.</small>
                  </div>

                  <div className="finance-box">
                    <span>Tổng Doanh Thu Lũy Kế</span>
                    <strong>{formatVnd(stats.totalRevenue)}</strong>
                    <small>Dữ liệu đồng bộ trực tiếp từ các đơn hàng thực tế của xưởng.</small>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

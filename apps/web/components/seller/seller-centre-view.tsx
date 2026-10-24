"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
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

interface SellerCentreViewProps {
  artisanName: string;
  roles: AppRole[];
  initialProducts: SellerProduct[];
  initialError?: string | undefined;
}

export function SellerCentreView({
  artisanName,
  roles,
  initialProducts,
  initialError,
}: SellerCentreViewProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [products, setProducts] = useState<SellerProduct[]>(initialProducts);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");

  // Orders State
  const [orders, setOrders] = useState([
    {
      id: "CT-8291",
      date: "24/10/2026 18:42",
      customer: "Lê Minh Tuấn",
      phone: "0912***456",
      items: "Bộ ấm chén gốm men tro trăng Bát Tràng × 1",
      totalVnd: 1850000,
      status: "pending", // pending, processing, shipping, completed
      shippingUnit: "ViettelPost Gốm Sứ",
    },
    {
      id: "CT-8288",
      date: "24/10/2026 15:20",
      customer: "Nguyễn Thị Mai",
      phone: "0988***789",
      items: "Bình hoa gốm men lam vẽ sen Bát Tràng × 1",
      totalVnd: 1350000,
      status: "processing",
      shippingUnit: "VNPost Fragile",
    },
    {
      id: "CT-8275",
      date: "23/10/2026 11:05",
      customer: "Trần Bảo Nam",
      phone: "0904***112",
      items: "Bộ chén trà gốm men hỏa biến Bát Tràng × 2",
      totalVnd: 2400000,
      status: "shipping",
      shippingUnit: "GHTK Gốm Sứ",
    },
    {
      id: "CT-8260",
      date: "22/10/2026 09:30",
      customer: "Hoàng Đức Anh",
      phone: "0977***334",
      items: "Bộ ấm chén gốm men tro trăng Bát Tràng × 1",
      totalVnd: 1850000,
      status: "completed",
      shippingUnit: "VNPost Fragile",
    },
  ]);

  // Vouchers state
  const [vouchers, setVouchers] = useState([
    {
      code: "BATTRANG50",
      discount: "50.000 ₫",
      minOrder: "500.000 ₫",
      used: 28,
      limit: 100,
      status: "Đang diễn ra",
    },
    {
      code: "TINHHOAGOM100",
      discount: "100.000 ₫",
      minOrder: "1.500.000 ₫",
      used: 14,
      limit: 50,
      status: "Đang diễn ra",
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

  function handleUpdateOrderStatus(orderId: string, nextStatus: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
    );
  }

  return (
    <div className="seller-portal-layout">
      {/* SELLER HEADER */}
      <SellerHeader
        artisanName={artisanName}
        roles={roles}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <div className="seller-body-container">
        {/* SELLER SIDEBAR */}
        <SellerSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* SELLER MAIN WORKSPACE */}
        <main className="seller-main-viewport">
          <nav className="portal-mobile-actions" aria-label="Sản phẩm nghệ nhân">
            <button type="button" className="button secondary" onClick={() => setActiveTab("products")}>Sản phẩm của tôi</button>
            <button type="button" className="button" onClick={() => setActiveTab("new-product")}>Đăng sản phẩm & tạo 3D</button>
          </nav>
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
                    <p className="card-subtitle">Những việc bạn cần xử lý ngay để phục vụ người mua tốt nhất</p>
                  </div>
                </div>

                <div className="seller-todo-grid">
                  <button
                    type="button"
                    className="todo-box"
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className="todo-count highlight">
                      {orders.filter((o) => o.status === "pending").length}
                    </span>
                    <span className="todo-label">Chờ Xác Nhận</span>
                  </button>

                  <button
                    type="button"
                    className="todo-box"
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className="todo-count">
                      {orders.filter((o) => o.status === "processing").length}
                    </span>
                    <span className="todo-label">Chờ Lấy Hàng</span>
                  </button>

                  <button
                    type="button"
                    className="todo-box"
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className="todo-count">
                      {orders.filter((o) => o.status === "shipping").length}
                    </span>
                    <span className="todo-label">Đang Vận Chuyển</span>
                  </button>

                  <button
                    type="button"
                    className="todo-box"
                    onClick={() => setActiveTab("orders")}
                  >
                    <span className="todo-count">0</span>
                    <span className="todo-label">Đơn Hủy / Trả Hàng</span>
                  </button>
                </div>
              </div>

              {/* Business Analytics Cards */}
              <div className="seller-metrics-grid">
                <div className="seller-metric-card">
                  <div className="metric-header">
                    <span>Doanh Thu Hôm Nay</span>
                    <TrendingUp size={18} className="metric-trend up" />
                  </div>
                  <strong className="metric-value">32.500.000 ₫</strong>
                  <span className="metric-delta positive">+18.4% so với hôm qua</span>
                </div>

                <div className="seller-metric-card">
                  <div className="metric-header">
                    <span>Đơn Hàng Hôm Nay</span>
                    <Package size={18} />
                  </div>
                  <strong className="metric-value">18 đơn</strong>
                  <span className="metric-delta positive">+4 đơn so với hôm qua</span>
                </div>

                <div className="seller-metric-card">
                  <div className="metric-header">
                    <span>Lượt Xem Gian Hàng</span>
                    <Eye size={18} />
                  </div>
                  <strong className="metric-value">1.420 lượt</strong>
                  <span className="metric-delta positive">+12.5% tuần này</span>
                </div>

                <div className="seller-metric-card">
                  <div className="metric-header">
                    <span>Tỷ Lệ Chuyển Đổi</span>
                    <TrendingUp size={18} />
                  </div>
                  <strong className="metric-value">3.8%</strong>
                  <span className="metric-delta positive">Đạt chuẩn sàn cao cấp</span>
                </div>
              </div>

              {/* Quick Actions Strip */}
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
                  className="quick-action-btn studio"
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
                    <p className="card-subtitle">Theo dõi và cập nhật trạng thái đóng gói giao hàng</p>
                  </div>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => setActiveTab("orders")}
                  >
                    Xem tất cả đơn
                  </button>
                </div>

                <div className="seller-table-wrap">
                  <table className="seller-table">
                    <thead>
                      <tr>
                        <th>Mã Đơn</th>
                        <th>Thời Gian</th>
                        <th>Khách Hàng</th>
                        <th>Sản Phẩm</th>
                        <th>Tổng Tiền</th>
                        <th>Trạng Thái</th>
                        <th>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 3).map((o) => (
                        <tr key={o.id}>
                          <td><strong>#{o.id}</strong></td>
                          <td><small>{o.date}</small></td>
                          <td>
                            <strong>{o.customer}</strong>
                            <br /><small>{o.phone}</small>
                          </td>
                          <td>{o.items}</td>
                          <td><strong className="text-terracotta">{formatVnd(o.totalVnd)}</strong></td>
                          <td>
                            {o.status === "pending" && <span className="seller-status-pill warning">Chờ xác nhận</span>}
                            {o.status === "processing" && <span className="seller-status-pill info">Đang đóng gói</span>}
                            {o.status === "shipping" && <span className="seller-status-pill accent">Đang giao</span>}
                            {o.status === "completed" && <span className="seller-status-pill success">Hoàn thành</span>}
                          </td>
                          <td>
                            {o.status === "pending" && (
                              <button
                                type="button"
                                className="button small terracotta"
                                onClick={() => handleUpdateOrderStatus(o.id, "processing")}
                              >
                                Xác nhận
                              </button>
                            )}
                            {o.status === "processing" && (
                              <button
                                type="button"
                                className="button small secondary"
                                onClick={() => handleUpdateOrderStatus(o.id, "shipping")}
                              >
                                Giao bưu cục
                              </button>
                            )}
                            {o.status === "shipping" && <small>Đang trên đường giao</small>}
                            {o.status === "completed" && <CheckCircle2 size={18} color="green" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                              <span className={p.stock_quantity < 3 ? "text-danger" : ""}>
                                {p.stock_quantity} cái
                              </span>
                            </td>
                            <td>
                              {p.status === "active" ? (
                                <span className="seller-status-pill success">Đang bán</span>
                              ) : (
                                <span className="seller-status-pill draft">Lưu nháp</span>
                              )}
                            </td>
                            <td>
                              {p.model_status === "ready" ? (
                                <span className="seller-status-pill gold">
                                  <Sparkles size={12} /> 3D Sẵn Sàng
                                </span>
                              ) : p.model_status === "processing" ? (
                                <span className="seller-status-pill info">
                                  <RefreshCw size={12} className="spin" /> Đang tạo 3D
                                </span>
                              ) : (
                                <span className="seller-status-pill default">Chưa có 3D</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className="button secondary small"
                                  onClick={() => setActiveTab("studio-3d")}
                                  title="Chỉnh sửa chi tiết trong Studio 3D"
                                >
                                  Sửa 3D
                                </button>
                                <Link
                                  href={`/products/${p.slug}`}
                                  target="_blank"
                                  className="button secondary small"
                                  title="Xem trên sàn người mua"
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
                    <h2>Quản Lý Đơn Hàng Của Shop</h2>
                    <p className="card-subtitle">
                      Xác nhận đơn, in phiếu gửi gốm sứ chống vỡ và phối hợp với đơn vị vận chuyển
                    </p>
                  </div>
                </div>

                <div className="seller-table-wrap">
                  <table className="seller-table">
                    <thead>
                      <tr>
                        <th>Mã Đơn Hàng</th>
                        <th>Ngày Đặt</th>
                        <th>Thông Tin Người Nhận</th>
                        <th>Chi Tiết Tác Phẩm</th>
                        <th>Tổng Giá Trị</th>
                        <th>Đơn Vị Vận Chuyển</th>
                        <th>Trạng Thái</th>
                        <th>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td><strong>#{o.id}</strong></td>
                          <td><small>{o.date}</small></td>
                          <td>
                            <strong>{o.customer}</strong>
                            <br /><small>{o.phone}</small>
                          </td>
                          <td>{o.items}</td>
                          <td><strong className="text-terracotta">{formatVnd(o.totalVnd)}</strong></td>
                          <td><span className="badge">{o.shippingUnit}</span></td>
                          <td>
                            {o.status === "pending" && <span className="seller-status-pill warning">Chờ xác nhận</span>}
                            {o.status === "processing" && <span className="seller-status-pill info">Đang đóng gói</span>}
                            {o.status === "shipping" && <span className="seller-status-pill accent">Đang giao</span>}
                            {o.status === "completed" && <span className="seller-status-pill success">Hoàn thành</span>}
                          </td>
                          <td>
                            {o.status === "pending" && (
                              <button
                                type="button"
                                className="button small terracotta"
                                onClick={() => handleUpdateOrderStatus(o.id, "processing")}
                              >
                                Xác nhận đơn
                              </button>
                            )}
                            {o.status === "processing" && (
                              <button
                                type="button"
                                className="button small secondary"
                                onClick={() => handleUpdateOrderStatus(o.id, "shipping")}
                              >
                                Giao ĐVVC
                              </button>
                            )}
                            {o.status === "shipping" && (
                              <button
                                type="button"
                                className="button small secondary"
                                onClick={() => handleUpdateOrderStatus(o.id, "completed")}
                              >
                                Hoàn thành
                              </button>
                            )}
                            {o.status === "completed" && (
                              <span style={{ color: "green", fontSize: "0.85rem" }}>Đã đối soát</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    <strong>Quy chuẩn bọc chống sốc 3 lớp Hanoi Craft-Trust</strong>
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
                      const code = window.prompt("Nhập mã giảm giá mới (VD: TRIANKHACH50):");
                      if (code) {
                        setVouchers((prev) => [
                          ...prev,
                          {
                            code: code.toUpperCase(),
                            discount: "50.000 ₫",
                            minOrder: "600.000 ₫",
                            used: 0,
                            limit: 50,
                            status: "Đang diễn ra",
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
                    <p className="card-subtitle">Theo dõi dòng tiền bán hàng và lệnh rút tiền về tài khoản ngân hàng</p>
                  </div>
                </div>

                <div className="seller-finance-cards">
                  <div className="finance-box primary">
                    <span>Số Dư Khả Dụng (Có thể rút ngay)</span>
                    <strong>48.650.000 ₫</strong>
                    <button
                      type="button"
                      className="button terracotta small"
                      style={{ marginTop: 12 }}
                      onClick={() => alert("Yêu cầu rút tiền 48.650.000 ₫ về tài khoản BIDV Bát Tràng đã được gửi.")}
                    >
                      <Wallet size={16} /> Rút Tiền Về Ngân Hàng
                    </button>
                  </div>

                  <div className="finance-box">
                    <span>Doanh Thu Tạm Giữ (Đang giao hàng)</span>
                    <strong>5.600.000 ₫</strong>
                    <small>Sẽ giải ngân sau khi khách hàng xác nhận nhận hàng thành công</small>
                  </div>

                  <div className="finance-box">
                    <span>Tài Khoản Nhận Tiền Mặc Định</span>
                    <strong>BIDV - CN Gia Lâm</strong>
                    <small>Số TK: 1241000****** · Tên: {artisanName.toUpperCase()}</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: HỒ SƠ XƯỞNG & CHỨNG NHẬN HỘ CHIẾU SỐ */}
          {(activeTab === "shop-profile" || activeTab === "passport-badge") && (
            <div className="seller-view-fade">
              <div className="seller-card">
                <div className="seller-card-header">
                  <div>
                    <h2>Hồ Sơ Xưởng Nghề & Chứng Nhận Hộ Chiếu Số</h2>
                    <p className="card-subtitle">
                      Thông tin giới thiệu xưởng gốm và chứng nhận di sản được bảo chứng bởi Cổng Thẩm Định
                    </p>
                  </div>
                </div>

                <div className="shop-profile-grid">
                  <div className="profile-section">
                    <h4>Thông Tin Xưởng Gốm</h4>
                    <div className="fact">
                      <span>Tên xưởng:</span>
                      <strong>Xưởng gốm nghệ nhân {artisanName}</strong>
                    </div>
                    <div className="fact">
                      <span>Làng nghề:</span>
                      <strong>Làng gốm Bát Tràng, Gia Lâm, Hà Nội</strong>
                    </div>
                    <div className="fact">
                      <span>Năm thành lập:</span>
                      <strong>Truyền thống đời thứ 4 (từ năm 1982)</strong>
                    </div>
                    <div className="fact">
                      <span>Dòng men chủ đạo:</span>
                      <strong>Men tro trăng, Men rạn cổ, Men lam vẽ tay</strong>
                    </div>
                  </div>

                  <div className="profile-section highlight">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <FileCheck2 size={24} style={{ color: "var(--gold)" }} />
                      <h4>Chứng Nhận Hộ Chiếu Di Sản Số (Digital Passport)</h4>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: "8px 0 12px" }}>
                      Gian hàng của bạn đã được Verifier phê duyệt hồ sơ minh chứng xuất xứ đất sông Hồng và kỹ thuật nung củi truyền thống.
                    </p>
                    <div className="badge gold" style={{ fontSize: "0.95rem", padding: "8px 14px" }}>
                      ✨ Hạng Bảo Chứng: GOLD PASSPORT (Hạng Vàng)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: PHÂN TÍCH */}
          {activeTab === "analytics" && (
            <div className="seller-view-fade">
              <div className="seller-card">
                <div className="seller-card-header">
                  <div>
                    <h2>Phân Tích Hiệu Quả Bán Hàng</h2>
                    <p className="card-subtitle">Thống kê lưu lượng truy cập và hành vi khách hàng xem 3D</p>
                  </div>
                </div>
                <div className="analytics-summary-box">
                  <div className="metric">
                    <strong>74%</strong>
                    <span>Khách hàng xoay thử mô hình 3D trước khi quyết định đặt mua</span>
                  </div>
                  <div className="metric">
                    <strong>4.9 / 5.0 ⭐</strong>
                    <span>Đánh giá độ hoàn thiện men gốm và đóng gói chống vỡ</span>
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

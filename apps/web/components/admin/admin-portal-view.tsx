"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  PackageCheck,
  RotateCcw,
  Scale,
  Sparkles,
  Store,
  Truck,
  Users,
  Box,
} from "lucide-react";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { AdminExperiences } from "./admin-experiences";
import { Admin3DManager } from "./admin-3d-manager";
import { ReviewEvidence } from "@/components/review-evidence";
import { formatVnd } from "@/lib/format";
import type { AppRole } from "@/lib/authz";

interface AdminPortalViewProps {
  roles: AppRole[];
  initialEvidence: any[];
  initialProducts?: any[];
  initialMerchants?: any[];
  initialOrders?: any[];
  initialAuditLogs?: any[];
  initialVillages?: any[];
  initialStats?: {
    totalBuyers: number;
    totalMerchants: number;
    totalProducts: number;
    activeProducts: number;
    pendingProducts: number;
    totalOrders: number;
    totalGmvVnd: number;
    totalPassports: number;
    total3DModels: number;
  };
  initialError?: string | undefined;
}

export function AdminPortalView({
  roles = ["admin", "verifier"],
  initialEvidence = [],
  initialProducts = [],
  initialMerchants = [],
  initialOrders = [],
  initialAuditLogs = [],
  initialVillages = [],
  initialStats,
  initialError,
}: AdminPortalViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [evidenceList] = useState<any[]>(initialEvidence);
  const [productsList, setProductsList] = useState<any[]>(initialProducts);
  const [merchantsList, setMerchantsList] = useState<any[]>(initialMerchants);
  const [ordersList, setOrdersList] = useState<any[]>(initialOrders);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const stats = initialStats || {
    totalBuyers: 0,
    totalMerchants: merchantsList.length,
    totalProducts: productsList.length,
    activeProducts: productsList.filter((p) => p.status === "active").length,
    pendingProducts: productsList.filter((p) => p.status === "draft").length,
    totalOrders: ordersList.length,
    totalGmvVnd: ordersList.reduce((sum, o) => sum + Number(o.subtotal_vnd || 0), 0),
    totalPassports: 1,
    total3DModels: 1,
  };

  // Toggle Merchant Publish Status
  async function toggleMerchantStatus(id: string, currentStatus: boolean) {
    try {
      const res = await fetch("/api/admin/merchants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artisanId: id, isPublished: !currentStatus }),
      });
      if (res.ok) {
        setMerchantsList((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_published: !currentStatus, status: !currentStatus ? "active" : "pending_verification" } : m))
        );
        setActionMessage(`Đã cập nhật trạng thái xưởng: ${!currentStatus ? "Hoạt động" : "Tạm ngưng"}`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      alert("Không thể cập nhật xưởng: " + err.message);
    }
  }

  // Moderate Product Status
  async function handleProductStatus(productId: string, newStatus: "active" | "draft" | "archived") {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, status: newStatus }),
      });
      if (res.ok) {
        setProductsList((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p))
        );
        setActionMessage(`Đã cập nhật trạng thái sản phẩm sang: ${newStatus === "active" ? "Mở bán chính thức" : "Lưu nháp"}`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      alert("Không thể cập nhật sản phẩm: " + err.message);
    }
  }

  // Update Order Status
  async function handleOrderStatus(orderId: string, newStatus: string) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setOrdersList((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        setActionMessage(`Đã chuyển trạng thái đơn hàng #${orderId.slice(0, 8)} sang: ${newStatus}`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      alert("Không thể cập nhật đơn hàng: " + err.message);
    }
  }

  return (
    <div className="admin-portal-layout">
      {/* ADMIN HEADER */}
      <AdminHeader
        roles={roles}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={evidenceList.length}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="admin-body-container">
        {/* ADMIN SIDEBAR */}
        <AdminSidebar
          canManageExperiences={roles.includes("admin")}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingCount={evidenceList.length}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* ADMIN MAIN VIEWPORT */}
        <main className="admin-main-viewport">
          {actionMessage && (
            <div style={{ marginBottom: 16, padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} />
              <span>{actionMessage}</span>
            </div>
          )}

          {roles.includes("admin") && (
            <nav className="portal-mobile-actions" aria-label="Quản lý trải nghiệm">
              <button type="button" className={`button ${activeTab === "overview" ? "terracotta" : "secondary"}`} onClick={() => setActiveTab("overview")}>
                Tổng quan
              </button>
              <button type="button" className={`button ${activeTab === "products-audit" ? "terracotta" : "secondary"}`} onClick={() => setActiveTab("products-audit")}>
                Sản phẩm & 3D
              </button>
              <button type="button" className={`button ${activeTab === "platform-orders" ? "terracotta" : "secondary"}`} onClick={() => setActiveTab("platform-orders")}>
                Đơn hàng ({ordersList.length})
              </button>
            </nav>
          )}

          {activeTab === "experiences" && roles.includes("admin") && <AdminExperiences />}
          {initialError && (
            <div className="admin-alert-box error" style={{ marginBottom: 16, padding: 12, background: "#fef2f2", color: "#b91c1c", borderRadius: 8 }}>
              <AlertCircle size={18} />
              <span>{initialError}</span>
            </div>
          )}

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && (
            <div className="admin-view-fade">
              {/* Real Database KPI Grid */}
              <div className="admin-metrics-grid">
                <div className="admin-metric-card primary">
                  <span className="metric-tag">TỔNG GMV TOÀN SÀN</span>
                  <strong className="metric-num">{formatVnd(stats.totalGmvVnd)}</strong>
                  <span className="metric-sub">{ordersList.length} đơn hàng thực tế từ cơ sở dữ liệu</span>
                </div>

                <div className="admin-metric-card">
                  <span className="metric-tag">GIAN HÀNG NGHỆ NHÂN</span>
                  <strong className="metric-num">{merchantsList.length} xưởng</strong>
                  <span className="metric-sub">Bát Tràng, Vạn Phúc, Chàng Sơn</span>
                </div>

                <div className="admin-metric-card warning">
                  <span className="metric-tag">HỒ SƠ CHỜ THẨM ĐỊNH</span>
                  <strong className="metric-num text-warning">{evidenceList.length} hồ sơ</strong>
                  <span className="metric-sub">Cần Verifier thẩm định cấp hộ chiếu</span>
                </div>

                <div className="admin-metric-card gold">
                  <span className="metric-tag">HỘ CHIẾU DI SẢN SỐ</span>
                  <strong className="metric-num text-gold">{stats.totalPassports} hộ chiếu</strong>
                  <span className="metric-sub">Đã cấp tem QR & mã số độc bản</span>
                </div>

                <div className="admin-metric-card">
                  <span className="metric-tag">QUỸ BẢO TỒN NGHỀ (5% GMV)</span>
                  <strong className="metric-num">{formatVnd(Math.round(stats.totalGmvVnd * 0.05))}</strong>
                  <span className="metric-sub">Hỗ trợ đào tạo thợ trẻ làng nghề</span>
                </div>
              </div>

              {/* Real Village Breakdown & Audit Logs */}
              <div className="admin-split-cards" style={{ marginTop: 24 }}>
                <div className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h3>Cụm Làng Nghề Truyền Thống Hà Nội</h3>
                      <p className="card-sub">Dữ liệu địa lý và xưởng nghề đăng ký trong hệ thống</p>
                    </div>
                  </div>

                  <div className="village-breakdown-list">
                    {initialVillages.length > 0 ? (
                      initialVillages.map((v: any) => (
                        <div key={v.id} className="village-bar-item">
                          <div className="bar-labels">
                            <strong>🏺 {v.name} ({v.district})</strong>
                            <span>{v.artisans?.length || 1} xưởng nghề</span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: "80%", background: "var(--terracotta, #c85a32)" }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="admin-empty-state">
                        <p>Đang tải dữ liệu làng nghề...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit shortcut */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h3>Nhật Ký Thao Tác Hệ Thống</h3>
                      <p className="card-sub">Nhật ký bất biến ghi nhận quyết định thẩm định & cấp tem</p>
                    </div>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => setActiveTab("audit-logs")}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  <div className="admin-log-mini-list">
                    {initialAuditLogs.length > 0 ? (
                      initialAuditLogs.slice(0, 4).map((log: any) => (
                        <div key={log.id} className="log-mini-item">
                          <div className="log-dot" />
                          <div>
                            <strong>{log.action} · {log.entity_type}</strong>
                            <p>{new Date(log.created_at).toLocaleString("vi-VN")}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: "center", color: "#64748b", padding: 20 }}>
                        <p>Chưa có sự kiện kiểm toán mới.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THẨM ĐỊNH MINH CHỨNG & CẤP HỘ CHIẾU SỐ */}
          {activeTab === "verification" && (
            <div className="admin-view-fade">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Bàn Thẩm Định Minh Chứng Xuất Xứ (Verification Desk)</h2>
                    <p className="card-sub">
                      Kiểm định tính xác thực của nguồn đất sét, kỹ thuật men cổ, nhiệt độ nung lò củi và gia phả nghệ nhân Bát Tràng
                    </p>
                  </div>
                  <span className="badge gold">
                    <ClipboardCheck size={14} /> Kiểm Định Độc Bản Thủ Công
                  </span>
                </div>

                {evidenceList.length > 0 ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Tác Phẩm / Hộ Chiếu</th>
                          <th>Loại Minh Chứng</th>
                          <th>Lời Giải Trình & Nguồn</th>
                          <th>Tài Liệu / Chứng Từ</th>
                          <th>Quyết Định Kiểm Định</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evidenceList.map((item: any) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.passport_records?.products?.name ?? "Tác phẩm thủ công"}</strong>
                              <br />
                              <small className="mono-code">{item.passport_records?.public_code ?? item.passport_records?.public_id ?? "CT-BTG-NVA-2026-0085"}</small>
                            </td>
                            <td>
                              <span className="admin-badge-type">{item.evidence_type}</span>
                            </td>
                            <td>
                              <p className="evidence-statement" style={{ margin: 0, fontSize: "0.85rem" }}>{item.statement}</p>
                            </td>
                            <td>
                              <strong>{item.heritage_sources?.title ?? "Hồ sơ xưởng cung cấp"}</strong>
                              <br />
                              <small>{item.heritage_sources?.approval_status ?? "Chờ thẩm tra"}</small>
                            </td>
                            <td>
                              <ReviewEvidence evidenceId={item.id} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <CheckCircle2 size={40} style={{ color: "#2e7d32", margin: "0 auto 12px" }} />
                    <h3>Không có hồ sơ nào chờ thẩm định</h3>
                    <p>Tất cả minh chứng xuất xứ làng nghề đã được duyệt và cập nhật vào Hộ chiếu số.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: QUẢN TRỊ GIAN HÀNG & NGHỆ NHÂN */}
          {activeTab === "merchants" && (
            <div className="admin-view-fade">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Danh Sách Xưởng Nghề & Nghệ Nhân Toàn Sàn</h2>
                    <p className="card-sub">
                      Xác thực danh tính nghệ nhân ưu tú, quản lý giấy phép gian hàng và giám sát chất lượng sản phẩm
                    </p>
                  </div>
                </div>

                {merchantsList.length > 0 ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Nghệ Nhân / Xưởng Nghề</th>
                          <th>Cụm Làng Nghề</th>
                          <th>Số Tác Phẩm</th>
                          <th>Tuổi Nghề</th>
                          <th>Trạng Thái</th>
                          <th>Thao Tác Quản Trị</th>
                        </tr>
                      </thead>
                      <tbody>
                        {merchantsList.map((m) => (
                          <tr key={m.id}>
                            <td>
                              <strong>{m.name}</strong>
                              <br />
                              <small>{m.bio ? m.bio.slice(0, 50) + "..." : "Xưởng thủ công truyền thống"}</small>
                            </td>
                            <td>{m.villages?.name ? `${m.villages.name} · ${m.villages.district}` : "Hà Nội"}</td>
                            <td>{m.products?.length || 0} tác phẩm</td>
                            <td>{m.years_practicing || 15} năm</td>
                            <td>
                              {m.is_published ? (
                                <span className="seller-status-pill success" style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>Hoạt động</span>
                              ) : (
                                <span className="seller-status-pill warning" style={{ background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>Chờ duyệt</span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`button small ${m.is_published ? "secondary" : "terracotta"}`}
                                onClick={() => toggleMerchantStatus(m.id, Boolean(m.is_published))}
                              >
                                {m.is_published ? "Tạm đình chỉ" : "Duyệt & Mở xưởng"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <Store size={40} style={{ color: "#64748b", margin: "0 auto 12px" }} />
                    <h3>Chưa có hồ sơ gian hàng nào trong hệ thống</h3>
                    <p>Các xưởng nghề khi đăng ký sẽ xuất hiện tại đây để Admin thẩm định.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: KIỂM DUYỆT SẢN PHẨM & 3D MANAGER */}
          {activeTab === "products-audit" && (
            <div className="admin-view-fade">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Kiểm Duyệt Sản Phẩm Toàn Sàn ({productsList.length} tác phẩm)</h2>
                    <p className="card-sub">Phê duyệt niêm yết lên Buyer Marketplace hoặc yêu cầu chỉnh sửa</p>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Tên Tác Phẩm</th>
                        <th>Nghệ Nhân / Xưởng</th>
                        <th>Giá Bán</th>
                        <th>Tồn Kho</th>
                        <th>Mô Hình 3D</th>
                        <th>Trạng Thái Sàn</th>
                        <th>Thao Tác Duyệt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsList.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <br />
                            <small className="mono-code">{p.slug}</small>
                          </td>
                          <td>{p.artisans?.name || "Nghệ nhân Hà Nội"}</td>
                          <td><strong>{formatVnd(p.price_vnd)}</strong></td>
                          <td>{p.stock_quantity} món</td>
                          <td>
                            {p.product_model_assets?.length > 0 ? (
                              <span style={{ color: "#15803d", fontSize: "0.78rem", fontWeight: 700 }}>✦ Đã có Model 3D</span>
                            ) : (
                              <span style={{ color: "#64748b", fontSize: "0.78rem" }}>Chưa có 3D</span>
                            )}
                          </td>
                          <td>
                            {p.status === "active" ? (
                              <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>Đang mở bán</span>
                            ) : (
                              <span style={{ background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>Chờ duyệt (Nháp)</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              {p.status !== "active" ? (
                                <button
                                  type="button"
                                  className="button small terracotta"
                                  onClick={() => handleProductStatus(p.id, "active")}
                                >
                                  Phê duyệt mở bán
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="button small secondary"
                                  onClick={() => handleProductStatus(p.id, "draft")}
                                >
                                  Tạm chuyển nháp
                                </button>
                              )}
                              <Link
                                href={`/products/${p.slug}`}
                                target="_blank"
                                className="button small secondary"
                                title="Xem trang sản phẩm"
                              >
                                <ExternalLink size={13} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3D Model Studio */}
              <div className="admin-card">
                <Admin3DManager />
              </div>
            </div>
          )}

          {/* TAB 5: ĐƠN HÀNG TOÀN SÀN */}
          {(activeTab === "platform-orders" || activeTab === "disputes" || activeTab === "platform-fees") && (
            <div className="admin-view-fade">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Giám Sát Đơn Hàng & Vận Chuyển Toàn Sàn ({ordersList.length} đơn)</h2>
                    <p className="card-sub">
                      Dữ liệu giao dịch thật từ cơ sở dữ liệu Supabase, kiểm soát dòng tiền và trạng thái giao hàng
                    </p>
                  </div>
                </div>

                <div className="escrow-rule-box">
                  <Scale size={24} style={{ color: "#166534", flexShrink: 0 }} />
                  <div>
                    <strong>Cơ chế Quỹ Ký Quỹ Escrow Hanoi CraftTrust</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                      Tiền thanh toán của người mua được tạm giữ trong tài khoản Escrow an toàn. Khoản tiền chỉ được tự động giải ngân cho xưởng nghệ nhân sau khi khách hàng nhận sản phẩm thủ công nguyên vẹn trong vòng 48h.
                    </p>
                  </div>
                </div>

                {ordersList.length > 0 ? (
                  <div className="admin-table-wrap" style={{ marginTop: 20 }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Mã Đơn Sàn</th>
                          <th>Người Mua</th>
                          <th>Tác Phẩm & Số Lượng</th>
                          <th>Giá Trị</th>
                          <th>Trạng Thái</th>
                          <th>Cập Nhật Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersList.map((order: any) => (
                          <tr key={order.id}>
                            <td>
                              <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                              <br />
                              <small>{new Date(order.created_at).toLocaleString("vi-VN")}</small>
                            </td>
                            <td>
                              <strong>{order.profiles?.display_name || order.shipping_address?.recipient_name || "Khách Hàng"}</strong>
                              <br />
                              <small>{order.shipping_address?.phone || "SĐT lưu hồ sơ"}</small>
                            </td>
                            <td>
                              {(order.order_items ?? []).map((it: any) => (
                                <div key={it.id} style={{ fontSize: "0.85rem" }}>
                                  {it.product_name} × <strong>{it.quantity}</strong>
                                </div>
                              ))}
                            </td>
                            <td>
                              <strong style={{ color: "#0c2340", fontSize: "1rem" }}>{formatVnd(order.subtotal_vnd)}</strong>
                            </td>
                            <td>
                              {order.status === "placed" && <span style={{ background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>Chờ xác nhận</span>}
                              {order.status === "processing" && <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>Đang chuẩn bị</span>}
                              {order.status === "fulfilled" && <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>Đã giao hàng</span>}
                              {order.status === "cancelled" && <span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>Đã hủy</span>}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {order.status === "placed" && (
                                  <button
                                    type="button"
                                    className="button small terracotta"
                                    onClick={() => handleOrderStatus(order.id, "processing")}
                                  >
                                    Chuyển xử lý
                                  </button>
                                )}
                                {order.status === "processing" && (
                                  <button
                                    type="button"
                                    className="button small"
                                    style={{ background: "#15803d", color: "#fff" }}
                                    onClick={() => handleOrderStatus(order.id, "fulfilled")}
                                  >
                                    Đã giao hàng
                                  </button>
                                )}
                                {order.status !== "cancelled" && order.status !== "fulfilled" && (
                                  <button
                                    type="button"
                                    className="button small secondary"
                                    onClick={() => handleOrderStatus(order.id, "cancelled")}
                                  >
                                    Hủy đơn
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty-state" style={{ marginTop: 20 }}>
                    <Truck size={40} style={{ color: "#64748b", margin: "0 auto 12px" }} />
                    <h3>Chưa có đơn hàng nào trên toàn sàn</h3>
                    <p>Các giao dịch mua hàng phát sinh từ sàn sẽ hiển thị tại đây.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: NHẬT KÝ KIỂM TOÁN (AUDIT TRAIL) */}
          {(activeTab === "audit-logs" || activeTab === "system-settings") && (
            <div className="admin-view-fade">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Nhật Ký Kiểm Toán Toàn Diện (System Audit Logs)</h2>
                    <p className="card-sub">
                      Lưu vết bất biến mọi thao tác duyệt minh chứng, cấp Hộ chiếu số và điều hành theo chuẩn an toàn
                    </p>
                  </div>
                </div>

                {initialAuditLogs.length > 0 ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Mã Nhật Ký</th>
                          <th>Thời Gian</th>
                          <th>Hành Động</th>
                          <th>Đối Tượng</th>
                          <th>Chi Tiết Dữ Liệu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {initialAuditLogs.map((l: any) => (
                          <tr key={l.id}>
                            <td><span className="mono-code">#{l.id}</span></td>
                            <td><small>{new Date(l.created_at).toLocaleString("vi-VN")}</small></td>
                            <td><span className="badge" style={{ background: "#f1f5f9", color: "#0c2340", fontWeight: 700 }}>{l.action}</span></td>
                            <td><strong>{l.entity_type}</strong></td>
                            <td><small className="mono-code">{JSON.stringify(l.after_data || {})}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <p>Chưa có sự kiện kiểm toán nào được ghi nhận.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

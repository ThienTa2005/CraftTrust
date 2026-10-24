"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Scale,
  Sparkles,
} from "lucide-react";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { AdminExperiences } from "./admin-experiences";
import { Admin3DManager } from "./admin-3d-manager";
import { ReviewEvidence } from "@/components/review-evidence";
import type { AppRole } from "@/lib/authz";

interface AdminPortalViewProps {
  roles: AppRole[];
  initialEvidence: any[];
  initialError?: string | undefined;
}

export function AdminPortalView({
  roles = ["admin", "verifier"],
  initialEvidence = [],
  initialError,
}: AdminPortalViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [evidenceList] = useState<any[]>(initialEvidence);

  // Demo merchants state
  const [merchants, setMerchants] = useState([
    {
      id: "artisan-01",
      name: "Nguyễn Thu Hà",
      workshop: "Xưởng Gốm Thu Hà Bát Tràng",
      village: "Bát Tràng · Gia Lâm",
      productsCount: 12,
      passportTier: "Gold (Vàng)",
      status: "active",
      joinedDate: "15/01/2026",
    },
    {
      id: "artisan-02",
      name: "Trần Ngọc Mai",
      workshop: "Vạn Phúc Silk Studio",
      village: "Vạn Phúc · Hà Đông",
      productsCount: 8,
      passportTier: "Silver (Bạc)",
      status: "active",
      joinedDate: "20/02/2026",
    },
    {
      id: "artisan-03",
      name: "Lê Minh Đức",
      workshop: "Mộc Mỹ Nghệ Chàng Sơn",
      village: "Chàng Sơn · Thạch Thất",
      productsCount: 6,
      passportTier: "Bronze (Đồng)",
      status: "active",
      joinedDate: "10/03/2026",
    },
    {
      id: "artisan-04",
      name: "Phạm Văn Thành",
      workshop: "Gốm Men Hỏa Biến Thành Đạt",
      village: "Bát Tràng · Gia Lâm",
      productsCount: 4,
      passportTier: "Pending Review",
      status: "pending_verification",
      joinedDate: "22/10/2026",
    },
  ]);

  // Demo audit logs
  const auditLogs = [
    {
      id: "LOG-901",
      time: "24/10/2026 19:10:45",
      actor: "Admin (Verifier Desk)",
      action: "DUYỆT MINH CHỨNG",
      target: "Hồ sơ #EV-081 (Đất sét sông Hồng Bát Tràng)",
      result: "Cấp hạng Gold Passport",
    },
    {
      id: "LOG-900",
      time: "24/10/2026 17:35:12",
      actor: "Hệ thống AI 3D Worker",
      action: "TẠO MÔ HÌNH 3D AR",
      target: "Sản phẩm #PR-102 (Bình hoa men lam)",
      result: "Hoàn tất mesh GLB (1.4MB)",
    },
    {
      id: "LOG-899",
      time: "24/10/2026 14:20:00",
      actor: "Admin Điều Hành",
      action: "XÁC MINH NGHỆ NHÂN",
      target: "Gian hàng Xưởng gốm Thu Hà",
      result: "Gán tích xanh Nghệ nhân ưu tú",
    },
  ];

  function toggleMerchantStatus(id: string) {
    setMerchants((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "active" ? "suspended" : "active" }
          : m,
      ),
    );
  }

  return (
    <div className="admin-portal-layout">
      {/* ADMIN HEADER */}
      <AdminHeader
        roles={roles}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={evidenceList.length}
      />

      <div className="admin-body-container">
        {/* ADMIN SIDEBAR */}
        <AdminSidebar
          canManageExperiences={roles.includes("admin")}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingCount={evidenceList.length}
        />

        {/* ADMIN MAIN VIEWPORT */}
        <main className="admin-main-viewport">
          {roles.includes("admin") && (
            <nav className="portal-mobile-actions" aria-label="Quản lý trải nghiệm">
              <button type="button" className="button secondary" onClick={() => setActiveTab("overview")}>Tổng quan</button>
              <button type="button" className="button" onClick={() => setActiveTab("experiences")}>Quản lý Trải nghiệm 3D/VR</button>
            </nav>
          )}
          {activeTab === "experiences" && roles.includes("admin") && <AdminExperiences />}
          {initialError && (
            <div className="admin-alert-box error">
              <AlertCircle size={18} />
              <span>{initialError}</span>
            </div>
          )}

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && (
            <div className="admin-view-fade">
              {/* Executive KPI Grid */}
              <div className="admin-metrics-grid">
                <div className="admin-metric-card primary">
                  <span className="metric-tag">TỔNG GMV TOÀN SÀN</span>
                  <strong className="metric-num">1.840.000.000 ₫</strong>
                  <span className="metric-sub">+24.8% tăng trưởng tháng này</span>
                </div>

                <div className="admin-metric-card">
                  <span className="metric-tag">GIAN HÀNG NGHỆ NHÂN</span>
                  <strong className="metric-num">48 xưởng</strong>
                  <span className="metric-sub">Bát Tràng, Vạn Phúc, Chàng Sơn</span>
                </div>

                <div className="admin-metric-card warning">
                  <span className="metric-tag">HỒ SƠ CHỜ THẨM ĐỊNH</span>
                  <strong className="metric-num text-warning">{evidenceList.length} hồ sơ</strong>
                  <span className="metric-sub">Cần Verifier phê duyệt cấp hộ chiếu</span>
                </div>

                <div className="admin-metric-card gold">
                  <span className="metric-tag">HỘ CHIẾU SỐ ĐÃ PHÁT HÀNH</span>
                  <strong className="metric-num text-gold">312 hộ chiếu</strong>
                  <span className="metric-sub">86 Hạng Vàng · 142 Bạc · 84 Đồng</span>
                </div>

                <div className="admin-metric-card">
                  <span className="metric-tag">QUỸ BẢO TỒN NGHỀ (5% PHÍ)</span>
                  <strong className="metric-num">92.000.000 ₫</strong>
                  <span className="metric-sub">Hỗ trợ đào tạo thợ trẻ làng nghề</span>
                </div>
              </div>

              {/* Village GMV Breakdown & System Logs */}
              <div className="admin-split-cards" style={{ marginTop: 24 }}>
                <div className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h3>Phân Bổ GMV Theo Làng Nghề Hà Nội</h3>
                      <p className="card-sub">Tỷ lệ đóng góp doanh thu của các cụm làng nghề truyền thống</p>
                    </div>
                  </div>

                  <div className="village-breakdown-list">
                    <div className="village-bar-item">
                      <div className="bar-labels">
                        <strong>🏺 Làng Gốm Bát Tràng (Gia Lâm)</strong>
                        <span>68% · 1.251.200.000 ₫</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: "68%", background: "var(--terracotta)" }} />
                      </div>
                    </div>

                    <div className="village-bar-item">
                      <div className="bar-labels">
                        <strong>🧣 Làng Lụa Vạn Phúc (Hà Đông)</strong>
                        <span>22% · 404.800.000 ₫</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: "22%", background: "var(--leaf)" }} />
                      </div>
                    </div>

                    <div className="village-bar-item">
                      <div className="bar-labels">
                        <strong>🪵 Làng Mộc Chàng Sơn (Thạch Thất)</strong>
                        <span>10% · 184.000.000 ₫</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: "10%", background: "var(--gold)" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit shortcut */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h3>Nhật Ký Thẩm Định Gần Đây</h3>
                      <p className="card-sub">Các quyết định cấp chứng nhận và hoạt động hệ thống</p>
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
                    {auditLogs.map((log) => (
                      <div key={log.id} className="log-mini-item">
                        <div className="log-dot" />
                        <div>
                          <strong>{log.action} · {log.target}</strong>
                          <p>{log.actor} — {log.result}</p>
                          <small>{log.time}</small>
                        </div>
                      </div>
                    ))}
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
                              <small className="mono-code">{item.passport_records?.public_id ?? "HCT-BT-PASSPORT"}</small>
                            </td>
                            <td>
                              <span className="admin-badge-type">{item.evidence_type}</span>
                            </td>
                            <td>
                              <p className="evidence-statement">{item.statement}</p>
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
                    <CheckCircle2 size={40} style={{ color: "var(--leaf)" }} />
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

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nghệ Nhân / Xưởng Nghề</th>
                        <th>Cụm Làng Nghề</th>
                        <th>Số Tác Phẩm</th>
                        <th>Hạng Hộ Chiếu</th>
                        <th>Ngày Tham Gia</th>
                        <th>Trạng Thái</th>
                        <th>Thao Tác Quản Trị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merchants.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <strong>{m.name}</strong>
                            <br />
                            <small>{m.workshop}</small>
                          </td>
                          <td>{m.village}</td>
                          <td>{m.productsCount} tác phẩm</td>
                          <td>
                            <span className="badge gold">{m.passportTier}</span>
                          </td>
                          <td><small>{m.joinedDate}</small></td>
                          <td>
                            {m.status === "active" ? (
                              <span className="seller-status-pill success">Hoạt động</span>
                            ) : m.status === "suspended" ? (
                              <span className="seller-status-pill draft">Tạm ngưng</span>
                            ) : (
                              <span className="seller-status-pill warning">Chờ duyệt</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`button small ${m.status === "active" ? "secondary" : "terracotta"}`}
                              onClick={() => toggleMerchantStatus(m.id)}
                            >
                              {m.status === "active" ? "Tạm đình chỉ" : "Kích hoạt gian"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUẢN LÝ & KIỂM ĐỊNH MÔ HÌNH 3D/AR */}
          {activeTab === "products-audit" && (
            <div className="admin-view-fade">
              <div className="admin-card">
                <Admin3DManager />
              </div>
            </div>
          )}

          {/* TAB 5: ĐƠN HÀNG TOÀN SÀN & TRANH CHẤP */}
          {(activeTab === "platform-orders" || activeTab === "disputes" || activeTab === "platform-fees") && (
            <div className="admin-view-fade">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Giám Sát Dòng Tiền & Escrow Toàn Sàn</h2>
                    <p className="card-sub">
                      Cơ chế bảo hiểm chống vỡ và trung gian thanh toán bảo vệ cả người mua và nghệ nhân làng nghề
                    </p>
                  </div>
                </div>

                <div className="escrow-rule-box">
                  <Scale size={24} style={{ color: "var(--indigo)" }} />
                  <div>
                    <strong>Cơ chế Quỹ Ký Quỹ Escrow Hanoi Craft-Trust</strong>
                    <p>
                      Tiền thanh toán của người mua được tạm giữ trong tài khoản Escrow an toàn. Khoản tiền chỉ được tự động giải ngân cho xưởng nghệ nhân sau khi khách hàng nhận gốm nguyên vẹn trong vòng 48h.
                    </p>
                  </div>
                </div>

                <div className="admin-table-wrap" style={{ marginTop: 20 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Mã Đơn Sàn</th>
                        <th>Người Mua</th>
                        <th>Gian Hàng Thực Hiện</th>
                        <th>Giá Trị</th>
                        <th>Trạng Thái Escrow</th>
                        <th>Bảo Hiểm Vỡ Hỏng</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>#CT-8291</strong></td>
                        <td>Lê Minh Tuấn</td>
                        <td>Xưởng Gốm Thu Hà</td>
                        <td><strong>1.850.000 ₫</strong></td>
                        <td><span className="badge warning">Tạm giữ Escrow</span></td>
                        <td><span className="badge success">Có bảo hiểm</span></td>
                      </tr>
                      <tr>
                        <td><strong>#CT-8275</strong></td>
                        <td>Trần Bảo Nam</td>
                        <td>Xưởng Gốm Thu Hà</td>
                        <td><strong>2.400.000 ₫</strong></td>
                        <td><span className="badge info">Đang vận chuyển</span></td>
                        <td><span className="badge success">Có bảo hiểm</span></td>
                      </tr>
                      <tr>
                        <td><strong>#CT-8260</strong></td>
                        <td>Hoàng Đức Anh</td>
                        <td>Xưởng Gốm Thu Hà</td>
                        <td><strong>1.850.000 ₫</strong></td>
                        <td><span className="badge success">Đã giải ngân cho Shop</span></td>
                        <td><span className="badge success">Hoàn thành</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
                      Lưu vết bất biến mọi thao tác duyệt minh chứng, cấp Hộ chiếu số và giải ngân theo chuẩn an toàn
                    </p>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Mã Nhật Ký</th>
                        <th>Thời Gian</th>
                        <th>Người Thực Hiện</th>
                        <th>Hành Động</th>
                        <th>Đối Tượng</th>
                        <th>Kết Quả Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((l) => (
                        <tr key={l.id}>
                          <td><span className="mono-code">{l.id}</span></td>
                          <td><small>{l.time}</small></td>
                          <td><strong>{l.actor}</strong></td>
                          <td><span className="badge">{l.action}</span></td>
                          <td>{l.target}</td>
                          <td><span className="text-success">{l.result}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Server,
  Shield,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { BrandLogo } from "@/components/brand-logo";

import type { AppRole } from "@/lib/authz";

interface AdminHeaderProps {
  roles: AppRole[] | string[];
  activeTab?: string | undefined;
  onSelectTab: (tab: string) => void;
  pendingCount?: number | undefined;
  onToggleMobileMenu?: (() => void) | undefined;
}

export function AdminHeader({
  roles = ["admin", "verifier"],
  onSelectTab,
  pendingCount = 0,
  onToggleMobileMenu,
}: AdminHeaderProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);

  async function handleSignOut() {
    try {
      const supabase = createBrowserSupabase();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    }
  }

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        {onToggleMobileMenu && (
          <button
            type="button"
            className="admin-mobile-toggle-btn"
            onClick={onToggleMobileMenu}
            aria-label="Mở danh mục quản trị"
          >
            <Menu size={20} />
          </button>
        )}
        <Link href="/admin" className="admin-brand" aria-label="Cổng Quản Trị Hanoi CraftTrust">
          <BrandLogo variant="compact" />
          <div className="admin-brand-titles">
            <span className="admin-brand-sub">CỔNG QUẢN TRỊ HỆ THỐNG</span>
          </div>
        </Link>
      </div>

      <div className="admin-header-center">
        <div className="admin-system-status">
          <span className="status-pill online">
            <span className="status-dot" /> Database: Active
          </span>
          <span className="status-pill" title="Chưa có kiểm tra kết nối trực tiếp tới dịch vụ tạo 3D">
            <Activity size={13} /> 3D: Chưa xác minh kết nối
          </span>
          <span className="status-pill online">
            <Server size={13} /> NFC Registry: Synced
          </span>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Marketplace switcher */}
        <Link
          href="/marketplace"
          target="_blank"
          className="admin-link-btn"
          title="Xem sàn mua sắm trong tab mới"
        >
          <ExternalLink size={14} />
          <span>Sàn Người Mua</span>
        </Link>

        {/* Seller switcher */}
        <Link
          href="/seller"
          target="_blank"
          className="admin-link-btn highlight"
          title="Truy cập Kênh Người Bán"
        >
          <Store size={14} />
          <span>Kênh Người Bán</span>
        </Link>

        {/* Notification Bell */}
        <div className="admin-action-wrap">
          <button
            type="button"
            className="admin-icon-btn"
            onClick={() => setNotiOpen(!notiOpen)}
            aria-label="Thông báo quản trị"
          >
            <Bell size={18} />
            {pendingCount > 0 && <span className="admin-badge">{pendingCount}</span>}
          </button>

          {notiOpen && (
            <div className="admin-dropdown-popover" onMouseLeave={() => setNotiOpen(false)}>
              <div className="popover-title">Cảnh Báo Quản Trị Hệ Thống</div>
              <div className="popover-item unread">
                <strong>{pendingCount} hồ sơ minh chứng mới</strong>
                <p>Nghệ nhân vừa gửi hồ sơ kiểm định đất và men tro.</p>
                <button
                  type="button"
                  className="button small terracotta"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    setNotiOpen(false);
                    onSelectTab("verification");
                  }}
                >
                  Xử lý ngay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile */}
        <div className="admin-profile-wrap">
          <button
            type="button"
            className="admin-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="admin-avatar-box">AD</div>
            <div className="admin-profile-info">
              <span className="admin-name">Admin Điều Hành</span>
              <span className="admin-roles-badge">{roles.join(" · ").toUpperCase()}</span>
            </div>
            <ChevronDown size={14} />
          </button>

          {profileOpen && (
            <div className="admin-dropdown-popover" onMouseLeave={() => setProfileOpen(false)}>
              <div className="popover-title">Quản Trị Viên Sàn Di Sản</div>
              <button
                type="button"
                className="popover-action"
                onClick={() => {
                  setProfileOpen(false);
                  onSelectTab("overview");
                }}
              >
                <Shield size={15} />
                <span>Bảng điều hành</span>
              </button>
              <button
                type="button"
                className="popover-action"
                onClick={() => {
                  setProfileOpen(false);
                  onSelectTab("audit-logs");
                }}
              >
                <Activity size={15} />
                <span>Nhật ký kiểm toán (Audit Logs)</span>
              </button>
              <button
                type="button"
                className="popover-action danger"
                onClick={() => {
                  setProfileOpen(false);
                  void handleSignOut();
                }}
              >
                <LogOut size={15} />
                <span>Đăng xuất Cổng Quản Trị</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

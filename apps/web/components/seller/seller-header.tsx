"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ExternalLink,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { AppRole } from "@/lib/authz";

interface SellerHeaderProps {
  artisanName?: string | undefined;
  roles?: (AppRole | string)[] | undefined;
  activeTab?: string | undefined;
  onSelectTab: (tab: string) => void;
}

export function SellerHeader({
  artisanName = "Nghệ nhân Bát Tràng",
  roles = ["seller"],
  onSelectTab,
}: SellerHeaderProps) {
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
    <header className="seller-header">
      <div className="seller-header-left">
        <Link href="/seller" className="seller-brand">
          <div className="seller-brand-badge">
            <Store size={20} />
          </div>
          <div className="seller-brand-titles">
            <span className="seller-brand-name">HANOI CRAFT-TRUST</span>
            <span className="seller-brand-sub">KÊNH NGƯỜI BÁN · SELLER CENTRE</span>
          </div>
        </Link>
      </div>

      <div className="seller-header-center">
        <div className="seller-quick-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm tính năng: đơn hàng, sản phẩm, studio 3D, voucher..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value.toLowerCase();
                if (val.includes("3d") || val.includes("studio")) onSelectTab("studio-3d");
                else if (val.includes("đơn") || val.includes("order")) onSelectTab("orders");
                else if (val.includes("sản phẩm") || val.includes("product")) onSelectTab("products");
                else if (val.includes("voucher") || val.includes("khuyến mãi")) onSelectTab("marketing");
                else if (val.includes("tiền") || val.includes("doanh thu")) onSelectTab("finance");
              }
            }}
          />
        </div>
      </div>

      <div className="seller-header-right">
        {/* Switch to Buyer Marketplace */}
        <Link
          href="/marketplace"
          target="_blank"
          className="seller-switch-buyer-btn"
          title="Xem sàn mua sắm của khách hàng trong tab mới"
        >
          <ExternalLink size={15} />
          <span>Xem Sàn Mua Sắm</span>
        </Link>

        {roles.includes("admin") && (
          <Link
            href="/admin"
            className="seller-switch-buyer-btn admin-link"
            title="Chuyển sang Cổng Quản Trị Hệ Thống"
          >
            <ShieldCheck size={15} />
            <span>Cổng Quản Trị</span>
          </Link>
        )}

        {/* Notifications */}
        <div className="seller-action-wrap">
          <button
            type="button"
            className="seller-icon-btn"
            onClick={() => setNotiOpen(!notiOpen)}
            aria-label="Thông báo người bán"
          >
            <Bell size={18} />
            <span className="seller-badge">3</span>
          </button>

          {notiOpen && (
            <div className="seller-dropdown-popover" onMouseLeave={() => setNotiOpen(false)}>
              <div className="popover-title">Thông Báo Người Bán</div>
              <div className="popover-item unread">
                <div className="popover-dot" />
                <div>
                  <strong>Đơn hàng mới #CT-8291</strong>
                  <p>Khách hàng vừa đặt Bộ ấm chén men tro trăng.</p>
                  <small>5 phút trước</small>
                </div>
              </div>
              <div className="popover-item unread">
                <div className="popover-dot" />
                <div>
                  <strong>Mô hình 3D hoàn tất</strong>
                  <p>Mô hình Bình hoa men lam đã được AI xử lý xong.</p>
                  <small>1 giờ trước</small>
                </div>
              </div>
              <div className="popover-item">
                <div className="popover-dot read" />
                <div>
                  <strong>Cảnh báo tồn kho</strong>
                  <p>Bộ chén hỏa biến còn dưới 3 sản phẩm.</p>
                  <small>Hôm qua</small>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <button
          type="button"
          className="seller-icon-btn"
          onClick={() => alert("Hộp thư trò chuyện với khách hàng đang mở trên nền tảng.")}
          aria-label="Tin nhắn khách hàng"
          title="Tin nhắn khách hàng"
        >
          <MessageSquare size={18} />
          <span className="seller-badge">1</span>
        </button>

        {/* Profile Dropdown */}
        <div className="seller-profile-wrap">
          <button
            type="button"
            className="seller-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
          >
            <div className="seller-avatar-circle">
              {artisanName.charAt(0).toUpperCase()}
            </div>
            <div className="seller-profile-text">
              <span className="seller-artisan-name">{artisanName}</span>
              <span className="seller-workshop-tag">Xưởng gốm Bát Tràng</span>
            </div>
            <ChevronDown size={14} />
          </button>

          {profileOpen && (
            <div className="seller-dropdown-popover" onMouseLeave={() => setProfileOpen(false)}>
              <div className="popover-title">Tài Khoản Nhà Bán Hàng</div>
              <button
                type="button"
                className="popover-action"
                onClick={() => {
                  setProfileOpen(false);
                  onSelectTab("shop-profile");
                }}
              >
                <User size={15} />
                <span>Hồ sơ xưởng & Nghệ nhân</span>
              </button>
              <button
                type="button"
                className="popover-action"
                onClick={() => {
                  setProfileOpen(false);
                  onSelectTab("shipping");
                }}
              >
                <Settings size={15} />
                <span>Cài đặt vận chuyển & kho</span>
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
                <span>Đăng xuất Kênh Người Bán</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

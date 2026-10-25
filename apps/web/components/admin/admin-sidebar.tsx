"use client";

import {
  ClipboardCheck,
  FileSearch,
  History,
  LayoutGrid,
  PackageSearch,
  Store,
  Box,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount?: number | undefined;
  canManageExperiences?: boolean;
  isOpenMobile?: boolean | undefined;
  onCloseMobile?: (() => void) | undefined;
}

interface AdminMenuItem {
  id: string;
  label: string;
  icon: any;
  badge: string | null;
  badgeType?: string | undefined;
}

interface AdminMenuGroup {
  title: string;
  items: AdminMenuItem[];
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  pendingCount = 0,
  canManageExperiences = false,
  isOpenMobile = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const menuGroups: AdminMenuGroup[] = [
    {
      title: "ĐIỀU HÀNH HỆ THỐNG",
      items: [
        {
          id: "overview",
          label: "Tổng Quan Toàn Sàn",
          icon: LayoutGrid,
          badge: null,
        },
      ],
    },
    {
      title: "THẨM ĐỊNH & DI SẢN",
      items: [
        {
          id: "verification",
          label: "Thẩm Định Minh Chứng Hộ Chiếu",
          icon: ClipboardCheck,
          badge: pendingCount > 0 ? String(pendingCount) : null,
          badgeType: "warning",
        },
        {
          id: "products-audit",
          label: "Kiểm Duyệt Sản Phẩm & 3D",
          icon: PackageSearch,
          badge: null,
        },
      ],
    },
    {
      title: "QUẢN TRỊ ĐỐI TÁC",
      items: [
        {
          id: "merchants",
          label: "Gian Hàng & Nghệ Nhân",
          icon: Store,
          badge: null,
        },
      ],
    },
    {
      title: "GIAO DỊCH & TÀI CHÍNH",
      items: [
        {
          id: "platform-orders",
          label: "Đơn Hàng Toàn Sàn",
          icon: FileSearch,
          badge: null,
        },
      ],
    },
    {
      title: "BẢO MẬT & KIỂM TOÁN",
      items: [
        {
          id: "audit-logs",
          label: "Nhật Ký Kiểm Toán (Audit)",
          icon: History,
          badge: null,
        },
      ],
    },
  ];

  return (
    <>
      {isOpenMobile && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`admin-sidebar ${isOpenMobile ? "mobile-open" : ""}`}
        aria-label="Điều hướng Cổng Quản Trị Hệ Thống"
      >
        {isOpenMobile && (
          <div className="admin-sidebar-mobile-header">
            <span>Danh mục Quản trị</span>
            <button
              type="button"
              className="admin-sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label="Đóng menu"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="admin-sidebar-content">
          {menuGroups.map((group) => (
            <div key={group.title} className="admin-menu-group">
              <span className="admin-menu-group-title">{group.title}</span>
              <div className="admin-menu-items">
                {[...group.items, ...(group.title === "THẨM ĐỊNH & DI SẢN" && canManageExperiences ? [{ id: "experiences", label: "Trải nghiệm 3D/VR", icon: Box, badge: null }] : [])].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-menu-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                    >
                      <div className="item-label-wrap">
                        <Icon size={17} className="item-icon" />
                        <span className="item-text">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`admin-item-badge ${item.badgeType ?? "default"}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

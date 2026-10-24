"use client";

import {
  BadgePercent,
  BarChart4,
  ClipboardCheck,
  FileSearch,
  History,
  LayoutGrid,
  PackageSearch,
  Scale,
  Settings2,
  Store,
  Users,
  Box,
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount?: number | undefined;
  canManageExperiences?: boolean;
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
        {
          id: "analytics",
          label: "Báo Cáo GMV Làng Nghề",
          icon: BarChart4,
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
          badge: "2",
          badgeType: "accent",
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
        {
          id: "users",
          label: "Người Mua & Tài Khoản",
          icon: Users,
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
        {
          id: "disputes",
          label: "Xử Lý Khiếu Nại Tranh Chấp",
          icon: Scale,
          badge: "0",
        },
        {
          id: "platform-fees",
          label: "Hoa Hồng & Quỹ Bảo Tồn",
          icon: BadgePercent,
          badge: "5%",
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
        {
          id: "system-settings",
          label: "Cấu Hình Hệ Thống",
          icon: Settings2,
          badge: null,
        },
      ],
    },
  ];

  return (
    <aside className="admin-sidebar" aria-label="Điều hướng Cổng Quản Trị Hệ Thống">
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
                    onClick={() => onSelectTab(item.id)}
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
  );
}

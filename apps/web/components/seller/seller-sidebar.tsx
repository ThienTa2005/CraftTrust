"use client";

import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  Package,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Store,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";

interface SellerSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function SellerSidebar({ activeTab, onSelectTab }: SellerSidebarProps) {
  const menuGroups = [
    {
      title: "TỔNG QUAN",
      items: [
        {
          id: "dashboard",
          label: "Bảng Điều Khiển",
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      title: "QUẢN LÝ ĐƠN HÀNG",
      items: [
        {
          id: "orders",
          label: "Tất Cả Đơn Hàng",
          icon: ClipboardList,
          badge: "4",
        },
        {
          id: "orders-todo",
          label: "Đơn Cần Xử Lý",
          icon: Package,
          badge: "3",
          badgeType: "warning",
        },
        {
          id: "orders-returns",
          label: "Đơn Hủy & Trả Hàng",
          icon: RotateCcw,
          badge: "0",
        },
      ],
    },
    {
      title: "QUẢN LÝ SẢN PHẨM",
      items: [
        {
          id: "products",
          label: "Tất Cả Sản Phẩm",
          icon: Boxes,
          badge: null,
        },
        {
          id: "new-product",
          label: "Thêm Sản Phẩm Mới",
          icon: PlusCircle,
          badge: "Mới",
          badgeType: "accent",
        },
        {
          id: "studio-3d",
          label: "Studio 3D & AI Scan",
          icon: Sparkles,
          badge: "AI 3D",
          badgeType: "gold",
        },
      ],
    },
    {
      title: "VẬN CHUYỂN",
      items: [
        {
          id: "shipping",
          label: "Quản Lý Vận Chuyển",
          icon: Truck,
          badge: null,
        },
      ],
    },
    {
      title: "KÊNH MARKETING",
      items: [
        {
          id: "marketing",
          label: "Mã Giảm Giá Của Shop",
          icon: Tag,
          badge: null,
        },
      ],
    },
    {
      title: "TÀI CHÍNH",
      items: [
        {
          id: "finance",
          label: "Doanh Thu & Ví Tiền",
          icon: Wallet,
          badge: null,
        },
      ],
    },
    {
      title: "DỮ LIỆU & PHÂN TÍCH",
      items: [
        {
          id: "analytics",
          label: "Phân Tích Bán Hàng",
          icon: BarChart3,
          badge: null,
        },
      ],
    },
    {
      title: "QUẢN LÝ SHOP",
      items: [
        {
          id: "shop-profile",
          label: "Hồ Sơ Xưởng & Nghệ Nhân",
          icon: Store,
          badge: null,
        },
        {
          id: "passport-badge",
          label: "Chứng Nhận Hộ Chiếu Số",
          icon: FileCheck2,
          badge: "Gold",
          badgeType: "gold",
        },
      ],
    },
  ];

  return (
    <aside className="seller-sidebar" aria-label="Điều hướng Kênh Người Bán">
      <div className="seller-sidebar-content">
        {menuGroups.map((group) => (
          <div key={group.title} className="seller-menu-group">
            <span className="seller-menu-group-title">{group.title}</span>
            <div className="seller-menu-items">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`seller-menu-item ${isActive ? "active" : ""}`}
                    onClick={() => onSelectTab(item.id)}
                  >
                    <div className="item-label-wrap">
                      <Icon size={17} className="item-icon" />
                      <span className="item-text">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`seller-item-badge ${item.badgeType ?? "default"}`}>
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

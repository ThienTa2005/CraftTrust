import type { RewardItem } from "@craft-trust/contracts";

export interface MemberTierInfo {
  id: "apprentice" | "enthusiast" | "connoisseur" | "ambassador";
  nameVi: string;
  nameEn: string;
  minPoints: number;
  perksVi: string[];
  perksEn: string[];
  badgeColor: string;
}

export const MEMBER_TIERS_INFO: MemberTierInfo[] = [
  {
    id: "apprentice",
    nameVi: "Tập sự Di sản",
    nameEn: "Heritage Apprentice",
    minPoints: 0,
    perksVi: ["Tích điểm 10 điểm / 100.000đ chi tiêu", "Nhận thông báo sự kiện làng nghề"],
    perksEn: ["Earn 10 pts per 100,000 VND spent", "Village event notifications"],
    badgeColor: "#8b7355"
  },
  {
    id: "enthusiast",
    nameVi: "Người yêu Di sản",
    nameEn: "Craft Enthusiast",
    minPoints: 500,
    perksVi: ["Giảm 5% mọi đơn hàng", "Ưu tiên đổi vé workshop làm gốm", "Tặng 50 điểm sinh nhật"],
    perksEn: ["5% off all orders", "Priority pottery workshop booking", "50 birthday points"],
    badgeColor: "#718096"
  },
  {
    id: "connoisseur",
    nameVi: "Tri kỷ Thủ công",
    nameEn: "Master Connoisseur",
    minPoints: 1500,
    perksVi: ["Giảm 10% mọi đơn hàng", "Ưu tiên đặt nghệ nhân khắc chữ riêng", "Thư mời dạ tiệc trà di sản"],
    perksEn: ["10% off all orders", "Priority custom artisan engraving", "Heritage tea gala invites"],
    badgeColor: "#d69e2e"
  },
  {
    id: "ambassador",
    nameVi: "Đại sứ Di sản",
    nameEn: "Heritage Ambassador",
    minPoints: 3500,
    perksVi: ["Giảm 15% trọn đời", "Miễn phí 01 Tour VIP làng nghề / năm", "Khắc tên danh dự tại bảo tàng làng"],
    perksEn: ["15% lifetime discount", "1 free VIP village tour / year", "Honorary name inscription at museum"],
    badgeColor: "#319795"
  }
];

export const REWARD_ITEMS: RewardItem[] = [
  {
    id: "rw-voucher-50k",
    type: "discount_voucher",
    titleVi: "Voucher Giảm 50.000 ₫ Đơn hàng Thủ công",
    titleEn: "50,000 VND Craft Shopping Voucher",
    descriptionVi: "Áp dụng trừ trực tiếp vào đơn hàng khi mua bất kỳ sản phẩm gốm sứ, lụa tơ tằm hay mây tre đan.",
    descriptionEn: "Direct deduction applicable to any pottery, silk, or bamboo craft order.",
    pointsRequired: 250,
    discountVnd: 50000,
    badgeVi: "VOUCHER MUA SẮM",
    badgeEn: "SHOPPING VOUCHER",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "rw-voucher-100k",
    type: "discount_voucher",
    titleVi: "Voucher Giảm 100.000 ₫ Đơn hàng Thủ công",
    titleEn: "100,000 VND Craft Shopping Voucher",
    descriptionVi: "Áp dụng cho mọi đơn hàng từ 500.000 ₫ trở lên trên toàn hệ thống.",
    descriptionEn: "Applicable to orders from 500,000 VND across the entire platform.",
    pointsRequired: 450,
    discountVnd: 100000,
    badgeVi: "VOUCHER MUA SẮM",
    badgeEn: "SHOPPING VOUCHER",
    image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "rw-workshop-bat-trang",
    type: "workshop_ticket",
    titleVi: "Vé Workshop: Tự tay vuốt gốm & Nung lò cùng Nghệ nhân Bát Tràng",
    titleEn: "Pottery Workshop: Hand-throwing & Kiln Firing with Bat Trang Master",
    descriptionVi: "Buổi trải nghiệm 3 giờ tại xưởng gốm cổ. Nghệ nhân hướng dẫn 1-kèm-1 kỹ thuật vuốt bàn xoay, tự vẽ men và nung lò mang tác phẩm về nhà.",
    descriptionEn: "A 3-hour hands-on experience at an ancestral kiln. Master 1-on-1 guidance on wheel-throwing, glazing, and kiln firing.",
    pointsRequired: 650,
    village: "Làng gốm Bát Tràng",
    badgeVi: "TRẢI NGHIỆM ĐẶC QUYỀN",
    badgeEn: "HANDS-ON WORKSHOP",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=85"
  },
  {
    id: "rw-workshop-van-phuc",
    type: "workshop_ticket",
    titleVi: "Vé Trải nghiệm: Dệt lụa tơ tằm & Thưởng trà sen Tây Hồ tại Vạn Phúc",
    titleEn: "Silk Weaving & West Lake Lotus Tea Experience in Van Phuc",
    descriptionVi: "Trải nghiệm ngồi bên khung cửi cổ truyền hơn 100 năm tuổi, tự tay luồn thoi dệt lụa tơ tằm và thưởng trà ướp hoa sen thượng hạng cùng nghệ nhân làng lụa.",
    descriptionEn: "Sit at a century-old traditional loom, guide the wooden shuttle to weave natural silk, and savor imperial West Lake lotus tea.",
    pointsRequired: 950,
    village: "Làng lụa Vạn Phúc",
    badgeVi: "TRẢI NGHIỆM ĐẶC QUYỀN",
    badgeEn: "HANDS-ON WORKSHOP",
    image: "https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=800&q=85"
  },
  {
    id: "rw-masterclass-chang-son",
    type: "masterclass",
    titleVi: "Masterclass: Kỹ nghệ mộng gỗ & Chế tác quạt giấy Chàng Sơn",
    titleEn: "Woodcraft & Fan Masterclass with Chang Son Master Artisan",
    descriptionVi: "Tìm hiểu bí truyền mộng gỗ âm dương không đinh và thực hành uốn nan tre, dán giấy điệp làm chiếc quạt mang tên chính bạn.",
    descriptionEn: "Discover ancient mortise-and-tenon joinery and handcraft your own personalized ceremonial bamboo paper fan.",
    pointsRequired: 1400,
    village: "Làng mộc Chàng Sơn",
    badgeVi: "LỚP HỌC NGHỆ NHÂN",
    badgeEn: "MASTERCLASS",
    image: "https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=800&q=85"
  },
  {
    id: "rw-vip-tour-song-hong",
    type: "vip_tour",
    titleVi: "Tour VIP 1 ngày: Hành trình Di sản Sông Hồng trọn gói xe đưa đón",
    titleEn: "Full-day VIP Tour: Red River Heritage Trail with Private Chauffeur",
    descriptionVi: "Tour trọn gói bao gồm: Xe Limousine đón tận nơi tại Hà Nội, thăm Làng gốm Bát Tràng, Bảo tàng Gốm 7 bàn xoay, Đền Chử Đồng Tử, ăn trưa ẩm thực làng cổ và quà lưu niệm.",
    descriptionEn: "All-inclusive tour: Private limousine pickup, Bat Trang Pottery, 7-turnwheel Ceramic Museum, Chu Dong Tu Temple, heritage lunch, and exclusive gift.",
    pointsRequired: 2800,
    village: "Bát Tràng & Ven sông Hồng",
    badgeVi: "CHUYẾN ĐI TRỌN GÓI",
    badgeEn: "ALL-INCLUSIVE TOUR",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=85"
  }
];

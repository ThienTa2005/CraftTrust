export type VillageCard = {
  id: string;
  slug: string;
  name: string;
  district: string;
  summary: string;
  summaryEn?: string | undefined;
  craft: string;
  craftEn?: string | undefined;
  image: string;
};

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | undefined;
  description: string;
  descriptionEn?: string | undefined;
  priceVnd: number;
  stock: number;
  image: string;
  artisan: string;
  village: string;
  villageEn?: string | undefined;
  passportId: string;
  tier: "unverified" | "bronze" | "silver" | "gold";
  modelUrl?: string | undefined;
  arUrl?: string | undefined;
};

export const demoVillages: VillageCard[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    slug: "bat-trang",
    name: "Làng gốm Bát Tràng",
    district: "Gia Lâm",
    summary: "Làng gốm cổ truyền ven sông Hồng với bề dày hơn 500 năm, nơi tinh hoa đất sét, kỹ thuật men tro và men rạn được truyền thừa qua nhiều thế hệ.",
    summaryEn: "A riverside pottery village where clay, glaze and kiln knowledge pass between generations across five centuries.",
    craft: "Gốm sứ thủ công",
    craftEn: "Ceramics & Pottery",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1400&q=85"
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    slug: "van-phuc",
    name: "Làng lụa Vạn Phúc",
    district: "Hà Đông",
    summary: "Tiếng thoi dệt lụa tơ tằm rộn vang khắp ngõ ngách, nổi danh với lụa vân mỏng nhẹ, thoáng mát và bền đẹp bậc nhất đất kinh kỳ.",
    summaryEn: "Silk looms animate narrow lanes in one of Hanoi's best-known textile communities, famous for natural mulberry silk.",
    craft: "Dệt lụa tơ tằm",
    craftEn: "Silk weaving",
    image: "https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=1400&q=85"
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    slug: "chuong",
    name: "Làng mộc mỹ nghệ Chàng Sơn",
    district: "Thạch Thất",
    summary: "Được mệnh danh là cái nôi nghệ thuật chạm khắc gỗ cổ truyền, nơi các nghệ nhân tạo tác bằng đục chạm tay và kỹ thuật mộng gỗ tinh vi.",
    summaryEn: "Woodworkers shape domestic and ceremonial objects through hand tools, intricate joinery and patient finishing.",
    craft: "Điêu khắc mộc mỹ nghệ",
    craftEn: "Wood craft & carving",
    image: "https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=1400&q=85"
  }
];

export const demoProducts: ProductCard[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    slug: "moon-glaze-tea-set",
    name: "Bộ ấm chén gốm men tro trăng Bát Tràng",
    nameEn: "Moon-glaze tea set",
    description: "Gốm sành vuốt tay thủ công từ đất sét sông Hồng, phủ men tro đa tầng nung củi nhiệt độ 1250°C mẻ nhỏ, tạo hiệu ứng men ánh trăng độc bản.",
    descriptionEn: "Wheel-thrown stoneware with a layered ash glaze, fired in a small batch wood kiln at 1250°C.",
    priceVnd: 1850000,
    stock: 6,
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=90",
    artisan: "Nguyễn Thu Hà",
    village: "Bát Tràng",
    villageEn: "Bat Trang",
    passportId: "HCT-DEMO-BT-001",
    tier: "gold",
    modelUrl: "/models/craft-pottery.glb",
    arUrl: "/models/craft-pottery.glb"
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    slug: "lotus-silk-scarf",
    name: "Khăn lụa tơ tằm Vạn Phúc dệt hoa sen",
    nameEn: "Lotus silk scarf",
    description: "Lụa tơ tằm tự nhiên 100% dệt khung thủ công truyền thống, họa tiết hoa sen chìm tinh xảo, nhuộm bằng màu thực vật tự nhiên thân thiện môi trường.",
    descriptionEn: "A lightweight handwoven scarf with a naturally inspired lotus motif, dyed with organic natural plant extracts.",
    priceVnd: 980000,
    stock: 12,
    image: "https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=1200&q=90",
    artisan: "Trần Minh Lan",
    village: "Vạn Phúc",
    villageEn: "Van Phuc",
    passportId: "HCT-DEMO-VP-001",
    tier: "silver"
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    slug: "carved-tea-tray",
    name: "Khay trà gỗ hương chạm mây Chàng Sơn",
    nameEn: "Carved tea tray",
    description: "Gỗ hương tự nhiên nguyên khối tuyển chọn, chạm khắc thủ công họa tiết mây cuộn truyền thống, xử lý chống ẩm tự nhiên không dùng hóa chất độc hại.",
    descriptionEn: "Locally finished hardwood, hand-carved with a flowing cloud edge and natural wax treatment.",
    priceVnd: 2400000,
    stock: 3,
    image: "https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=1200&q=90",
    artisan: "Phạm Văn Sơn",
    village: "Chàng Sơn",
    villageEn: "Chang Son",
    passportId: "HCT-DEMO-CS-001",
    tier: "bronze"
  }
];

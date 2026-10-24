import type { GlazeOption, GlazeType, RoomCombo } from "@craft-trust/contracts";

export interface GlazeDefinition extends GlazeOption {
  swatchGradient: string;
  taglineVi: string;
  taglineEn: string;
  firingTemp: string;
}

export const GLAZE_DEFINITIONS: Record<GlazeType, GlazeDefinition> = {
  "hoa-bien": {
    id: "hoa-bien",
    nameVi: "Men hỏa biến Bát Tràng",
    nameEn: "Flambé Reactive Glaze",
    descriptionVi: "Hiệu ứng lửa biến ảo đa sắc tím thẫm ánh đồng, nung lò củi nhiệt độ 1280°C độc bản.",
    descriptionEn: "Dynamic fire transmutation with deep plum and copper bronze undertones, fired at 1280°C.",
    baseColor: "#5c1d47",
    roughness: 0.12,
    metallic: 0.32,
    historyVi: "Dòng men đỉnh cao nung ở nhiệt độ biến thiên, màu sắc tự nhiên do lửa tạo tác, không chiếc nào giống chiếc nào.",
    historyEn: "Master-level reactive glaze formed by temperature variations; flame creates naturally unique color gradations.",
    swatchGradient: "linear-gradient(135deg, #2b0938 0%, #7b113a 50%, #d47a32 100%)",
    taglineVi: "Biến ảo theo ngọn lửa · Độc bản tự nhiên",
    taglineEn: "Flame transmutation · Unique per piece",
    firingTemp: "1280°C"
  },
  "ran-co": {
    id: "ran-co",
    nameVi: "Men rạn cổ Bát Tràng",
    nameEn: "Antique Crackle Glaze",
    descriptionVi: "Đặc trưng cốt gốm rạn chân chim hình tam giác, tứ giác hoài cổ thời Lê - Nguyễn thế kỷ 16.",
    descriptionEn: "Characteristic polygonal crackle veins reminiscent of 16th-century royal ceramic ware.",
    baseColor: "#e7decb",
    roughness: 0.42,
    metallic: 0.05,
    historyVi: "Xuất hiện từ thế kỷ 16 tại Bát Tràng, tạo nên các đường rạn tự nhiên nhờ độ co ngót khác nhau giữa men và xương gốm.",
    historyEn: "Originated in 16th-century Bat Trang; distinct crackle veins arise naturally from clay-glaze thermal contraction.",
    swatchGradient: "linear-gradient(135deg, #d8cca8 0%, #f0e6ce 50%, #c4b58e 100%)",
    taglineVi: "Cốt men rạn tam giác · Hoài niệm thế kỷ 16",
    taglineEn: "Polygonal crackle · 16th century heritage",
    firingTemp: "1220°C"
  },
  "men-lam": {
    id: "men-lam",
    nameVi: "Men lam Bát Tràng",
    nameEn: "Cobalt Blue Porcelain",
    descriptionVi: "Sắc xanh coban trang nhã vẽ tay trên cốt sứ trắng ngà truyền thống từ thế kỷ 14.",
    descriptionEn: "Graceful cobalt blue motifs hand-brushed onto ivory porcelain body.",
    baseColor: "#1a365d",
    roughness: 0.08,
    metallic: 0.12,
    historyVi: "Dòng men cổ kinh điển từ thế kỷ 14, hoa văn vẽ tay thủ công bằng bút lông chim trước khi phủ men bóng và nung.",
    historyEn: "Classic 14th-century Bat Trang glaze; intricate motifs hand-painted with feather brushes before transparent glazing.",
    swatchGradient: "linear-gradient(135deg, #0f2b48 0%, #2b6cb0 60%, #e2e8f0 100%)",
    taglineVi: "Họa tiết vẽ tay xanh lam · Cốt sứ ngà hoàng gia",
    taglineEn: "Hand-painted cobalt · Royal porcelain tone",
    firingTemp: "1250°C"
  },
  "men-ngoc": {
    id: "men-ngoc",
    nameVi: "Men ngọc truyền thống",
    nameEn: "Traditional Celadon Jade",
    descriptionVi: "Màu xanh ngọc bích bán trong suốt, bóng dịu như ngọc thạch cung đình thời Lý - Trần.",
    descriptionEn: "Translucent celadon jade hue with imperial satin glow from the Ly-Tran eras.",
    baseColor: "#4a7c59",
    roughness: 0.14,
    metallic: 0.16,
    historyVi: "Kỹ thuật men quý có từ thời Lý - Trần, sử dụng tro trấu và khoáng thạch tự nhiên tạo độ sâu mướt.",
    historyEn: "Precious glaze lineage tracing back to the Ly-Tran dynasties, formulated from rice husk ash and river minerals.",
    swatchGradient: "linear-gradient(135deg, #2d5a3f 0%, #68a37f 60%, #a3c9b1 100%)",
    taglineVi: "Xanh ngọc bích thanh tao · Tro trấu tự nhiên",
    taglineEn: "Imperial celadon jade · Natural ash glaze",
    firingTemp: "1260°C"
  }
};

export const LIVING_ROOM_COMBO: RoomCombo = {
  id: "combo-phong-khach-trang-an",
  titleVi: "Combo Trang trí Phòng khách Tràng An",
  titleEn: "Trang An Living Room Staging Combo",
  descriptionVi: "Bộ phối cảnh không gian kết hợp gốm Bát Tràng và mây tre đan Phú Vinh, tạo điểm nhấn văn hóa thanh lịch cho phòng khách.",
  descriptionEn: "Curated living room ensemble blending Bat Trang pottery and Phu Vinh bamboo weave, creating a timeless cultural centerpiece.",
  totalDiscountPercent: 10,
  items: [
    {
      id: "item-1-binh-gom",
      nameVi: "01 Bình gốm men hỏa biến Bát Tràng",
      nameEn: "01 Bat Trang Flambé Ceramic Vase",
      craft: "Gốm sứ thủ công",
      village: "Làng gốm Bát Tràng",
      priceVnd: 1850000,
      scaleLabel: "Cao 42cm × Rộng 24cm (Tỷ lệ 1:1)",
      image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=85",
      modelUrl: "/models/craft-pottery.glb"
    },
    {
      id: "item-2-dia-trung-bay",
      nameVi: "01 Đĩa gốm sứ vẽ hoa sen Bát Tràng",
      nameEn: "01 Hand-painted Lotus Ceramic Platter",
      craft: "Gốm sứ thủ công",
      village: "Làng gốm Bát Tràng",
      priceVnd: 850000,
      scaleLabel: "Đường kính 32cm (Tỷ lệ 1:1)",
      image: "https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=800&q=85"
    },
    {
      id: "item-3-khay-may-tre",
      nameVi: "01 Khay mây tre đan mắt cáo Phú Vinh",
      nameEn: "01 Phu Vinh Handwoven Bamboo Tray",
      craft: "Mây tre đan xuất khẩu",
      village: "Làng mây tre đan Phú Vinh",
      priceVnd: 650000,
      scaleLabel: "Dài 55cm × Rộng 36cm (Tỷ lệ 1:1)",
      image: "https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=800&q=85"
    }
  ]
};

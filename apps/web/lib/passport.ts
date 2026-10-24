import { createPublicSupabase } from "./supabase";
import { demoProducts } from "./demo-data";
import type { PassportTimelineStep, OcopCertificateInfo } from "@craft-trust/contracts";

export interface PassportVideoItem {
  id: string;
  titleVi: string;
  titleEn: string;
  duration: string;
  poster: string;
  videoUrl: string;
  descriptionVi: string;
  descriptionEn: string;
}

export interface PassportView {
  publicId: string;
  status: string;
  tier: "unverified" | "bronze" | "silver" | "gold";
  productName: string;
  artisan: string;
  artisanBioVi?: string;
  artisanBioEn?: string;
  artisanYears?: number;
  artisanAvatar?: string;
  village: string;
  priceVnd?: number;
  materialsVi?: string[];
  materialsEn?: string[];
  updatedAt: string;
  dynamicToken?: string;
  nfcUid?: string;
  verificationCount?: number;
  evidence: Array<{
    id: string;
    type: string;
    statement: string;
    status: string;
    sourceTitle?: string;
  }>;
  timeline: PassportTimelineStep[];
  ocop: OcopCertificateInfo;
  videos: PassportVideoItem[];
}

export const DEMO_TIMELINE: PassportTimelineStep[] = [
  {
    stepNumber: 1,
    stageNameVi: "Tuyển chọn nguyên liệu",
    stageNameEn: "Raw Material Selection",
    titleVi: "Khai thác & lắng lọc đất sét phù sa sông Hồng",
    titleEn: "Red River Silt Extraction & Purification",
    descriptionVi: "Đất sét trắng pha sa khoáng dẻo mịn khai thác từ trầm tích ven sông Hồng, trải qua quy trình ngâm lắng lọc qua 4 bể truyền thống (bể đánh, bể lắng, bể phơi, bể ủ) ròng rã 3 tháng.",
    descriptionEn: "Mineral-rich clay collected from alluvial Red River sediment, purified through a four-basin sediment filtration process over three months.",
    timestampLabelVi: "Tháng 6, 2026 · Vùng phù sa Gia Lâm",
    timestampLabelEn: "June 2026 · Gia Lam Basin",
    artisanNoteVi: "Đất sét đạt độ dẻo cao, hàm lượng oxit sắt tự nhiên tạo xương gốm đanh chắc khi nung nhiệt độ cao.",
    artisanNoteEn: "Exceptional clay plasticity and natural mineral content ensure structural integrity during high-temperature kiln firing.",
    imageUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80"
  },
  {
    stepNumber: 2,
    stageNameVi: "Tạo hình phôi gốm",
    stageNameEn: "Wheel-throwing & Shaping",
    titleVi: "Nghệ nhân vuốt tay độc bản trên bàn xoay",
    titleEn: "Hand-thrown on Traditional Potter's Wheel",
    descriptionVi: "Nghệ nhân tạo dáng bằng tay không cần khuôn đúc, chuốt đều độ dày thành bình gốm 4mm, định hình các đường cong hút lộc phong thủy chuẩn mực.",
    descriptionEn: "Master artisan shapes each vessel by hand on a manual wheel without molds, maintaining a uniform 4mm wall thickness.",
    timestampLabelVi: "Tháng 7, 2026 · Xưởng gốm Thu Hà, Bát Tràng",
    timestampLabelEn: "July 2026 · Thu Ha Studio, Bat Trang",
    artisanNoteVi: "Từng đường vuốt ngón tay để lại vân gợn tự nhiên bên trong lòng bình, minh chứng cho phương pháp thủ công thuần túy.",
    artisanNoteEn: "Finger ridges left inside the vessel interior authenticate genuine non-mechanized throwing.",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80"
  },
  {
    stepNumber: 3,
    stageNameVi: "Phủ men & Hỏa biến",
    stageNameEn: "Glazing & Wood Kiln Firing",
    titleVi: "Phủ men tro đa tầng & nung củi liên tục ở 1280°C",
    titleEn: "Multi-layer Ash Glazing & 1280°C Wood Firing",
    descriptionVi: "Phủ lớp men bào chế từ tro trấu tự nhiên và bột đá thạch anh, đưa vào lò nung đốt củi mẻ nhỏ trong 72 giờ liên tục. Ngọn lửa tự nhiên tạo nên biến thiên màu sắc kỳ ảo.",
    descriptionEn: "Coated with organic rice-husk ash and quartz minerals, wood-fired continuously for 72 hours at 1280°C.",
    timestampLabelVi: "Tháng 8, 2026 · Lò nung củi cổ Bát Tràng",
    timestampLabelEn: "August 2026 · Traditional Kiln, Bat Trang",
    artisanNoteVi: "Màu men hỏa biến tím thẫm ánh đồng sinh ra tự nhiên từ sự thay đổi khí oxy trong lò, không hề dùng phẩm màu hóa học.",
    artisanNoteEn: "Plum-bronze glaze hue emerges naturally from reduction atmosphere fluctuations without artificial chemical pigments.",
    imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80"
  },
  {
    stepNumber: 4,
    stageNameVi: "Thẩm định chất lượng",
    stageNameEn: "Quality Verification",
    titleVi: "Kiểm định âm vang, cấp chứng nhận OCOP 4 sao",
    titleEn: "Sound Resonance Inspection & OCOP 4-Star Audit",
    descriptionVi: "Gõ kiểm tra độ đanh vang như chuông đồng, soi khuyết tật bề mặt, đo đạc sai số kích thước và đóng dấu chứng nhận OCOP của Thành phố Hà Nội.",
    descriptionEn: "Tested for bronze bell acoustic resonance, surface inspection under magnification, and official Hanoi OCOP certification.",
    timestampLabelVi: "Tháng 9, 2026 · Hội đồng thẩm định OCOP Hà Nội",
    timestampLabelEn: "September 2026 · Hanoi OCOP Council",
    artisanNoteVi: "Âm vang trong vắt chứng minh cốt sành đã kết khối hoàn hảo, không có vết nứt ngầm.",
    artisanNoteEn: "Clear bell-like chime verifies complete vitrification without internal hairline stress fractures.",
    imageUrl: "https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=800&q=80"
  },
  {
    stepNumber: 5,
    stageNameVi: "Cấp Hộ chiếu số & Trao tay",
    stageNameEn: "Digital Passport Issuance",
    titleVi: "Gắn thẻ Dynamic NFC chống giả & lưu vết chuỗi khối",
    titleEn: "Dynamic NFC Cryptographic Tagging & Handover",
    descriptionVi: "Gắn chip cảm ứng Dynamic NFC dưới đáy bình, sinh mã định danh duy nhất HCT-DEMO-BT-001 chống sao chép và trao tận tay khách hàng.",
    descriptionEn: "Embedded Dynamic NFC chip under the base, generating a tamper-proof cryptographic passport token.",
    timestampLabelVi: "Tháng 10, 2026 · Nền tảng Hanoi Craft-Trust",
    timestampLabelEn: "October 2026 · Hanoi Craft-Trust Platform",
    artisanNoteVi: "Khách hàng có thể quét NFC bất kỳ lúc nào để xác thực tính nguyên bản và bảo hành trọn đời.",
    artisanNoteEn: "Owners can tap the base with NFC anytime to verify genuine origin and lifetime artisan heritage backing."
  }
];

export const DEMO_OCOP: OcopCertificateInfo = {
  stars: 4,
  certificateNumber: "OCOP-HN-2026-BT889",
  issueDate: "15/09/2026",
  authorityVi: "UBND Thành phố Hà Nội & Hội đồng Đánh giá OCOP",
  authorityEn: "Hanoi People's Committee & OCOP Evaluation Council",
  productCategoryVi: "Gốm sứ mỹ nghệ gia dụng cao cấp",
  productCategoryEn: "Premium Functional & Decorative Ceramics",
  validUntil: "15/09/2029"
};

export const DEMO_VIDEOS: PassportVideoItem[] = [
  {
    id: "video-bat-trang-history",
    titleVi: "Ký sự 500 năm Làng gốm Bát Tràng: Giữ lửa sông Hồng",
    titleEn: "500 Years of Bat Trang Pottery: Preserving Red River Heritage",
    duration: "4 phút 18 giây",
    poster: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    descriptionVi: "Thước phim tài liệu tái hiện lịch sử nửa thiên niên kỷ của làng gốm Bát Tràng, phỏng vấn các nghệ nhân cao niên về bí quyết men tro nung củi.",
    descriptionEn: "Documentary tracing five centuries of Bat Trang ceramics, featuring senior masters sharing ancestral kiln wisdom."
  },
  {
    id: "video-making-process",
    titleVi: "Cận cảnh quy trình vuốt gốm và hỏa biến 1280°C",
    titleEn: "Close-up: Hand-throwing and 1280°C Kiln Transmutation",
    duration: "3 phút 45 giây",
    poster: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    descriptionVi: "Theo chân nghệ nhân Nguyễn Thu Hà qua từng công đoạn: nhào đất, vuốt bàn xoay, tiện gọt chi tiết và hồi hộp canh lửa trong lò suốt 72 giờ.",
    descriptionEn: "Follow Master Nguyen Thu Ha through clay kneading, wheel shaping, trimming, and 72-hour kiln vigilance."
  }
];

export async function getPassport(
  publicId: string
): Promise<{ data: PassportView | null; demo: boolean; error?: string }> {
  const supabase = createPublicSupabase();

  if (!supabase) {
    const defaultProduct = demoProducts[0]!;
    const product = demoProducts.find((item) => item.passportId === publicId) ?? defaultProduct;
    return {
      demo: true,
      data: {
        publicId: product.passportId,
        status: "active_verified",
        tier: product.tier,
        productName: product.name,
        artisan: product.artisan,
        artisanBioVi: "Nghệ nhân Ưu tú với hơn 35 năm gắn bó với lò nung và đất sét Bát Tràng, người gìn giữ dòng men hỏa biến và men tro sông Hồng.",
        artisanBioEn: "Master Artisan with 35+ years dedicated to Bat Trang wood kilns, preserving ancestral flambé and Red River ash glazes.",
        artisanYears: 35,
        artisanAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        village: product.village,
        priceVnd: product.priceVnd,
        materialsVi: ["Đất sét sông Hồng tuyển chọn", "Men tro đa tầng tự nhiên", "Khoáng thạch thạch anh"],
        materialsEn: ["Selected Red River clay", "Organic multi-layer ash glaze", "Natural quartz minerals"],
        updatedAt: "2026-10-23T00:00:00.000Z",
        dynamicToken: `DYN-${publicId}-8879`,
        nfcUid: "04:8A:2F:1B:C9:6E:80",
        verificationCount: 142,
        evidence: [
          { id: "e1", type: "identity", statement: "Hồ sơ định danh nghệ nhân ưu tú và xưởng gốm đạt chuẩn.", status: "approved" },
          { id: "e2", type: "origin", statement: "Chứng nhận nguồn gốc địa lý Làng gốm Bát Tràng (Gia Lâm, Hà Nội).", status: "approved" },
          { id: "e3", type: "material_process", statement: "Bằng chứng phân tích khoáng vật đất sét và nhật ký nung lò 72 giờ.", status: "approved" },
          { id: "e4", type: "heritage_source", statement: "Trích dẫn tư liệu lưu trữ Lịch sử nghề gốm sứ Thăng Long - Hà Nội.", status: "approved" }
        ],
        timeline: DEMO_TIMELINE,
        ocop: DEMO_OCOP,
        videos: DEMO_VIDEOS
      }
    };
  }

  const { data, error } = await supabase
    .from("passport_records")
    .select(
      "public_id,tier,status,updated_at,products(name,price_vnd,artisans(name,bio,villages(name))),evidence_submissions(id,evidence_type,statement,status,heritage_sources(title))"
    )
    .eq("public_id", publicId)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { data: null, demo: false, error: error.message };
  if (!data) return { data: null, demo: false };

  const product: any = Array.isArray(data.products) ? data.products[0] : data.products;
  const artisan: any = Array.isArray(product?.artisans) ? product.artisans[0] : product?.artisans;
  const village: any = Array.isArray(artisan?.villages) ? artisan.villages[0] : artisan?.villages;

  return {
    demo: false,
    data: {
      publicId: data.public_id,
      tier: data.tier,
      status: data.status,
      updatedAt: data.updated_at,
      productName: product?.name ?? "Tác phẩm thủ công",
      artisan: artisan?.name ?? "Nghệ nhân Hà Nội",
      artisanBioVi: artisan?.bio ?? "Nghệ nhân làng nghề truyền thống Hà Nội.",
      artisanYears: 30,
      village: village?.name ?? "Hà Nội",
      priceVnd: product?.price_vnd ?? 1850000,
      materialsVi: ["Đất sét tự nhiên", "Men khoáng truyền thống"],
      materialsEn: ["Natural clay", "Mineral glaze"],
      dynamicToken: `DYN-${data.public_id}`,
      nfcUid: "04:77:E1:9C:22:A0:80",
      verificationCount: 89,
      evidence: ((data.evidence_submissions ?? []) as any[])
        .filter((e) => e.status === "approved")
        .map((e) => ({
          id: e.id,
          type: e.evidence_type,
          statement: e.statement,
          status: e.status,
          sourceTitle: (Array.isArray(e.heritage_sources) ? e.heritage_sources[0] : e.heritage_sources)?.title
        })),
      timeline: DEMO_TIMELINE,
      ocop: DEMO_OCOP,
      videos: DEMO_VIDEOS
    }
  };
}

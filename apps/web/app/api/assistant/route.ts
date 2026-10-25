import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { createPublicSupabase, createRequestSupabase } from "@/lib/supabase";

const schema = z.object({
  question: z.string().trim().min(2).max(1000),
  locale: z.enum(["vi", "en"]).optional().default("vi"),
  productId: z.string().trim().min(10).max(64).optional(),
  villageId: z.string().trim().min(1).max(64).optional(),
  pathname: z.string().optional(),
});

type Source = { id: string; title: string; url?: string; content: string };

const CURATED_HERITAGE_KNOWLEDGE: Array<{
  keywords: string[];
  titleVi: string;
  titleEn: string;
  contentVi: string;
  contentEn: string;
}> = [
  {
    keywords: ["bát tràng", "bat trang", "gốm", "men", "nung", "hỏa biến", "ceramic", "pottery", "glaze"],
    titleVi: "Hồ sơ Di sản Làng gốm Bát Tràng (Gia Lâm, Hà Nội)",
    titleEn: "Heritage Dossier: Bat Trang Pottery Village (Gia Lam, Hanoi)",
    contentVi: "Làng gốm Bát Tràng có lịch sử hơn 500 năm ven sông Hồng (hình thành từ thế kỷ 14 thời Lý - Trần). Quy trình tạo tác gồm 6 bước nghiêm ngặt: (1) Lắng lọc bùn sét phù sa qua 4 bể trong 3 tháng; (2) Chuốt phôi tay độc bản trên bàn xoay; (3) Phơi mộc và vẽ men lam dưới men; (4) Phủ men tro trấu nếp tự nhiên đa tầng; (5) Nung củi lò bầu liên tục 72 giờ ở nhiệt độ 1280°C; (6) Kiểm tra âm vang chuông đồng và cấp Hộ chiếu di sản số. Men tro trấu tự nhiên tạo chiều sâu ngọc bích, hoàn toàn không dùng hóa chất công nghiệp.",
    contentEn: "Bat Trang Pottery Village boasts over 500 years of history along the Red River. The making process strictly follows six ancestral phases: clay sediment filtration through 4 basins for 3 months, manual wheel-throwing, cobalt underglaze painting, natural rice-husk ash glazing, continuous 72-hour wood firing at 1280°C, and acoustic resonance testing."
  },
  {
    keywords: ["chất liệu", "đất sét", "men lam", "tro trấu", "material", "clay"],
    titleVi: "Quy chuẩn Chất liệu Gốm Sứ Bát Tràng Truyền Thống",
    titleEn: "Bat Trang Traditional Material Specifications",
    contentVi: "Chất liệu chế tác gốm Bát Tràng chuẩn di sản: Đất sét trắng pha sa khoáng phù sa sông Hồng lắng lọc 3 tháng để đạt độ dẻo cao và khả năng kết khối hoàn hảo. Men làm từ tro vỏ trấu nếp đốt tự nhiên hòa cùng bột đá thạch anh sông Hồng nghiền mịn. Màu lam được vẽ bằng oxit coban tự nhiên dưới men trước khi tráng men bóng, bền màu vĩnh cửu qua ngàn năm.",
    contentEn: "Authentic materials: Purified Red River alluvial clay aged 3 months, natural sticky-rice husk ash glaze infused with river quartz minerals, and cobalt underglaze pigments fired at 1280°C."
  },
  {
    keywords: ["ocop", "chứng nhận", "sao ocop", "tiêu chuẩn ocop"],
    titleVi: "Quy định & Trạng thái Chứng nhận OCOP của Hanoi CraftTrust",
    titleEn: "OCOP Certification Policy & Transparency",
    contentVi: "Hanoi CraftTrust cam kết trung thực 100% về di sản: Tuyệt đối không tự ý gắn sao OCOP cho sản phẩm khi chưa có Quyết định phê duyệt chính thức của Hội đồng Đánh giá & Phân hạng Sản phẩm OCOP UBND Thành phố Hà Nội (theo Quyết định số 919/QĐ-TTg của Thủ tướng Chính phủ). Với các tác phẩm đang trong quá trình nộp hồ sơ thẩm định, hệ thống thông báo rõ: 'Chưa có giấy chứng nhận OCOP được xác minh trong hệ thống' và cung cấp tiến độ thẩm định minh bạch.",
    contentEn: "CraftTrust strictly mandates authentic OCOP transparency. Products without official certification by the Hanoi People's Committee are labeled 'No verified OCOP certificate registered in the system', avoiding any fabricated ratings."
  },
  {
    keywords: ["qr", "hộ chiếu", "passport", "truy xuất", "quét", "mặt đáy"],
    titleVi: "Hướng dẫn Truy xuất Nguồn gốc & Mã QR Đáy Sản phẩm",
    titleEn: "Digital Heritage Passport & Base QR Traceability Guide",
    contentVi: "Mỗi hiện vật thủ công xuất xưởng từ CraftTrust được cấp một Hộ chiếu di sản số duy nhất (ví dụ mã DEMO: CT-BTG-NVA-2026-0085). Mã QR được tích hợp trực tiếp trên tem in dán dưới đáy sản phẩm thật và tem decal 3D dưới đáy mô hình số. Bạn có thể dùng camera điện thoại quét mã hoặc truy cập đường dẫn /trace/CT-BTG-NVA-2026-0085 để xem toàn bộ nguồn gốc đất sét, nghệ nhân, xưởng chế tác, video 6 công đoạn và lịch sử xác thực.",
    contentEn: "Each artifact carries a unique Digital Heritage Passport code (e.g. CT-BTG-NVA-2026-0085). The scannable QR is placed at the bottom base of both the physical item and the 3D model, linking directly to /trace/CT-BTG-NVA-2026-0085."
  },
  {
    keywords: ["vạn phúc", "van phuc", "lụa", "silk", "dệt", "tơ tằm"],
    titleVi: "Hồ sơ Di sản Làng lụa Vạn Phúc (Hà Đông, Hà Nội)",
    titleEn: "Heritage Dossier: Van Phuc Silk Weaving Village (Ha Dong, Hanoi)",
    contentVi: "Làng lụa Vạn Phúc có bề dày hơn 1.000 năm, nức danh với dòng 'Lụa Vân' dệt từ 100% sợi tơ tằm tự nhiên. Hoa văn sen, cúc, tùng được gài thủ công tinh tế trên khung dệt gỗ cổ truyền và nhuộm màu bằng thảo mộc tự nhiên củ nâu, lá chàm.",
    contentEn: "Van Phuc Silk Village spans over 1,000 years, renowned for 'Van Silk' woven from 100% natural mulberry silk cocoons and dyed using botanical extracts."
  },
  {
    keywords: ["phú vinh", "phu vinh", "mây tre", "bamboo", "rattan", "đan"],
    titleVi: "Hồ sơ Di sản Làng mây tre đan Phú Vinh (Chương Mỹ, Hà Nội)",
    titleEn: "Heritage Dossier: Phu Vinh Bamboo & Rattan Weaving Village",
    contentVi: "Làng mây tre đan Phú Vinh có lịch sử trên 400 năm, nổi tiếng với kỹ thuật chẻ nan mỏng như sợi chỉ và đan hoa văn tinh xảo. Các nghệ nhân tạo tác khay trà, giỏ hoa, đèn lồng nghệ thuật vươn tầm quốc tế.",
    contentEn: "Phu Vinh Village features 400+ years of fine rattan and bamboo craftsmanship, famous for thread-thin bamboo ribbons and intricate decorative weaves."
  },
  {
    keywords: ["quảng phú cầu", "quang phu cau", "hương", "nhang", "tăm hương"],
    titleVi: "Hồ sơ Di sản Làng tăm hương Quảng Phú Cầu (Ứng Hòa, Hà Nội)",
    titleEn: "Heritage Dossier: Quang Phu Cau Incense Village (Ung Hoa, Hanoi)",
    contentVi: "Làng tăm hương Quảng Phú Cầu hơn 100 năm tuổi, nổi tiếng với những vựa tăm hương đỏ thắm xòe rộng như đóa sen hồng và hương thơm thảo mộc tự nhiên từ trầm, hồi, quế, tùng không hóa chất độc hại.",
    contentEn: "Quang Phu Cau is renowned for its century-old aromatic incense making, natural botanical herbal scents, and striking crimson bundles."
  },
  {
    keywords: ["chàng sơn", "chang son", "mộc", "gỗ", "quạt"],
    titleVi: "Hồ sơ Di sản Làng mộc Chàng Sơn (Thạch Thất, Hà Nội)",
    titleEn: "Heritage Dossier: Chang Son Woodcraft Village (Thach That, Hanoi)",
    contentVi: "Cái nôi mộc chạm khắc truyền thống xứ Đoài gắn với kiến trúc Chùa Tây Phương. Kỹ thuật mộng gỗ tinh xảo không dùng đinh kim loại và nghề làm quạt giấy thủ công thanh nhã.",
    contentEn: "Chang Son is famous for architectural woodwork, mortise-and-tenon interlocking joinery without metal nails, and handmade traditional paper fans."
  },
  {
    keywords: ["nón chuông", "lang chuong", "nón lá", "thanh oai"],
    titleVi: "Hồ sơ Di sản Làng nón Chuông (Thanh Oai, Hà Nội)",
    titleEn: "Heritage Dossier: Chuong Conical Hat Village (Thanh Oai, Hanoi)",
    contentVi: "Làng nón Chuông bên dòng sông Đáy có truyền thống hơn 300 năm. Từng chiếc nón được chuốt từ lá lụi trắng mịn, khâu bằng sợi móc tinh tế, là biểu tượng duyên dáng của người phụ nữ Thăng Long - Hà Nội.",
    contentEn: "Chuong Village conical hats are stitched from white palm leaves with fine silken threads, carrying over 300 years of graceful Hanoi heritage."
  }
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Vui lòng nhập câu hỏi từ 2 đến 1000 ký tự.", issues: parsed.error.issues, received: body },
      { status: 400 }
    );
  }

  const isVi = parsed.data.locale !== "en";
  const userQ = parsed.data.question.toLowerCase();
  const supabase = createPublicSupabase();

  let contextProduct: any = null;
  let contextVillage: any = null;
  let sources: Source[] = [];

  // 1. Contextual Product Resolution
  if (parsed.data.productId && supabase) {
    try {
      const { data: prod } = await supabase
        .from("products")
        .select(`
          id, name, slug, price_vnd, height_cm, width_cm, model_status,
          artisans ( id, name, bio, years_practicing, villages ( id, name, district, story ) ),
          passport_records ( public_code, artifact_id, batch_code, status, tier )
        `)
        .eq("id", parsed.data.productId)
        .maybeSingle();

      if (prod) {
        contextProduct = prod;
        const art: any = Array.isArray(prod.artisans) ? prod.artisans[0] : prod.artisans;
        const vil: any = Array.isArray(art?.villages) ? art.villages[0] : art?.villages;
        const pass: any = Array.isArray(prod.passport_records) ? prod.passport_records[0] : prod.passport_records;

        sources.push({
          id: `product-context-${prod.id}`,
          title: `Hồ sơ sản phẩm hiện tại: ${prod.name}`,
          content: `Tác phẩm: ${prod.name}. Giá niêm yết: ${Number(prod.price_vnd).toLocaleString("vi-VN")} ₫. Kích thước thật: ${prod.height_cm || 32} cm cao × ${prod.width_cm || 18.5} cm rộng. Nghệ nhân: ${art?.name || "Nguyễn Văn An"} (${art?.years_practicing || 35} năm kinh nghiệm) tại làng ${vil?.name || "Bát Tràng"}. Mã định danh số Hộ chiếu di sản: ${pass?.public_code || "CT-BTG-NVA-2026-0085"}. Trạng thái OCOP: Chưa có giấy chứng nhận OCOP được xác minh trong hệ thống (đang hoàn thiện hồ sơ theo Bộ tiêu chí OCOP TP. Hà Nội).`,
        });
      }
    } catch (err) {
      console.warn("[assistant] Product context resolution error:", err);
    }
  }

  // 2. Keyword Matching in Curated Heritage Knowledge
  const matched = CURATED_HERITAGE_KNOWLEDGE.filter((item) =>
    item.keywords.some((kw) => userQ.includes(kw))
  );

  const pool = matched.length > 0 ? matched : [CURATED_HERITAGE_KNOWLEDGE[0]!];
  for (const item of pool) {
    sources.push({
      id: `heritage-knowledge-${item.titleVi}`,
      title: isVi ? item.titleVi : item.titleEn,
      content: isVi ? item.contentVi : item.contentEn,
    });
  }

  // 3. AI Generation with OpenAI / Gemini or Curated Synthesis
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || (process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined),
      });

      const systemPrompt = `Bạn là Trợ lý Di sản Số của nền tảng thương mại điện tử Hanoi CraftTrust ("Mỗi lần mua một lần về làng").
Nhiệm vụ: Tư vấn sản phẩm, nghệ nhân, chất liệu, kỹ thuật thủ công, bản đồ làng nghề và Hộ chiếu di sản số.

CÁC NGUYÊN TẮC BẮT BUỘC:
1. TRUNG THỰC VỀ OCOP: Tuyệt đối KHÔNG tự bịa đặt giấy chứng nhận OCOP hoặc số sao OCOP nếu hồ sơ chưa được chứng nhận. Nếu sản phẩm chưa có chứng nhận, phải trả lời rõ ràng: "Chưa có giấy chứng nhận OCOP được xác minh trong hệ thống, hiện đang trong quá trình nộp hồ sơ đánh giá phân hạng của Hội đồng OCOP TP. Hà Nội theo Quyết định 919/QĐ-TTg".
2. BÁM SÁT NGỮ CẢNH: Nếu người dùng đang xem một sản phẩm cụ thể, trả lời chính xác về sản phẩm đó (chất liệu đất sét, men tro trấu, kích thước, nghệ nhân, giá bán).
3. HỘ CHIẾU DI SẢN: Mã demo chuẩn là CT-BTG-NVA-2026-0085. Mã QR nằm ở tem đáy sản phẩm và mặt đáy mô hình 3D, mở đường link /trace/CT-BTG-NVA-2026-0085.
4. GIỌNG ĐIỆU: Ấm áp, nhã nhặn, tôn vinh tinh hoa làng nghề truyền thống Hà Nội, súc tích và mạch lạc.`;

      const userPrompt = `TƯ LIỆU THẨM ĐỊNH TỪ CƠ SỞ DỮ LIỆU:
${sources.map((s) => `[${s.title}]:\n${s.content}`).join("\n\n")}

CÂU HỎI CỦA KHÁCH HÀNG: "${parsed.data.question}"
Ngôn ngữ: ${isVi ? "Tiếng Việt chuẩn xác, trang nhã" : "English clearly and eloquently"}.`;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      });

      const answer = completion.choices[0]?.message?.content?.trim();
      if (answer) {
        return NextResponse.json({
          answer,
          citations: sources.map((s) => ({ title: s.title, url: s.url })),
          contextProduct: contextProduct ? { id: contextProduct.id, name: contextProduct.name } : null,
        });
      }
    } catch (err) {
      console.warn("[assistant] AI API error, falling back to curated synthesis:", err);
    }
  }

  // 4. Deterministic Curated Heritage Synthesis
  let synthesizedAnswer = "";
  if (contextProduct) {
    if (userQ.includes("chất liệu") || userQ.includes("làm từ gì") || userQ.includes("men")) {
      synthesizedAnswer = `Chiếc **${contextProduct.name}** được nghệ nhân ${contextProduct.artisans?.name || "Nguyễn Văn An"} (${contextProduct.artisans?.years_practicing || 35} năm tuổi nghề) vuốt tay độc bản từ **đất sét phù sa sông Hồng** lắng lọc 3 tháng qua 4 bể truyền thống. Lớp men được điều chế từ **men tro trấu nếp tự nhiên** phối bột đá thạch anh sông Hồng, vẽ họa tiết men lam cổ dưới men và nung củi liên tục 72 giờ ở nhiệt độ cao 1280°C.`;
    } else if (userQ.includes("ocop") || userQ.includes("chứng nhận")) {
      synthesizedAnswer = `Về chứng nhận OCOP: Tác phẩm **${contextProduct.name}** hiện **chưa có giấy chứng nhận OCOP được xác minh trong hệ thống**. Xưởng đang trong quy trình nộp hồ sơ đánh giá phân hạng sản phẩm OCOP theo Quyết định số 919/QĐ-TTg của Thủ tướng Chính phủ và hướng dẫn của Hội đồng OCOP TP. Hà Nội. Hanoi CraftTrust cam kết minh bạch thông tin và không tự gắn sao OCOP khi chưa có quyết định công nhận chính thức.`;
    } else if (userQ.includes("hộ chiếu") || userQ.includes("qr") || userQ.includes("truy xuất")) {
      synthesizedAnswer = `Tác phẩm này đã được cấp Hộ chiếu di sản số với mã định danh công khai **${contextProduct.passport_records?.public_code || "CT-BTG-NVA-2026-0085"}**. Bạn có thể xoay mô hình 3D để nhìn thấy dấu triện QR ở mặt đáy, hoặc truy cập trực tiếp tại đường dẫn: [Xem Hộ chiếu Di sản Số](/trace/${contextProduct.passport_records?.public_code || "CT-BTG-NVA-2026-0085"}) để tra cứu 6 công đoạn chế tác và bằng chứng thẩm định.`;
    } else {
      synthesizedAnswer = `Tác phẩm **${contextProduct.name}** có giá niêm yết chính hãng là **${Number(contextProduct.price_vnd).toLocaleString("vi-VN")} ₫**. Tác phẩm được chế tác thủ công bởi ${contextProduct.artisans?.name || "Nghệ nhân Nguyễn Văn An"} tại làng gốm Bát Tràng (Gia Lâm, Hà Nội). Bạn có thể xem bản sao số 3D/AR, kiểm tra tem QR đáy sản phẩm hoặc bấm 'Đặt mua' để sở hữu tác phẩm nguyên bản.`;
    }
  } else {
    const primary = sources[0]!;
    synthesizedAnswer = `${primary.content}\n\n✦ Bạn có thể quét mã QR dưới đáy sản phẩm hoặc mở mã Hộ chiếu di sản số để truy xuất toàn bộ bằng chứng nguồn gốc và quy trình chế tác đã được xác minh.`;
  }

  return NextResponse.json({
    answer: synthesizedAnswer,
    citations: sources.map((s) => ({ title: s.title, url: s.url })),
    contextProduct: contextProduct ? { id: contextProduct.id, name: contextProduct.name } : null,
  });
}

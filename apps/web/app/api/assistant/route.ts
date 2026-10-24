import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { createRequestSupabase } from "@/lib/supabase";

const schema = z.object({
  question: z.string().trim().min(2).max(500),
  locale: z.enum(["vi", "en"]).optional()
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
    contentVi: "Làng gốm Bát Tràng có lịch sử hơn 500 năm ven sông Hồng. Quy trình tạo tác gồm 5 bước nghiêm ngặt: (1) Lắng lọc bùn sét phù sa qua 4 bể; (2) Chuốt phôi tay độc bản trên bàn xoay; (3) Phơi mộc và tiện gọt chi tiết; (4) Phủ men tro thảo mộc hoặc men hỏa biến; (5) Nung củi lò bầu liên tục 72 giờ ở nhiệt độ 1250°C - 1280°C. Men hỏa biến đổi màu tự nhiên do biến thiên ngọn lửa, không dùng hóa chất.",
    contentEn: "Bat Trang Pottery Village boasts over 500 years of history along the Red River. The making process strictly follows five ancestral phases: silt clay sediment filtration through 4 basins, manual wheel-throwing, air-drying and trimming, organic ash glazing, and continuous 72-hour wood firing at 1250°C–1280°C."
  },
  {
    keywords: ["vạn phúc", "van phuc", "lụa", "silk", "dệt", "tơ tằm", "dệt lụa"],
    titleVi: "Hồ sơ Di sản Làng lụa Vạn Phúc (Hà Đông, Hà Nội)",
    titleEn: "Heritage Dossier: Van Phuc Silk Weaving Village (Ha Dong, Hanoi)",
    contentVi: "Làng lụa Vạn Phúc có bề dày hơn 1.000 năm, nức danh với dòng 'Lụa Vân' mỏng nhẹ, thoáng khí và đông ấm hè mát. Sử dụng 100% sợi tơ tằm tự nhiên từ kén tằm ăn lá dâu tằm sông Đáy. Hoa văn sen, cúc, tùng được gài thủ công tinh tế trên khung dệt gỗ cổ truyền và nhuộm màu bằng củ nâu, lá chàm tự nhiên.",
    contentEn: "Van Phuc Silk Village spans over 1,000 years, renowned for 'Van Silk' woven from 100% natural mulberry silk cocoons. Motifs are delicately hand-integrated on traditional wooden looms and dyed using botanical extracts."
  },
  {
    keywords: ["chàng sơn", "chang son", "mộc", "gỗ", "quạt", "wood", "carving"],
    titleVi: "Hồ sơ Di sản Làng mộc & quạt mỹ nghệ Chàng Sơn (Thạch Thất, Hà Nội)",
    titleEn: "Heritage Dossier: Chang Son Woodcarving & Fan Craft Village (Thach That, Hanoi)",
    contentVi: "Chàng Sơn là cái nôi chạm khắc gỗ nổi tiếng từ thời Lý - Trần. Nghệ nhân sử dụng kỹ thuật mộng gỗ 'âm dương' tinh xảo liên kết các khối gỗ tự nhiên mà không cần bất kỳ đinh ốc kim loại nào. Ngoài ra, làng còn nổi tiếng với nghề làm quạt giấy thủ công thanh tao.",
    contentEn: "Chang Son is the revered cradle of Northern Vietnamese woodcarving since the Ly-Tran dynasties, renowned for intricate mortise-and-tenon joints that require zero metal nails, alongside ceremonial handcrafted bamboo paper fans."
  },
  {
    keywords: ["phú vinh", "phu vinh", "mây tre", "bamboo", "rattan", "đan"],
    titleVi: "Hồ sơ Di sản Làng mây tre đan Phú Vinh (Chương Mỹ, Hà Nội)",
    titleEn: "Heritage Dossier: Phu Vinh Bamboo & Rattan Weaving Village (Chuong My, Hanoi)",
    contentVi: "Làng mây tre đan Phú Vinh có lịch sử trên 400 năm, nổi tiếng với kỹ thuật chẻ nan mỏng như sợi chỉ và đan hoa văn mắt cáo, đan nổi tinh xảo. Các sản phẩm khay trà, giỏ quà và đèn lồng mây tre xuất khẩu tới hơn 50 quốc gia.",
    contentEn: "Phu Vinh Village features 400+ years of fine rattan and bamboo craftsmanship. Artisans split bamboo into thread-thin ribbons and execute intricate lattice weaves exported to over 50 countries."
  },
  {
    keywords: ["phân biệt", "thật giả", "chọn gốm", "chính hãng", "fake", "real"],
    titleVi: "Cẩm nang Thẩm định: Phân biệt Gốm Bát Tràng thủ công",
    titleEn: "Appraisal Guide: Identifying Authentic Bat Trang Pottery",
    contentVi: "Cách phân biệt gốm Bát Tràng chính hãng: (1) Trọng lượng: Gốm Bát Tràng cốt sành dày dặn, cầm đầm tay; (2) Âm thanh: Khi gõ nhẹ bằng thanh tre hoặc đầu ngón tay, âm vang trong như chuông đồng do nung chín ở 1250°C; (3) Họa tiết: Vẽ tay thủ công nên nét vẽ mềm mại, uyển chuyển, không có hai chiếc giống hệt nhau như in decal công nghiệp; (4) Hộ chiếu số: Quét mã QR/NFC kiểm tra mã định danh và cấp độ chứng nhận.",
    contentEn: "Authentic Bat Trang verification: (1) Substantial heft due to thick wheel-thrown stoneware; (2) Resonant chime like a bronze bell when tapped; (3) Hand-painted variations in brushstrokes that avoid mechanical decal uniformity; (4) Cryptographic digital passport verification via dynamic NFC or QR code."
  },
  {
    keywords: ["tour", "du lịch", "tham quan", "bản đồ", "itinerary", "visit"],
    titleVi: "Cẩm nang Du lịch & Trải nghiệm Làng nghề Hà Nội",
    titleEn: "Travel Guide: Experiencing Hanoi Craft Villages",
    contentVi: "Hà Nội có hơn 1.350 làng nghề. Gợi ý 3 tuyến tour trải nghiệm trong ngày: Tuyến 1 'Sông Hồng' thăm Làng gốm Bát Tràng và Bảo tàng Gốm (14km); Tuyến 2 'Tơ lụa & Chùa cổ' thăm Làng lụa Vạn Phúc và Chùa Trầm (12km); Tuyến 3 'Xứ Đoài' thăm Chùa Tây Phương và Làng mộc Chàng Sơn (32km).",
    contentEn: "Hanoi hosts over 1,350 craft villages. Three curated day tours include: Route 1 'Red River' to Bat Trang Pottery & Ceramic Museum; Route 2 'Silk Trail' to Van Phuc and Tram Pagoda; Route 3 'Xu Doai' to Tay Phuong Pagoda and Chang Son Woodcraft Village."
  }
];

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Vui lòng nhập câu hỏi từ 2 đến 500 ký tự." },
      { status: 400 }
    );
  }

  const isVi = parsed.data.locale === "vi";
  const userQ = parsed.data.question.toLowerCase();

  // Step 1: Check Supabase RPC if configured
  const supabase = await createRequestSupabase();
  let sources: Source[] = [];

  if (supabase) {
    const { data } = await supabase.rpc("search_approved_heritage", {
      p_query: parsed.data.question,
      p_limit: 5
    });
    if (data && data.length > 0) {
      sources = (data as any[]).map((row) => ({
        id: row.source_id ?? row.id,
        title: row.source_title ?? row.title,
        url: row.source_url ?? undefined,
        content: row.content ?? row.excerpt
      }));
    }
  }

  // Step 2: Fallback to Curated Approved Heritage Knowledge Base
  if (sources.length === 0) {
    const matched = CURATED_HERITAGE_KNOWLEDGE.filter((item) =>
      item.keywords.some((kw) => userQ.includes(kw))
    );

    const defaultItem = CURATED_HERITAGE_KNOWLEDGE[0]!;
    const pool = matched.length > 0 ? matched : [defaultItem];

    sources = pool.map((item, idx) => {
      const valid = item ?? defaultItem;
      return {
        id: `heritage-doc-${idx + 1}`,
        title: isVi ? valid.titleVi : valid.titleEn,
        content: isVi ? valid.contentVi : valid.contentEn
      };
    });
  }

  // Step 3: If OpenAI is available, generate an enriched response
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `Bạn là Thuyết minh viên Di sản Thủ công Thăng Long - Hà Nội của nền tảng Hanoi Craft-Trust.
Hãy giải đáp câu hỏi của người dùng một cách trang nhã, ấm áp, sâu sắc văn hóa và hoàn toàn dựa trên tư liệu di sản sau:
${sources.map((s) => `[${s.title}]: ${s.content}`).join("\n\n")}

Câu hỏi của người dùng: "${parsed.data.question}"
Ngôn ngữ trả lời: ${isVi ? "Tiếng Việt chuẩn xác, giàu cảm xúc văn hóa" : "English clearly and eloquently"}.
Hãy kèm theo trích dẫn nguồn gốc di sản ở cuối câu trả lời.`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4
      });

      const reply = response.choices[0]?.message?.content?.trim();
      if (reply) {
        return NextResponse.json({
          answer: reply,
          citations: sources.map((s) => ({ title: s.title, url: s.url }))
        });
      }
    } catch (err) {
      console.warn("OpenAI generation failed, using direct curated synthesis:", err);
    }
  }

  // Step 4: Deterministic Curated Answer from Approved Heritage Sources
  const primary = sources[0] ?? {
    id: "default-doc",
    title: isVi ? "Di sản Thủ công Hà Nội" : "Hanoi Craft Heritage",
    content: isVi
      ? "Hà Nội là cái nôi của hơn 1.350 làng nghề truyền thống với hàng trăm năm tinh hoa văn hóa."
      : "Hanoi is the historic cradle of over 1,350 craft villages with centuries of cultural quintessence."
  };
  const greeting = isVi
    ? `Dựa trên tài liệu di sản đã được xác thực của ${primary.title}:`
    : `According to verified heritage records from ${primary.title}:`;

  const synthesized = `${greeting}\n\n${primary.content}\n\n${
    isVi
      ? "✦ Mọi chi tiết kỹ thuật và chất liệu đều được kiểm định độc lập và lưu trữ trong Hộ chiếu số di sản của tác phẩm."
      : "✦ All technical steps and materials are independently audited and recorded in the Digital Craft Passport."
  }`;

  return NextResponse.json({
    answer: synthesized,
    citations: sources.map((s) => ({ title: s.title, url: s.url }))
  });
}

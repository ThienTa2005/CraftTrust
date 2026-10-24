"use client";

import { BookOpenCheck, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { HeritageAssistant } from "@/components/heritage-assistant";
import { useLanguage } from "@/lib/i18n/context";

export function AssistantView() {
  const { locale, t } = useLanguage();

  return (
    <section className="shell page-hero">
      <span className="eyebrow">{locale === "vi" ? "Trợ lý tri thức di sản" : "Grounded heritage guide"}</span>
      <h1>{t.assistant.title}</h1>
      <p>{t.assistant.subtitle}</p>

      <div className="assistant-layout" style={{ marginTop: 32 }}>
        <aside className="panel">
          <h3>{locale === "vi" ? "Nguyên tắc đối chiếu" : "Guardrails"}</h3>
          <div className="evidence-list" style={{ marginTop: 18 }}>
            <div className="evidence">
              <BookOpenCheck color="var(--leaf)" />
              <div>
                <strong>{locale === "vi" ? "Chỉ dùng tư liệu đã duyệt" : "Approved sources only"}</strong>
                <br />
                <small>
                  {locale === "vi"
                    ? "Nội dung chưa qua thẩm định hoặc bị từ chối sẽ bị loại trừ."
                    : "Pending or rejected content is excluded."}
                </small>
              </div>
            </div>
            <div className="evidence">
              <ShieldCheck color="var(--leaf)" />
              <div>
                <strong>{locale === "vi" ? "Không bịa đặt thông tin" : "No invented certainty"}</strong>
                <br />
                <small>
                  {locale === "vi"
                    ? "Hệ thống từ chối trả lời nếu thiếu bằng chứng xác thực."
                    : "The guide declines when evidence is thin."}
                </small>
              </div>
            </div>
            <div className="evidence">
              <MessageCircleQuestion color="var(--leaf)" />
              <div>
                <strong>{locale === "vi" ? "Phạm vi chuyên sâu" : "Focused scope"}</strong>
                <br />
                <small>
                  {locale === "vi"
                    ? "Di sản làng nghề truyền thống Hà Nội và danh mục đã công bố."
                    : "Hanoi craft heritage and published catalog context."}
                </small>
              </div>
            </div>
          </div>
        </aside>
        <HeritageAssistant />
      </div>
    </section>
  );
}

"use client";

import { BadgeCheck, CircleAlert, LockKeyhole } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export default function TrustDocsPage() {
  const { locale } = useLanguage();

  if (locale === "vi") {
    return (
      <section className="shell page-hero">
        <span className="eyebrow">Tiêu chuẩn & Minh chứng di sản</span>
        <h1>Hanoi Craft-Trust chứng thực những gì — và phạm vi bảo chứng di sản.</h1>
        <p>
          Nền tảng lưu vết minh chứng xuất xứ, vật liệu, quy trình thủ công và hồ sơ giám định làng nghề.
          Chúng tôi xây dựng sự tin cậy dựa trên dữ liệu thật và sự thẩm định độc lập từ các nghệ nhân ưu tú cùng hội đồng chuyên gia.
        </p>

        <div className="grid three" style={{ marginTop: 34 }}>
          <article className="panel">
            <BadgeCheck size={28} style={{ color: "var(--leaf)", marginBottom: 12 }} />
            <h3>Cấp bậc Hộ chiếu (Đồng, Bạc, Vàng)</h3>
            <p>
              <strong>Hạng Đồng:</strong> Định danh nghệ nhân và xác thực nguồn gốc làng nghề.<br />
              <strong>Hạng Bạc:</strong> Đầy đủ chuẩn Đồng, kèm hồ sơ vật liệu tự nhiên và quy trình tạo tác thủ công.<br />
              <strong>Hạng Vàng:</strong> Chuẩn Bạc cộng thêm trích dẫn tư liệu di sản chuẩn mực và chứng thư thẩm duyệt của chuyên gia giám định.
            </p>
          </article>

          <article className="panel">
            <LockKeyhole size={28} style={{ color: "var(--terracotta)", marginBottom: 12 }} />
            <h3>Cơ chế thẩm định độc lập</h3>
            <p>
              Nghệ nhân gửi hồ sơ minh chứng; Hội đồng thẩm định độc lập đánh giá.
              Cơ chế phân quyền dữ liệu nghiêm ngặt, nhật ký xét duyệt bất biến và dấu vết kiểm toán bảo đảm tính khách quan tuyệt đối.
            </p>
          </article>

          <article className="panel">
            <CircleAlert size={28} style={{ color: "#d97706", marginBottom: 12 }} />
            <h3>Ranh giới & Trách nhiệm minh bạch</h3>
            <p>
              Cấp độ Hộ chiếu phản ánh mức độ hoàn thiện của hồ sơ bằng chứng được phê duyệt;
              không thay thế giấy giám định cổ vật hay định giá thương mại nằm ngoài các tài liệu lưu trữ đã được xác minh.
            </p>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="shell page-hero">
      <span className="eyebrow">Trust documentation</span>
      <h1>What Hanoi Craft-Trust verifies—and what it does not.</h1>
      <p>
        The platform records reviewable evidence and makes the coverage legible. It does not turn incomplete records into certainty.
      </p>

      <div className="grid three" style={{ marginTop: 34 }}>
        <article className="panel">
          <BadgeCheck size={28} style={{ color: "var(--leaf)", marginBottom: 12 }} />
          <h3>Evidence tiers</h3>
          <p>
            <strong>Bronze:</strong> Identity and origin. <strong>Silver:</strong> Bronze plus natural materials and process documentation. <strong>Gold:</strong> Silver plus approved heritage citations and independent verifier attestation.
          </p>
        </article>

        <article className="panel">
          <LockKeyhole size={28} style={{ color: "var(--terracotta)", marginBottom: 12 }} />
          <h3>Controlled decisions</h3>
          <p>
            Sellers submit evidence; independent verifiers decide. Database authorization, immutable review logs, and audit events preserve strict separation of duties.
          </p>
        </article>

        <article className="panel">
          <CircleAlert size={28} style={{ color: "#d97706", marginBottom: 12 }} />
          <h3>Boundaries</h3>
          <p>
            Tiers reflect reviewed evidence coverage. They are not legal certification, antique appraisal, or guarantees beyond the cited evidence and verified sources.
          </p>
        </article>
      </div>
    </section>
  );
}

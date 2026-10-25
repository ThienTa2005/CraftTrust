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
            <h3>Hồ sơ Hộ chiếu Di sản Số</h3>
            <p>
              Mỗi tác phẩm lưu trữ định danh nghệ nhân, xác thực xuất xứ làng nghề, nhật ký quy trình tạo tác thủ công, cùng tư liệu di sản chuẩn mực và chứng thư thẩm duyệt của hội đồng chuyên gia.
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
              Hồ sơ Hộ chiếu phản ánh mức độ hoàn thiện của tư liệu bằng chứng được phê duyệt;
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
          <h3>Digital Heritage Passport Standard</h3>
          <p>
            Each piece records verified artisan identity, craft village origin, material sourcing, process documentation, and accredited heritage citations approved by independent experts.
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
            Passports reflect reviewed evidence coverage. They are not legal certification, antique appraisal, or guarantees beyond the cited evidence and verified sources.
          </p>
        </article>
      </div>
    </section>
  );
}

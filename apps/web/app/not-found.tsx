"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";

export default function NotFound() {
  const { locale } = useLanguage();

  if (locale === "vi") {
    return (
      <section className="shell page-hero" style={{ textAlign: "center", padding: "60px 20px" }}>
        <span className="eyebrow">404 · Không tìm thấy</span>
        <h1 style={{ marginTop: 12 }}>Dấu chân làng nghề dừng tại đây.</h1>
        <p style={{ maxWidth: 520, margin: "16px auto 28px", color: "var(--muted)" }}>
          Trang bạn tìm kiếm hoặc mã định danh hộ chiếu này không tồn tại hoặc chưa được công bố công khai trên hệ thống.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/" className="button terracotta">
            Về trang chủ
          </Link>
          <Link href="/marketplace" className="button secondary">
            Khám phá bộ sưu tập
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="shell page-hero" style={{ textAlign: "center", padding: "60px 20px" }}>
      <span className="eyebrow">404 · Not found</span>
      <h1 style={{ marginTop: 12 }}>This craft trail ends here.</h1>
      <p style={{ maxWidth: 520, margin: "16px auto 28px", color: "var(--muted)" }}>
        The page or passport identifier does not exist, or is not publicly available.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link href="/" className="button terracotta">
          Return home
        </Link>
        <Link href="/marketplace" className="button secondary">
          Explore collection
        </Link>
      </div>
    </section>
  );
}

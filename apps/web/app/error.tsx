"use client";

import { useLanguage } from "@/lib/i18n/context";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { locale } = useLanguage();

  return (
    <div className="shell page-hero" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div className="error-banner" role="alert" style={{ maxWidth: 600, margin: "0 auto", padding: "20px 24px" }}>
        <p style={{ margin: "0 0 16px 0", fontSize: "1.05rem" }}>
          {locale === "vi"
            ? "Đã xảy ra sự cố trong quá trình tải dữ liệu trang."
            : "Something went wrong while loading this view."}
        </p>
        <button className="button small" onClick={reset} type="button">
          {locale === "vi" ? "Thử tải lại" : "Try again"}
        </button>
      </div>
    </div>
  );
}

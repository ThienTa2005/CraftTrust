"use client";

import { CheckoutForm } from "@/components/checkout-form";
import { useLanguage } from "@/lib/i18n/context";

export function CheckoutView() {
  const { locale, t } = useLanguage();

  return (
    <section className="shell page-hero" style={{ maxWidth: 760 }}>
      <span className="eyebrow">{locale === "vi" ? "Thanh toán an toàn" : "Secure checkout"}</span>
      <h1>{t.checkout.title}</h1>
      <p>
        {locale === "vi"
          ? "Hệ thống hỗ trợ quy trình thử nghiệm thanh toán có kiểm toán (test checkout). Chưa tích hợp cổng thanh toán thực tế."
          : "This vertical slice deliberately supports test checkout only. A production payment provider has not been configured."}
      </p>
      <CheckoutForm />
    </section>
  );
}

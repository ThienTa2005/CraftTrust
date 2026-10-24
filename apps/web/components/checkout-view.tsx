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
          ? "Đơn hàng của bạn sẽ được chuyển trực tiếp tới các xưởng nghệ nhân làng nghề để chế tác, kiểm tra phẩm cấp và đóng gói cẩn trọng."
          : "Your order is sent directly to artisan workshops for authentic crafting, quality verification, and careful packaging."}
      </p>
      <CheckoutForm />
    </section>
  );
}

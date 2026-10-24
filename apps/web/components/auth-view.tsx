"use client";

import { AuthForm } from "@/components/auth-form";
import { BrandLogo } from "@/components/brand-logo";
import { useLanguage } from "@/lib/i18n/context";

export function AuthView() {
  const { locale } = useLanguage();

  return (
    <section className="shell auth-page">
      <div className="auth-intro">
        <BrandLogo />
        <span className="eyebrow">
          {locale === "vi"
            ? "Tài khoản CraftTrust"
            : "CraftTrust account"}
        </span>
        <h1>
          {locale === "vi"
            ? "Một tài khoản, hai hành trình."
            : "One account, two journeys."}
        </h1>
        <p>
          {locale === "vi"
            ? "Đăng nhập để mua tác phẩm, theo dõi đơn hàng hoặc mở xưởng số dành cho nghệ nhân. Tài khoản bán hàng vẫn có đầy đủ quyền mua hàng."
            : "Sign in to buy pottery, track orders, or open an artisan studio. Seller accounts can also shop normally."}
        </p>
        <div className="auth-benefits">
          <span>
            01 ·{" "}
            {locale === "vi"
              ? "Giỏ hàng và đơn mua được lưu theo tài khoản"
              : "Saved cart and purchase history"}
          </span>
          <span>
            02 ·{" "}
            {locale === "vi"
              ? "Xưởng người bán có công cụ tạo mô hình 3D"
              : "Seller studio includes 3D model creation"}
          </span>
          <span>
            03 ·{" "}
            {locale === "vi"
              ? "Thông tin mua hàng và gian hàng được bảo vệ"
              : "Your shopping and workshop information is protected"}
          </span>
        </div>
      </div>
      <AuthForm />
    </section>
  );
}

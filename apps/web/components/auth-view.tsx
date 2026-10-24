"use client";

import { AuthForm } from "@/components/auth-form";
import { useLanguage } from "@/lib/i18n/context";

export function AuthView() {
  const { locale, t } = useLanguage();

  return (
    <section className="shell page-hero" style={{ maxWidth: 680 }}>
      <span className="eyebrow">{locale === "vi" ? "Tài khoản bảo mật" : "Secure Account"}</span>
      <h1>{t.auth.title}</h1>
      <p>
        {locale === "vi"
          ? "Đăng nhập nhanh không cần nhớ mật khẩu thông qua liên kết xác thực một lần. Quyền hạn và dữ liệu được bảo vệ nghiêm ngặt bằng cơ chế Row-Level Security (RLS) của PostgreSQL."
          : "Sign in without a password. Supabase Auth sends a one-time link. Roles and data access are enforced again inside PostgreSQL by row-level security."}
      </p>
      <AuthForm />
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, ShoppingBag, Store, UserPlus, ShieldCheck } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useLanguage } from "@/lib/i18n/context";

type AuthMode = "sign-in" | "sign-up";
type AccountType = "customer" | "seller";

export function AuthForm() {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function redirectForCurrentUser() {
    const supabase = createBrowserSupabase();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      router.replace("/marketplace");
      router.refresh();
      return;
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const roles = (roleRows ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("verifier");
    const isSeller = roles.includes("seller") || roles.includes("artisan");

    const requestedNext = (searchParams.get("next") || searchParams.get("redirect"))?.trim();
    const isSafeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//");

    let target = "/marketplace";
    if (isSafeNext) {
      if (requestedNext.startsWith("/admin")) {
        target = isAdmin ? requestedNext : "/marketplace";
      } else if (requestedNext.startsWith("/seller")) {
        target = (isSeller || isAdmin) ? requestedNext : "/marketplace";
      } else {
        target = requestedNext;
      }
    } else {
      if (isAdmin) {
        target = "/admin";
      } else if (isSeller) {
        target = "/seller";
      } else {
        target = "/marketplace";
      }
    }

    window.location.href = target;
  }

  function handleFillAccount(roleType: "admin" | "seller" | "buyer") {
    setMode("sign-in");
    setStatus(null);
    if (roleType === "admin") {
      setEmail("admin@crafttrust.vn");
      setPassword("12345678");
    } else if (roleType === "seller") {
      setEmail("seller@crafttrust.vn");
      setPassword("12345678");
    } else {
      setEmail("buyer@crafttrust.vn");
      setPassword("12345678");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (mode === "sign-up" && password !== confirmPassword) {
      setStatus({
        kind: "error",
        text:
          locale === "vi"
            ? "Mật khẩu nhập lại chưa khớp."
            : "Passwords do not match.",
      });
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        await redirectForCurrentUser();
        return;
      }

      const next = accountType === "seller" ? "/seller" : "/marketplace";
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { display_name: displayName.trim(), account_type: accountType },
        },
      });
      if (error) throw error;

      if (data.session) {
        await redirectForCurrentUser();
        return;
      }
      setStatus({
        kind: "success",
        text:
          locale === "vi"
            ? "Đăng ký thành công. Hãy mở email để xác nhận tài khoản rồi đăng nhập."
            : "Registration succeeded. Confirm your email, then sign in.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : locale === "vi"
              ? "Không thể hoàn tất xác thực."
              : "Authentication could not be completed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div
        className="auth-tabs"
        role="tablist"
        aria-label={
          locale === "vi"
            ? "Chọn hình thức xác thực"
            : "Choose authentication mode"
        }
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sign-in"}
          className={mode === "sign-in" ? "active" : ""}
          onClick={() => {
            setMode("sign-in");
            setStatus(null);
          }}
        >
          <LogIn size={17} /> {locale === "vi" ? "Đăng nhập" : "Sign in"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sign-up"}
          className={mode === "sign-up" ? "active" : ""}
          onClick={() => {
            setMode("sign-up");
            setStatus(null);
          }}
        >
          <UserPlus size={17} /> {locale === "vi" ? "Đăng ký" : "Register"}
        </button>
      </div>

      <form className="auth-password-form" onSubmit={submit}>
        {mode === "sign-up" ? (
          <>
            <div className="auth-field">
              <label htmlFor="display-name">
                {locale === "vi"
                  ? "Họ và tên / tên nghệ nhân"
                  : "Full name / artisan name"}
              </label>
              <input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                minLength={2}
                maxLength={120}
                autoComplete="name"
                required
                placeholder="Nguyễn Minh An"
              />
            </div>

            <fieldset className="auth-account-types">
              <legend>
                {locale === "vi"
                  ? "Bạn muốn sử dụng tài khoản để"
                  : "I want to use this account to"}
              </legend>
              <label className={accountType === "customer" ? "active" : ""}>
                <input
                  type="radio"
                  name="accountType"
                  value="customer"
                  checked={accountType === "customer"}
                  onChange={() => setAccountType("customer")}
                />
                <ShoppingBag />
                <span>
                  <strong>
                    {locale === "vi" ? "Mua hàng" : "Buy pottery"}
                  </strong>
                  <small>
                    {locale === "vi"
                      ? "Khám phá, đặt hàng và theo dõi đơn"
                      : "Browse, order and track purchases"}
                  </small>
                </span>
              </label>
              <label className={accountType === "seller" ? "active" : ""}>
                <input
                  type="radio"
                  name="accountType"
                  value="seller"
                  checked={accountType === "seller"}
                  onChange={() => setAccountType("seller")}
                />
                <Store />
                <span>
                  <strong>
                    {locale === "vi" ? "Bán hàng" : "Sell pottery"}
                  </strong>
                  <small>
                    {locale === "vi"
                      ? "Có cả quyền mua hàng và xưởng nghệ nhân"
                      : "Includes buying and artisan studio access"}
                  </small>
                </span>
              </label>
            </fieldset>
          </>
        ) : null}

        {mode === "sign-in" && (
          <div style={{ marginBottom: 16, padding: "10px 12px", background: "var(--surface-muted, #f8f6f0)", borderRadius: 8, border: "1px dashed var(--line, #e2d9cc)" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)", display: "block", marginBottom: 6 }}>
              {locale === "vi" ? "⚡ Chọn nhanh vai trò đăng nhập:" : "⚡ Quick test account selector:"}
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button secondary small"
                style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                onClick={() => handleFillAccount("admin")}
              >
                <ShieldCheck size={13} style={{ color: "var(--gold, #b8860b)" }} /> Quản trị viên (Admin)
              </button>
              <button
                type="button"
                className="button secondary small"
                style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                onClick={() => handleFillAccount("seller")}
              >
                <Store size={13} style={{ color: "var(--terracotta, #c85a32)" }} /> Nghệ nhân (Seller)
              </button>
              <button
                type="button"
                className="button secondary small"
                style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                onClick={() => handleFillAccount("buyer")}
              >
                <ShoppingBag size={13} style={{ color: "var(--navy, #0c2340)" }} /> Khách mua (Buyer)
              </button>
            </div>
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="ban@example.com"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">
            {locale === "vi" ? "Mật khẩu" : "Password"}
          </label>
          <div className="auth-password-input">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              placeholder={
                locale === "vi" ? "Tối thiểu 8 ký tự" : "At least 8 characters"
              }
            />
            <button
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {mode === "sign-up" ? (
          <div className="auth-field">
            <label htmlFor="confirm-password">
              {locale === "vi" ? "Nhập lại mật khẩu" : "Confirm password"}
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
        ) : null}

        <button className="button terracotta auth-submit" disabled={busy}>
          {mode === "sign-in" ? <LogIn size={18} /> : <UserPlus size={18} />}
          {busy
            ? locale === "vi"
              ? "Đang xử lý…"
              : "Working…"
            : mode === "sign-in"
              ? locale === "vi"
                ? "Đăng nhập"
                : "Sign in"
              : locale === "vi"
                ? "Tạo tài khoản"
                : "Create account"}
        </button>

        {status ? (
          <div className={`auth-status ${status.kind}`} role="status">
            {status.text}
          </div>
        ) : null}
      </form>
    </div>
  );
}

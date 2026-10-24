"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, ShoppingBag, Store, UserPlus } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useLanguage } from "@/lib/i18n/context";

type AuthMode = "sign-in" | "sign-up";
type AccountType = "customer" | "seller";

export function AuthForm() {
  const { locale } = useLanguage();
  const router = useRouter();
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
    const { data } = await supabase.from("user_roles").select("role");
    const isSeller = (data ?? []).some(
      (row) => row.role === "seller" || row.role === "artisan",
    );
    router.push(isSeller ? "/seller" : "/marketplace");
    router.refresh();
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

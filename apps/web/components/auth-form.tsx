"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useLanguage } from "@/lib/i18n/context";

export function AuthForm() {
  const { locale, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
      setStatus(
        locale === "vi"
          ? "Đã gửi liên kết đăng nhập an toàn tới hộp thư của bạn."
          : "Check your email for the secure sign-in link."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : locale === "vi"
          ? "Không thể gửi liên kết đăng nhập."
          : "Could not start sign-in."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form-stack" onSubmit={signIn}>
      <div className="field">
        <label htmlFor="email">{t.auth.email}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="artisan@craft-trust.vn"
        />
      </div>
      <button className="button terracotta" disabled={busy}>
        {busy ? t.auth.sending : t.auth.magicLink}
      </button>
      {status ? <p role="status" style={{ marginTop: 10 }}>{status}</p> : null}
    </form>
  );
}

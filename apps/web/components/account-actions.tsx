"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Store, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useLanguage } from "@/lib/i18n/context";

export function AccountActions({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { locale } = useLanguage();
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      return createBrowserSupabase();
    } catch {
      return null;
    }
  }, []);
  const [email, setEmail] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    async function syncAccount(userEmail?: string | null) {
      if (!userEmail) {
        setEmail(null);
        setIsSeller(false);
        setReady(true);
        return;
      }
      setEmail(userEmail);
      const { data } = await supabase!.from("user_roles").select("role");
      setIsSeller(
        (data ?? []).some(
          (row) => row.role === "seller" || row.role === "artisan",
        ),
      );
      setReady(true);
    }

    void supabase.auth
      .getUser()
      .then(({ data }) => syncAccount(data.user?.email));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void syncAccount(session?.user.email);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (!ready || !email) {
    return (
      <Link
        href="/auth"
        className="button secondary small"
        {...(onNavigate ? { onClick: onNavigate } : {})}
      >
        <UserRound size={16} /> {locale === "vi" ? "Đăng nhập" : "Sign in"}
      </Link>
    );
  }

  return (
    <div className={`account-actions${mobile ? " mobile" : ""}`}>
      <Link
        href={isSeller ? "/seller" : "/orders"}
        className="account-chip"
        {...(onNavigate ? { onClick: onNavigate } : {})}
        title={email}
      >
        {isSeller ? <Store size={16} /> : <UserRound size={16} />}
        <span>
          {isSeller ? (locale === "vi" ? "Xưởng của tôi" : "My studio") : email}
        </span>
      </Link>
      <button
        type="button"
        className="button secondary small"
        onClick={() => void signOut()}
      >
        <LogOut size={16} /> {locale === "vi" ? "Đăng xuất" : "Sign out"}
      </button>
    </div>
  );
}

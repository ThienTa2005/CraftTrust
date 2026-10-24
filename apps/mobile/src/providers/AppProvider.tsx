import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { createClientBundle, type ClientBundle } from "../lib/client";
import { readPublicConfig } from "../lib/config";
import { mobileTranslations, type Locale, type MobileTranslations } from "../lib/i18n";

interface AppContextValue {
  bundle: ClientBundle | null;
  session: Session | null;
  authLoading: boolean;
  missingConfig: string[];
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: MobileTranslations;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const configResult = useMemo(readPublicConfig, []);
  const bundle = useMemo(() => (configResult.config ? createClientBundle(configResult.config) : null), [configResult.config]);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(bundle));
  const [locale, setLocale] = useState<Locale>("vi");

  useEffect(() => {
    if (!bundle) return;
    let active = true;
    void bundle.supabase.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setAuthLoading(false); }
    });
    const { data } = bundle.supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [bundle]);

  const value = useMemo<AppContextValue>(() => ({
    bundle,
    session,
    authLoading,
    missingConfig: configResult.missing,
    locale,
    setLocale,
    t: mobileTranslations[locale]
  }), [bundle, session, authLoading, configResult.missing, locale]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

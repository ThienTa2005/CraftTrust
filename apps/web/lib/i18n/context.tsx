"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale, TranslationDictionary } from "./types";
import { translations } from "./translations";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationDictionary;
  hydrated: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "hct_locale";
const COOKIE_NAME = "hct_lang";

export function LanguageProvider({
  children,
  initialLocale = "vi",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read persisted choice if available, otherwise keep default 'vi'
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "vi" || saved === "en") {
        setLocaleState(saved);
        document.cookie = `${COOKIE_NAME}=${saved}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = saved;
      } else {
        document.cookie = `${COOKIE_NAME}=vi; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = "vi";
      }
    } catch {
      // Fallback in environments without localStorage
    }
    setHydrated(true);
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(STORAGE_KEY, nextLocale);
      document.cookie = `${COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = nextLocale;
    } catch {
      // Storage unavailable
    }
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: translations[locale],
      hydrated,
    }),
    [locale, hydrated],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      locale: "vi" as Locale,
      setLocale: () => {},
      t: translations.vi,
      hydrated: true,
    };
  }
  return context;
}

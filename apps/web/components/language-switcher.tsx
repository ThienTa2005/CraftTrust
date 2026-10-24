"use client";

import { useLanguage } from "@/lib/i18n/context";
import { Globe } from "lucide-react";

export function LanguageSwitcher({
  compact = false,
  onChange,
}: {
  compact?: boolean;
  onChange?: () => void;
}) {
  const { locale, setLocale, hydrated } = useLanguage();

  const handleSwitch = (nextLocale: "vi" | "en") => {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
    onChange?.();
  };

  if (compact) {
    return (
      <div
        className="language-switcher compact"
        role="group"
        aria-label="Language selector"
      >
        <button
          type="button"
          className={`lang-btn ${locale === "vi" ? "active" : ""}`}
          onClick={() => handleSwitch("vi")}
          title="Tiếng Việt"
          aria-pressed={locale === "vi"}
          disabled={!hydrated}
        >
          VI
        </button>
        <span className="lang-sep">/</span>
        <button
          type="button"
          className={`lang-btn ${locale === "en" ? "active" : ""}`}
          onClick={() => handleSwitch("en")}
          title="English"
          aria-pressed={locale === "en"}
          disabled={!hydrated}
        >
          EN
        </button>
      </div>
    );
  }

  return (
    <div
      className="language-switcher"
      role="group"
      aria-label="Language selector"
    >
      <Globe size={15} className="lang-icon" aria-hidden="true" />
      <button
        type="button"
        className={`lang-btn ${locale === "vi" ? "active" : ""}`}
        onClick={() => handleSwitch("vi")}
        aria-pressed={locale === "vi"}
        disabled={!hydrated}
      >
        <span aria-hidden="true">🇻🇳</span> Tiếng Việt
      </button>
      <button
        type="button"
        className={`lang-btn ${locale === "en" ? "active" : ""}`}
        onClick={() => handleSwitch("en")}
        aria-pressed={locale === "en"}
        disabled={!hydrated}
      >
        <span aria-hidden="true">🇬🇧</span> English
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Leaf, Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader() {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell nav">
        <Link href="/" className="brand" aria-label="Hanoi Craft-Trust home">
          <span className="brand-mark"><Leaf size={18} /></span>
          <span>Hanoi Craft-Trust</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/marketplace">{t.nav.marketplace}</Link>
          <Link href="/villages">{t.nav.villages}</Link>
          <Link href="/map">{t.nav.map}</Link>
          <Link href="/rewards">{t.nav.rewards}</Link>
          <Link href="/passport/HCT-DEMO-BT-001">{t.nav.passport}</Link>
          <Link href="/assistant">{t.nav.assistant}</Link>
        </nav>

        <div className="nav-actions">
          <LanguageSwitcher />
          <Link href="/auth" className="button secondary small">{t.nav.signIn}</Link>
          <Link href="/cart" className="button small" aria-label={t.nav.cart}>
            <ShoppingBag size={16} />
            <span>{t.nav.cart}</span>
          </Link>
          <button
            type="button"
            className="mobile-nav-toggle mobile-nav"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
            style={{
              background: "none",
              border: "none",
              padding: 6,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              transition: "transform var(--dur-fast) var(--ease-spring), background-color var(--dur-fast) ease"
            }}
          >
            {mobileOpen ? <X size={24} style={{ animation: "fade-scale-in 0.2s var(--ease-spring)" }} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-drawer" style={{
          padding: "16px 20px 24px",
          borderTop: "1px solid var(--line)",
          background: "var(--paper)",
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
          <Link href="/marketplace" onClick={() => setMobileOpen(false)}>{t.nav.marketplace}</Link>
          <Link href="/villages" onClick={() => setMobileOpen(false)}>{t.nav.villages}</Link>
          <Link href="/map" onClick={() => setMobileOpen(false)}>{t.nav.map}</Link>
          <Link href="/rewards" onClick={() => setMobileOpen(false)}>{t.nav.rewards}</Link>
          <Link href="/passport/HCT-DEMO-BT-001" onClick={() => setMobileOpen(false)}>{t.nav.passport}</Link>
          <Link href="/assistant" onClick={() => setMobileOpen(false)}>{t.nav.assistant}</Link>
          <div style={{ paddingTop: 8, borderTop: "1px solid var(--line)", display: "flex", gap: 12, alignItems: "center" }}>
            <LanguageSwitcher />
            <Link href="/auth" className="button secondary small" onClick={() => setMobileOpen(false)}>{t.nav.signIn}</Link>
          </div>
        </div>
      )}
    </header>
  );
}

"use client";

import Link from "next/link";
import { Leaf, Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { AccountActions } from "./account-actions";
import { BrandLogo } from "./brand-logo";

export function SiteHeader() {
  const { t, hydrated } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell nav">
        <Link href="/" className="brand" aria-label="CraftTrust · Hanoi Craft-Trust">
          <BrandLogo compact />
          <span className="brand-wordmark">
            <strong>CraftTrust</strong>
            <small>Di sản Hà Nội · Hộ chiếu số</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/marketplace">{t.nav.marketplace}</Link>
          <Link href="/villages">{t.nav.villages}</Link>
          <Link href="/map">{t.nav.map}</Link>
          <Link href="/rewards">{t.nav.rewards}</Link>
          <Link href="/trace/CT-BTG-NVA-2026-0085">{t.nav.passport}</Link>
          <Link href="/assistant">{t.nav.assistant}</Link>
        </nav>

        <div className="nav-actions">
          <LanguageSwitcher />
          <AccountActions />
          <Link href="/cart" className="button small" aria-label={t.nav.cart}>
            <ShoppingBag size={16} />
            <span>{t.nav.cart}</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            className="mobile-nav-toggle mobile-nav"
            disabled={!hydrated}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-drawer">
          <Link href="/marketplace" onClick={() => setMobileOpen(false)}>
            {t.nav.marketplace}
          </Link>
          <Link href="/villages" onClick={() => setMobileOpen(false)}>
            {t.nav.villages}
          </Link>
          <Link href="/map" onClick={() => setMobileOpen(false)}>
            {t.nav.map}
          </Link>
          <Link href="/rewards" onClick={() => setMobileOpen(false)}>
            {t.nav.rewards}
          </Link>
          <Link
            href="/trace/CT-BTG-NVA-2026-0085"
            onClick={() => setMobileOpen(false)}
          >
            {t.nav.passport}
          </Link>
          <Link href="/assistant" onClick={() => setMobileOpen(false)}>
            {t.nav.assistant}
          </Link>
          <div className="mobile-drawer-actions">
            <LanguageSwitcher onChange={() => setMobileOpen(false)} />
            <AccountActions mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}

"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";

import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ marginBottom: 12 }}>
              <BrandLogo compact />
              <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>CraftTrust</span>
            </div>
            <p>{t.footer.brandTagline}</p>
          </div>
          <div className="footer-col">
            <strong>{t.footer.explore}</strong>
            <Link href="/marketplace">{t.footer.marketplace}</Link>
            <Link href="/villages">{t.footer.villages}</Link>
            <Link href="/map">{t.nav.map}</Link>
            <Link href="/rewards">{t.nav.rewards}</Link>
            <Link href="/assistant">{t.footer.heritageGuide}</Link>
          </div>
          <div className="footer-col">
            <strong>{t.footer.trust}</strong>
            <Link href="/trace/CT-BTG-NVA-2026-0085">
              {t.footer.digitalPassports}
            </Link>
            <Link href="/docs">{t.footer.evidencePolicy}</Link>
            <span>{t.footer.testOnlyNote}</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t.footer.copyright}</span>
          <span>{t.footer.mission}</span>
        </div>
      </div>
    </footer>
  );
}

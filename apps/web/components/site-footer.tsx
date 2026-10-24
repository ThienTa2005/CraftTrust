"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <div className="brand">
              <span className="brand-mark">
                <Leaf size={18} />
              </span>
              <span>Bát Tràng Craft</span>
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
            <strong>{t.footer.partners}</strong>
            <Link href="/seller">{t.footer.sellerStudio}</Link>
            <Link href="/admin">{t.footer.verificationDesk}</Link>
            <Link href="/auth">{t.footer.account}</Link>
          </div>
          <div className="footer-col">
            <strong>{t.footer.trust}</strong>
            <Link href="/passport/HCT-VN-BT-001">
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

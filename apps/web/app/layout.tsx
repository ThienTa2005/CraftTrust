import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/config";
import { LanguageProvider } from "@/lib/i18n/context";
import { getServerLocale } from "@/lib/i18n/server";

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-body",
});

const displayFont = Fraunces({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.siteUrl),
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${displayFont.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <LanguageProvider initialLocale={locale}>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}

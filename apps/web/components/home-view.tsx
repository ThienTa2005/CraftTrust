"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, BookOpen, MapPin, QrCode, ShieldCheck } from "lucide-react";
import { DataNotice } from "@/components/data-state";
import { ProductCard } from "@/components/product-card";
import type { ProductCard as Product, VillageCard } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";

interface HomeViewProps {
  villages: VillageCard[];
  products: Product[];
  demo: boolean;
  error?: string | undefined;
}

export function HomeView({ villages, products, demo, error }: HomeViewProps) {
  const { locale, t } = useLanguage();

  return (
    <>
      <section className="hero shell">
        <div className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1>{t.hero.title}</h1>
            <p>{t.hero.subtitle}</p>
            <div className="hero-actions">
              <Link className="button terracotta" href="/marketplace">
                {t.hero.exploreMarketplace}
              </Link>
              <Link className="button secondary" href="/villages">
                {t.hero.visitVillages}
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <Image
              src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1500&q=90"
              alt="Hands shaping a ceramic vessel"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 48vw"
            />
            <div className="floating-proof">
              <div className="proof-top">
                <span className="proof-seal"><ShieldCheck size={22} /></span>
                <div>
                  <strong>{t.hero.goldPassport}</strong>
                  <br />
                  <span>{t.hero.evidenceReviewed}</span>
                </div>
              </div>
              <p>{t.hero.proofDesc}</p>
            </div>
          </div>
        </div>

        <div className="trust-strip">
          <div className="trust-item">
            <MapPin size={20} />
            <div>
              <strong>{t.hero.trustOrigin}</strong>
              <span>{t.hero.trustOriginSub}</span>
            </div>
          </div>
          <div className="trust-item">
            <BadgeCheck size={20} />
            <div>
              <strong>{t.hero.trustTiers}</strong>
              <span>{t.hero.trustTiersSub}</span>
            </div>
          </div>
          <div className="trust-item">
            <QrCode size={20} />
            <div>
              <strong>{t.hero.trustQr}</strong>
              <span>{t.hero.trustQrSub}</span>
            </div>
          </div>
          <div className="trust-item">
            <BookOpen size={20} />
            <div>
              <strong>{t.hero.trustSources}</strong>
              <span>{t.hero.trustSourcesSub}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <DataNotice demo={demo} error={error} />
          <div className="section-head">
            <div>
              <span className="eyebrow">{t.homeSections.villagesEyebrow}</span>
              <h2>{t.homeSections.villagesTitle}</h2>
            </div>
            <p>{t.homeSections.villagesDesc}</p>
          </div>
          {villages.length ? (
            <div className="grid three">
              {villages.slice(0, 3).map((village) => {
                const summary = locale === "en" && village.summaryEn ? village.summaryEn : village.summary;
                const craft = locale === "en" && village.craftEn ? village.craftEn : village.craft;
                return (
                  <Link key={village.id} href={`/villages/${village.slug}`} className="card">
                    <div className="card-image">
                      <Image
                        src={village.image}
                        alt={village.name}
                        fill
                        sizes="(max-width: 700px) 100vw, 33vw"
                      />
                    </div>
                    <div className="card-body">
                      <div className="card-meta">
                        <span>{village.district}</span>
                        <span>{craft}</span>
                      </div>
                      <h3>{village.name}</h3>
                      <p>{summary}</p>
                      <strong>{t.homeSections.followTrail}</strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty">{t.homeSections.noVillages}</div>
          )}
        </div>
      </section>

      <section className="section soft">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t.homeSections.craftEyebrow}</span>
              <h2>{t.homeSections.craftTitle}</h2>
            </div>
            <Link href="/marketplace" className="button secondary">
              {t.homeSections.seeAllCraft}
            </Link>
          </div>
          {products.length ? (
            <div className="grid three">
              {products.slice(0, 3).map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </div>
          ) : (
            <div className="empty">{t.homeSections.noProducts}</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="shell story-band">
          <div className="story-image">
            <Image
              src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=88"
              alt="Artisan tools and natural materials"
              width={1000}
              height={900}
            />
          </div>
          <div className="story-copy">
            <span className="eyebrow" style={{ color: "#ffe2d6" }}>
              {t.homeSections.trustMethodEyebrow}
            </span>
            <h2>{t.homeSections.trustMethodTitle}</h2>
            <p>{t.homeSections.trustMethodDesc}</p>
            <div className="steps">
              <div className="step">
                <span className="step-number">1</span>
                <div>
                  <strong>{t.homeSections.step1Title}</strong>
                  <br />
                  <span>{t.homeSections.step1Desc}</span>
                </div>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <div>
                  <strong>{t.homeSections.step2Title}</strong>
                  <br />
                  <span>{t.homeSections.step2Desc}</span>
                </div>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <div>
                  <strong>{t.homeSections.step3Title}</strong>
                  <br />
                  <span>{t.homeSections.step3Desc}</span>
                </div>
              </div>
            </div>
            <Link
              href="/passport/HCT-DEMO-BT-001"
              className="button"
              style={{ marginTop: 28, background: "#fff", color: "#7d351e" }}
            >
              {t.homeSections.samplePassport}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

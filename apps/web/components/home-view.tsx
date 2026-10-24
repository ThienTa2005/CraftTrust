"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DataNotice } from "@/components/data-state";
import { CraftDoodle } from "@/components/craft-doodle";
import { ProductCard } from "@/components/product-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { ProductCard as Product } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";

interface HomeViewProps {
  products: Product[];
  demo: boolean;
  error?: string | undefined;
}

export function HomeView({ products, demo, error }: HomeViewProps) {
  const { locale, t } = useLanguage();
  const potteryStories = [
    {
      id: "clay",
      title: locale === "vi" ? "Đất & tạo hình" : "Clay & forming",
      meta: locale === "vi" ? "Từ đất đến dáng" : "From earth to form",
      summary:
        locale === "vi"
          ? "Theo dấu bàn tay người thợ từ khâu luyện đất, tạo cốt đến sửa dáng trên bàn xoay."
          : "Follow the maker from prepared clay to wheel-thrown form and careful trimming.",
      image:
        "https://images.unsplash.com/photo-1686471715390-17eb6acca862?auto=format&fit=crop&w=1200&q=86",
    },
    {
      id: "glaze",
      title: locale === "vi" ? "Men lam & nét vẽ" : "Cobalt glaze & brushwork",
      meta: locale === "vi" ? "Sắc lam Bát Tràng" : "Bat Trang cobalt",
      summary:
        locale === "vi"
          ? "Khám phá lớp men ngà, sắc lam cobalt và những nét hoa văn được vẽ tay trên từng cốt gốm."
          : "Explore ivory glaze, cobalt blue and brush-painted motifs unique to each ceramic body.",
      image:
        "https://images.unsplash.com/photo-1775009985662-5c43257b1f42?auto=format&fit=crop&w=1200&q=86",
    },
    {
      id: "fire",
      title: locale === "vi" ? "Lửa nung & dấu men" : "Kiln fire & glaze marks",
      meta: locale === "vi" ? "Mỗi mẻ nung độc bản" : "One-of-a-kind firings",
      summary:
        locale === "vi"
          ? "Nhiệt, tro và thời gian tạo nên độ kết khối cùng những biến chuyển bề mặt không lặp lại."
          : "Heat, ash and time create a vitrified body and surface variations that never repeat.",
      image:
        "https://images.unsplash.com/photo-1700320591123-ea7468643551?auto=format&fit=crop&w=1200&q=86",
    },
  ];

  return (
    <>
      <section className="hero shell">
        <div className="hero-panel">
          <span className="hero-orb hero-orb-one" aria-hidden="true" />
          <span className="hero-orb hero-orb-two" aria-hidden="true" />
          <span className="hero-grid-pattern" aria-hidden="true" />
          <div className="hero-copy">
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1 className="hero-title">{t.hero.title}</h1>
            <p>{t.hero.subtitle}</p>
            <div className="hero-actions">
              <Link className="button terracotta" href="/marketplace">
                {t.hero.exploreMarketplace}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
              <Link className="button secondary" href="/villages">
                {t.hero.visitVillages}
              </Link>
            </div>
            <div className="hero-note">
              <Sparkles size={17} aria-hidden="true" />
              <span>
                {locale === "vi"
                  ? "Thủ công truyền đời, niềm tin thế hệ mới"
                  : "Generational craft, reimagined trust"}
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <Image
              src="https://images.unsplash.com/photo-1686471715390-17eb6acca862?auto=format&fit=crop&w=1500&q=90"
              alt="Nghệ nhân đang tạo hình một tác phẩm gốm trên bàn xoay"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 48vw"
            />
            <div className="hero-visual-caption" aria-hidden="true">
              <span>Bát Tràng</span>
              <span>Đất / Men / Lửa</span>
            </div>
            <div className="floating-proof">
              <div className="proof-top">
                <span className="proof-seal">
                  <ShieldCheck size={22} />
                </span>
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

      <ScrollReveal className="section villages-section">
        <CraftDoodle className="section-doodle doodle-villages" />
        <div className="shell">
          <DataNotice demo={demo} error={error} />
          <div className="section-head">
            <div>
              <span className="eyebrow">{t.homeSections.villagesEyebrow}</span>
              <h2>{t.homeSections.villagesTitle}</h2>
            </div>
            <p>{t.homeSections.villagesDesc}</p>
          </div>
          {potteryStories.length ? (
            <div className="grid three">
              {potteryStories.map((story) => (
                <Link
                  key={story.id}
                  href="/villages/bat-trang"
                  className="card story-card"
                >
                  <div className="card-image">
                    <Image
                      src={story.image}
                      alt={story.title}
                      fill
                      sizes="(max-width: 700px) 100vw, 33vw"
                    />
                  </div>
                  <div className="card-body">
                    <div className="card-meta">
                      <span>Bát Tràng · Gia Lâm</span>
                      <span>{story.meta}</span>
                    </div>
                    <h3>{story.title}</h3>
                    <p>{story.summary}</p>
                    <strong>{t.homeSections.followTrail}</strong>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">{t.homeSections.noVillages}</div>
          )}
        </div>
      </ScrollReveal>

      <ScrollReveal className="section soft craft-section" delay={80}>
        <CraftDoodle className="section-doodle doodle-craft" />
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
      </ScrollReveal>

      <ScrollReveal className="section story-section" delay={100}>
        <div className="shell story-band">
          <div className="story-image">
            <Image
              src="https://images.unsplash.com/photo-1721373489867-b95a7b3fe16c?auto=format&fit=crop&w=1200&q=88"
              alt="Bộ trà gốm men lam vẽ tay Bát Tràng"
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
      </ScrollReveal>
    </>
  );
}

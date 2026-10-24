"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataNotice } from "@/components/data-state";
import { CraftDoodle } from "@/components/craft-doodle";
import { ProductCard } from "@/components/product-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { ProductCard as Product } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";
import { formatVnd } from "@/lib/format";
import { addToDemoCart } from "@/lib/cart-store";

interface HomeViewProps {
  products: Product[];
  demo: boolean;
  error?: string | undefined;
}

export function HomeView({ products, demo, error }: HomeViewProps) {
  const { locale, t } = useLanguage();

  // Mega Banner Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroBanners = [
    {
      id: 1,
      tag: locale === "vi" ? "SỰ KIỆN NGHỆ NHÂN 2026" : "ARTISAN EVENT 2026",
      title:
        locale === "vi"
          ? "Tuần Lễ Gốm Sứ Bát Tràng: Giảm 20% Dòng Men Tro Độc Bản"
          : "Bat Trang Pottery Week: 20% Off Moon Glaze Masterpieces",
      desc:
        locale === "vi"
          ? "Mỗi tác phẩm phát hành đều được cấp Hộ chiếu số di sản Gold Passport, bảo chứng đất sông Hồng nung củi 1250°C."
          : "Every piece issued includes a Gold Digital Passport verifying Red River clay and 1250°C wood kiln firing.",
      cta: locale === "vi" ? "Khám phá bộ sưu tập" : "Explore collection",
      href: "/marketplace",
      image:
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1500&q=90",
      accent: "#e76043",
    },
    {
      id: 2,
      tag: locale === "vi" ? "DI SẢN TƠ TẰM HÀ NỘI" : "HANOI SILK HERITAGE",
      title:
        locale === "vi"
          ? "Lụa Vạn Phúc: Tinh Hoa Tơ Tằm Dệt Thủ Công 1000 Năm"
          : "Van Phuc Silk: Millennium-Old Natural Mulberry Weaving",
      desc:
        locale === "vi"
          ? "Đắm mình trong chất lụa vân mỏng nhẹ, thoáng mát và bền bỉ từ làng dệt lụa cổ kính nhất kinh kỳ."
          : "Immerse in lightweight, natural mulberry silk hand-loomed in Hanoi's most celebrated textile village.",
      cta: locale === "vi" ? "Khám phá làng nghề" : "Visit village",
      href: "/villages/van-phuc",
      image:
        "https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=1500&q=90",
      accent: "#08736b",
    },
    {
      id: 3,
      tag: locale === "vi" ? "CÔNG NGHỆ 3D & AR" : "INTERACTIVE 3D & AR",
      title:
        locale === "vi"
          ? "Xoay 360° & Đặt Thử Gốm Vào Không Gian Sống Của Bạn"
          : "Inspect in 360° & Preview in Your Living Space with AR",
      desc:
        locale === "vi"
          ? "Ứng dụng mô hình 3D chuẩn xác đến từng milimet, tích hợp công nghệ scan AI từ xưởng nghệ nhân Bát Tràng."
          : "Millimeter-accurate 3D models generated through our AI scanning pipeline directly from Bat Trang studios.",
      cta: locale === "vi" ? "Trải nghiệm 3D ngay" : "Try 3D view",
      href: "/products/moon-glaze-tea-set",
      image:
        "https://images.unsplash.com/photo-1686471715390-17eb6acca862?auto=format&fit=crop&w=1500&q=90",
      accent: "#153b5b",
    },
  ];

  // Auto-slide effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  // Flash Sale Countdown Timer (Simulated remaining time)
  const [timeLeft, setTimeLeft] = useState({
    hours: 3,
    minutes: 42,
    seconds: 18,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0)
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0)
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Daily Discover Category Filter Tabs
  const [discoverTab, setDiscoverTab] = useState<string>("all");
  const discoverProducts = useMemo(() => {
    if (discoverTab === "gold") return products.filter((p) => p.tier === "gold");
    if (discoverTab === "cobalt")
      return products.filter((p) =>
        /(lam|cobalt|sen)/i.test(`${p.name} ${p.description}`),
      );
    if (discoverTab === "tea")
      return products.filter((p) =>
        /(ấm|chén|trà)/i.test(`${p.name} ${p.description}`),
      );
    return products;
  }, [products, discoverTab]);

  // Category Grid Data
  const categories = [
    {
      id: "bat-trang",
      name: locale === "vi" ? "Gốm Bát Tràng" : "Bat Trang Ceramics",
      desc: locale === "vi" ? "Ấm chén men tro, bình hút lộc" : "Ash glaze tea sets & vases",
      icon: "🏺",
      href: "/marketplace?cat=pottery",
      count: "24 tác phẩm",
    },
    {
      id: "van-phuc",
      name: locale === "vi" ? "Lụa Vạn Phúc" : "Van Phuc Silk",
      desc: locale === "vi" ? "Khăn tơ tằm, áo dài lụa vân" : "Natural silk scarves & fabric",
      icon: "🧣",
      href: "/villages/van-phuc",
      count: "18 tác phẩm",
    },
    {
      id: "chang-son",
      name: locale === "vi" ? "Mộc Chàng Sơn" : "Chang Son Woodwork",
      desc: locale === "vi" ? "Tượng gỗ, khay trà chạm đục" : "Fine hand-carved wood",
      icon: "🪵",
      href: "/villages",
      count: "15 tác phẩm",
    },
    {
      id: "ha-thai",
      name: locale === "vi" ? "Sơn Mài Hạ Thái" : "Ha Thai Lacquer",
      desc: locale === "vi" ? "Tranh sơn mài, bình cẩn ốc" : "Mother-of-pearl lacquer",
      icon: "🎨",
      href: "/marketplace",
      count: "12 tác phẩm",
    },
    {
      id: "dinh-cong",
      name: locale === "vi" ? "Kim Hoàn Định Công" : "Dinh Cong Silver",
      desc: locale === "vi" ? "Trâm cài, trang sức bạc đậu" : "Filigree silver craft",
      icon: "🪙",
      href: "/marketplace",
      count: "9 tác phẩm",
    },
    {
      id: "chuong",
      name: locale === "vi" ? "Nón Làng Chuông" : "Chuong Conical Hats",
      desc: locale === "vi" ? "Nón lá truyền thống Thăng Long" : "Traditional craft hats",
      icon: "👒",
      href: "/marketplace",
      count: "14 tác phẩm",
    },
  ];

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
    <div className="buyer-homepage">
      {/* 1. MEGA PROMOTIONAL HERO BANNER CAROUSEL (Shopee-Style Heritage) */}
      <section className="buyer-promo-slider-section">
        <div className="shell">
          <div className="buyer-slider-container">
            {heroBanners.map((banner, index) => {
              const isActive = index === currentSlide;
              return (
                <div
                  key={banner.id}
                  className={`buyer-slide ${isActive ? "active" : ""}`}
                >
                  <div className="buyer-slide-bg">
                    <Image
                      src={banner.image}
                      alt={banner.title}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 1200px) 100vw, 1200px"
                      className="buyer-slide-img"
                    />
                    <div className="buyer-slide-overlay" />
                  </div>

                  <div className="buyer-slide-content">
                    <span className="buyer-slide-tag">{banner.tag}</span>
                    <h2 className="buyer-slide-title">{banner.title}</h2>
                    <p className="buyer-slide-desc">{banner.desc}</p>
                    <div className="buyer-slide-actions">
                      <Link
                        href={banner.href}
                        className="button terracotta"
                        style={{ background: banner.accent }}
                      >
                        {banner.cta} <ArrowRight size={18} />
                      </Link>
                      <Link href="/passport/HCT-DEMO-BT-001" className="button secondary">
                        <QrCode size={16} /> {locale === "vi" ? "Xem Hộ Chiếu Số" : "View Passport"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Slider Controls */}
            <button
              type="button"
              className="buyer-slider-arrow prev"
              onClick={() =>
                setCurrentSlide(
                  (prev) => (prev - 1 + heroBanners.length) % heroBanners.length,
                )
              }
              aria-label="Previous slide"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="buyer-slider-arrow next"
              onClick={() =>
                setCurrentSlide((prev) => (prev + 1) % heroBanners.length)
              }
              aria-label="Next slide"
            >
              <ChevronRight size={22} />
            </button>

            {/* Dots */}
            <div className="buyer-slider-dots">
              {heroBanners.map((b, i) => (
                <button
                  type="button"
                  key={b.id}
                  className={`dot ${i === currentSlide ? "active" : ""}`}
                  onClick={() => setCurrentSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. HERITAGE CATEGORIES GRID (Danh Mục Ngành Hàng Đa Dạng) */}
      <section className="section buyer-categories-section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                {locale === "vi" ? "Làng nghề Thăng Long" : "Heritage Crafts"}
              </span>
              <h2>{locale === "vi" ? "Danh Mục Ngành Hàng Truyền Thống" : "Explore Traditional Crafts"}</h2>
            </div>
            <Link href="/villages" className="button secondary small">
              {locale === "vi" ? "Xem tất cả làng nghề" : "All villages"}
            </Link>
          </div>

          <div className="buyer-category-cards-grid">
            {categories.map((cat) => (
              <Link key={cat.id} href={cat.href} className="buyer-category-card">
                <span className="cat-icon">{cat.icon}</span>
                <strong className="cat-name">{cat.name}</strong>
                <span className="cat-desc">{cat.desc}</span>
                <small className="cat-count">{cat.count}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FLASH SALE LÀNG NGHỀ (DEAL GIỜ VÀNG SỐC) */}
      <section className="section buyer-flash-sale-section">
        <div className="shell">
          <div className="flash-sale-banner-header">
            <div className="flash-sale-title-wrap">
              <span className="flash-bolt">
                <Zap size={24} />
              </span>
              <h3>FLASH SALE LÀNG NGHỀ</h3>
              <div className="flash-countdown-box">
                <Timer size={16} />
                <span className="digit">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="colon">:</span>
                <span className="digit">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="colon">:</span>
                <span className="digit">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            <Link href="/marketplace" className="flash-sale-view-all">
              <span>{locale === "vi" ? "Xem tất cả deal sốc" : "See all deals"}</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="flash-sale-products-grid">
            {products.slice(0, 3).map((product, idx) => {
              const originalPrice = Math.round(product.priceVnd * 1.25);
              return (
                <div key={product.id} className="flash-product-card">
                  <div className="flash-badge-corner">-20%</div>
                  <div className="card-thumb-wrap">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 600px) 100vw, 33vw"
                    />
                  </div>
                  <div className="flash-card-body">
                    <span className="flash-artisan">{product.artisan} · {product.village}</span>
                    <h4 className="flash-title">{product.name}</h4>
                    <div className="flash-price-row">
                      <strong className="flash-sale-price">{formatVnd(product.priceVnd)}</strong>
                      <span className="flash-original-price">{formatVnd(originalPrice)}</span>
                    </div>

                    <div className="flash-progress-bar">
                      <div className="progress-fill" style={{ width: `${75 + idx * 8}%` }} />
                      <span className="progress-label">
                        <Flame size={12} /> {locale === "vi" ? `Đã bán ${7 + idx}/10 tác phẩm` : `Sold ${7 + idx}/10`}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="button terracotta full small"
                      style={{ marginTop: 12 }}
                      onClick={() => {
                        addToDemoCart({
                          productId: product.id,
                          name: product.name,
                          priceVnd: product.priceVnd,
                          image: product.image,
                          quantity: 1,
                          village: product.village,
                          artisan: product.artisan,
                        });
                        alert(locale === "vi" ? "Đã thêm tác phẩm vào giỏ hàng!" : "Added to cart!");
                      }}
                    >
                      {locale === "vi" ? "Mua ngay deal hot" : "Claim deal"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ORIGINAL CORE STORY SECTION (Kept for E2E tests & cultural depth) */}
      <section className="hero shell" style={{ marginTop: 40 }}>
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

      {/* 5. GỢI Ý HÔM NAY (DAILY DISCOVER - Shopee Style) */}
      <section className="section buyer-daily-discover">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                {locale === "vi" ? "Dành riêng cho bạn" : "Recommended for you"}
              </span>
              <h2>{locale === "vi" ? "Gợi Ý Hôm Nay" : "Daily Discover"}</h2>
            </div>
          </div>

          <div className="buyer-discover-tabs">
            <button
              type="button"
              className={`discover-tab ${discoverTab === "all" ? "active" : ""}`}
              onClick={() => setDiscoverTab("all")}
            >
              {locale === "vi" ? "Tất cả gợi ý" : "All items"}
            </button>
            <button
              type="button"
              className={`discover-tab ${discoverTab === "gold" ? "active" : ""}`}
              onClick={() => setDiscoverTab("gold")}
            >
              ✨ {locale === "vi" ? "Hộ Chiếu Vàng" : "Gold Passport"}
            </button>
            <button
              type="button"
              className={`discover-tab ${discoverTab === "tea" ? "active" : ""}`}
              onClick={() => setDiscoverTab("tea")}
            >
              🍵 {locale === "vi" ? "Ấm chén trà" : "Tea Ware"}
            </button>
            <button
              type="button"
              className={`discover-tab ${discoverTab === "cobalt" ? "active" : ""}`}
              onClick={() => setDiscoverTab("cobalt")}
            >
              🏺 {locale === "vi" ? "Men lam Bát Tràng" : "Cobalt Glaze"}
            </button>
          </div>

          <div className="grid three" style={{ marginTop: 24 }}>
            {discoverProducts.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 36 }}>
            <Link href="/marketplace" className="button terracotta">
              {locale === "vi" ? "Xem thêm nhiều tác phẩm thủ công" : "Explore full marketplace"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. LÀNG NGHỀ TIÊU BIỂU (VILLAGES STORIES) */}
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
    </div>
  );
}

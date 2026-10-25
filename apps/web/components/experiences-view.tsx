"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Box,
  CheckCircle2,
  ExternalLink,
  Glasses,
  MapPin,
  RotateCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import type { Experience } from "@/lib/experiences";
import { ExperienceViewer } from "./experience-viewer";

export function ExperiencesView({
  experiences,
  unavailable = false,
}: {
  experiences: Experience[];
  unavailable?: boolean;
}) {
  const { locale } = useLanguage();
  const vi = locale === "vi";

  // Default to selecting the first experience if available, so visitors see 3D immediately
  const [selectedId, setSelectedId] = useState<string | null>(experiences[0]?.id ?? null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Sync if experiences change
  useEffect(() => {
    if (experiences.length > 0 && !experiences.some((exp) => exp.id === selectedId)) {
      setSelectedId(experiences[0]?.id ?? null);
    }
  }, [experiences, selectedId]);

  const activeExperience = experiences.find((item) => item.id === selectedId) ?? null;

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    if (id && spotlightRef.current) {
      spotlightRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="experiences-page-wrapper">
      {/* Hero Header */}
      <section className="experiences-hero">
        <div className="shell">
          <div className="experiences-hero-content">
            <div className="experiences-pill-badge">
              <Sparkles size={15} />
              <span>{vi ? "DI SẢN SỐ HÀ NỘI · CRAFTTRUST 3D/VR" : "HANOI DIGITAL HERITAGE · 3D/VR"}</span>
            </div>

            <h1 className="experiences-hero-title">
              {vi ? "Không Gian Trải Nghiệm 3D / VR" : "3D & VR Virtual Heritage"}
            </h1>

            <p className="experiences-hero-subtitle">
              {vi
                ? "Khám phá tinh hoa thủ công mỹ nghệ Thăng Long - Hà Nội qua không gian tương tác 3 chiều. Xoay 360°, chiêm ngưỡng từng vân gốm, thớ gỗ và sắc men độc bản được số hóa trực tiếp từ tác phẩm của các nghệ nhân ưu tú."
                : "Explore authentic Hanoi craft heritage through interactive 3D models. Rotate 360°, inspect fine glazes, wood grains, and artisanal patterns verified by CraftTrust."}
            </p>

            <div className="experiences-features-strip">
              <div className="feature-item">
                <RotateCw size={17} />
                <span>{vi ? "Xoay 360° & Thu phóng đa chiều" : "360° Interactive rotation"}</span>
              </div>
              <div className="feature-item">
                <Glasses size={17} />
                <span>{vi ? "Hỗ trợ WebXR & Thực tế ảo (AR)" : "WebXR & AR compatible"}</span>
              </div>
              <div className="feature-item">
                <ShieldCheck size={17} />
                <span>{vi ? "Hộ chiếu số Gold Passport" : "Digital Heritage Passport"}</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={17} />
                <span>{vi ? "Bảo chứng từ nghệ nhân thật" : "Verified master artisans"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="shell experiences-main">
        {unavailable ? (
          <div className="experiences-notice error" role="status">
            <p>
              {vi
                ? "Chưa tải được bộ sưu tập trải nghiệm 3D lúc này. Vui lòng quay lại sau ít phút."
                : "The 3D experience collection is currently unavailable. Please try again later."}
            </p>
          </div>
        ) : experiences.length === 0 ? (
          <div className="experiences-empty-state">
            <div className="empty-icon-wrap">
              <Box size={44} />
            </div>
            <h3>{vi ? "Chưa có tác phẩm 3D được xuất bản" : "No 3D experiences published yet"}</h3>
            <p>
              {vi
                ? "Hội đồng giám định CraftTrust đang hoàn tất quy trình quét 3D cho các tác phẩm mới. Mời bạn khám phá chợ di sản trong lúc chờ đợi."
                : "Our curators are processing new 3D scans for master artisan pieces. Explore our heritage marketplace in the meantime."}
            </p>
            <Link href="/marketplace" className="button primary">
              {vi ? "Khám phá Chợ Di Sản" : "Explore Marketplace"}
            </Link>
          </div>
        ) : (
          <>
            {/* Active 3D Spotlight Stage */}
            {activeExperience && (
              <section
                ref={spotlightRef}
                className="experience-spotlight"
                aria-label={vi ? "Phòng trưng bày 3D tương tác" : "3D Interactive Showcase"}
              >
                <div className="spotlight-header">
                  <div className="spotlight-header-meta">
                    <span className="spotlight-tag">
                      <Sparkles size={14} />
                      {vi ? "Phòng Trưng Bày 3D Tương Tác" : "3D Interactive Studio"}
                    </span>
                    <h2 className="spotlight-title">{activeExperience.title}</h2>
                  </div>

                  <button
                    type="button"
                    className="button secondary spotlight-close-btn"
                    onClick={() => handleSelect(null)}
                    title={vi ? "Thu gọn phòng 3D" : "Minimize 3D studio"}
                  >
                    <X size={16} />
                    <span>{vi ? "Thu gọn 3D" : "Minimize 3D"}</span>
                  </button>
                </div>

                <div className="spotlight-layout">
                  {/* Left: 3D Stage Viewer */}
                  <div className="spotlight-viewer-panel">
                    <ExperienceViewer
                      key={activeExperience.id}
                      id={activeExperience.id}
                      title={activeExperience.title}
                    />
                  </div>

                  {/* Right: Curatorial & Provenance Info */}
                  <aside className="spotlight-info-panel">
                    <div className="spotlight-artisan-card">
                      <div className="artisan-avatar-icon">
                        <Award size={24} />
                      </div>
                      <div className="artisan-info-text">
                        <span className="artisan-role-pill">
                          {vi ? "Nghệ nhân bảo chứng" : "Verified Master Artisan"}
                        </span>
                        <h4 className="artisan-name">
                          {activeExperience.product?.artisan ||
                            (vi ? "Xưởng Gốm Nghệ Nhân Bát Tràng" : "Bat Trang Master Workshop")}
                        </h4>
                        <div className="artisan-village-meta">
                          <MapPin size={14} />
                          <span>
                            {activeExperience.product?.village ||
                              (vi ? "Làng gốm Bát Tràng, Gia Lâm, Hà Nội" : "Bat Trang Pottery Village, Hanoi")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {activeExperience.description && (
                      <div className="spotlight-story-card">
                        <h5>{vi ? "Câu chuyện & Kỹ nghệ tác phẩm" : "Craftsmanship & Story"}</h5>
                        <p>{activeExperience.description}</p>
                      </div>
                    )}

                    <div className="spotlight-specs-grid">
                      <div className="spec-card">
                        <span className="spec-label">{vi ? "Chuẩn bảo chứng" : "Standard"}</span>
                        <span className="spec-val">Gold Passport</span>
                      </div>
                      <div className="spec-card">
                        <span className="spec-label">{vi ? "Định dạng 3D" : "Format"}</span>
                        <span className="spec-val">GLB 2.0 / WebXR</span>
                      </div>
                      <div className="spec-card">
                        <span className="spec-label">{vi ? "Số hóa" : "Digitization"}</span>
                        <span className="spec-val">AI 3D Scan 4K</span>
                      </div>
                    </div>

                    <div className="spotlight-actions-group">
                      {activeExperience.product?.slug ? (
                        <>
                          <Link
                            href={`/products/${activeExperience.product.slug}`}
                            className="button primary spotlight-cta"
                          >
                            <span>{vi ? "Chi tiết tác phẩm & Đặt mua" : "View artwork & order"}</span>
                            <ArrowRight size={16} />
                          </Link>
                          <Link
                            href={`/trace/${activeExperience.product.slug}`}
                            className="button secondary spotlight-cta"
                          >
                            <ShieldCheck size={16} />
                            <span>{vi ? "Hộ chiếu số Gold Passport" : "Digital Passport"}</span>
                          </Link>
                        </>
                      ) : (
                        <Link href="/marketplace" className="button secondary spotlight-cta">
                          <span>{vi ? "Xem thêm tác phẩm làng nghề" : "Explore craft collection"}</span>
                          <ArrowRight size={16} />
                        </Link>
                      )}
                    </div>
                  </aside>
                </div>
              </section>
            )}

            {/* Gallery Grid Section */}
            <section className="experiences-gallery-section">
              <div className="gallery-section-header">
                <div>
                  <h2 className="gallery-section-title">
                    {vi ? "Danh Mục Tác Phẩm Số Hóa 3D" : "Digitized 3D Masterpieces"}
                  </h2>
                  <p className="gallery-section-desc">
                    {vi
                      ? "Bấm vào bất kỳ tác phẩm nào để mở không gian xoay 360° và chiêm ngưỡng chi tiết."
                      : "Click any masterpiece to view in 360° virtual space."}
                  </p>
                </div>
                <div className="gallery-count-badge">
                  <span>{experiences.length} {vi ? "tác phẩm" : "items"}</span>
                </div>
              </div>

              <div className="experiences-grid">
                {experiences.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <article
                      className={`experience-card ${isSelected ? "is-active" : ""}`}
                      key={item.id}
                    >
                      {/* 4:3 Aspect Ratio Media Container */}
                      <div className="experience-card-media">
                        {item.product?.posterUrl ? (
                          <Image
                            src={item.product.posterUrl}
                            alt={item.product.name || item.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                            className="experience-card-img"
                          />
                        ) : (
                          <div className="experience-card-fallback-art">
                            <Box size={44} />
                            <span>{vi ? "Mô hình 3D" : "3D Model"}</span>
                          </div>
                        )}

                        <div className="card-floating-badges">
                          <span className="card-pill-3d">
                            <Box size={13} />
                            <span>3D / VR</span>
                          </span>
                          {item.product?.village && (
                            <span className="card-pill-village">
                              {item.product.village}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="card-active-indicator">
                            <Sparkles size={14} />
                            <span>{vi ? "Đang chiêm ngưỡng" : "Active in studio"}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="experience-card-body">
                        <div className="card-artisan-row">
                          <Award size={14} className="artisan-icon-accent" />
                          <span className="card-artisan-name">
                            {item.product?.artisan || (vi ? "Nghệ nhân CraftTrust" : "CraftTrust Artisan")}
                          </span>
                        </div>

                        <h3 className="card-item-title">{item.title}</h3>

                        {item.product?.name && item.product.name !== item.title && (
                          <p className="card-item-subtitle">{item.product.name}</p>
                        )}

                        {item.description && (
                          <p className="card-item-desc">{item.description}</p>
                        )}

                        <div className="card-actions-row">
                          <button
                            className={`button ${isSelected ? "secondary active-btn" : "primary"}`}
                            type="button"
                            aria-expanded={isSelected}
                            onClick={() => handleSelect(isSelected ? null : item.id)}
                          >
                            <Box size={16} />
                            <span>
                              {isSelected
                                ? (vi ? "Đang mở 3D (Đóng)" : "Viewing 3D (Close)")
                                : (vi ? "Khám phá 3D (360°)" : "Explore 3D (360°)")}
                            </span>
                          </button>

                          {item.product?.slug && (
                            <Link
                              href={`/products/${item.product.slug}`}
                              className="button secondary icon-only-on-mobile"
                              title={vi ? "Xem chi tiết tác phẩm" : "View artwork details"}
                            >
                              <span>{vi ? "Chi tiết" : "Details"}</span>
                              <ExternalLink size={14} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

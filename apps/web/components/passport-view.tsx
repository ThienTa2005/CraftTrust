"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Radio,
  ShieldCheck,
  Video,
} from "lucide-react";
import { DataNotice } from "@/components/data-state";
import { PassportQr } from "@/components/passport-qr";
import { formatVnd } from "@/lib/format";
import type { PassportView as PassportData } from "@/lib/passport";
import { useLanguage } from "@/lib/i18n/context";

const rank = { unverified: 0, bronze: 1, silver: 2, gold: 3 } as const;

export function PassportView({
  passport,
  demo,
  error,
  url,
}: {
  passport: PassportData;
  demo: boolean;
  error?: string | undefined;
  url: string;
}) {
  const { locale, t } = useLanguage();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [activeVideoId, setActiveVideoId] = useState<string>(
    passport.videos[0]?.id ?? "",
  );

  const tierKey = (
    passport.tier in t.passport.tierLabels ? passport.tier : "unverified"
  ) as keyof typeof t.passport.tierLabels;
  const tierLabel = t.passport.tierLabels[tierKey];
  const currentRank = rank[passport.tier as keyof typeof rank] ?? 0;

  const currentVideo =
    passport.videos.find((v) => v.id === activeVideoId) ?? passport.videos[0];
  const currentTimelineStep =
    passport.timeline.find((s) => s.stepNumber === activeStep) ??
    passport.timeline[0];

  return (
    <div className="shell passport">
      <DataNotice demo={demo} error={error} />

      {/* Main Passport Header */}
      <div className="passport-header">
        <div>
          <span
            className="eyebrow"
            style={{
              color: "#efb083",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ShieldCheck size={16} />
            {t.passport.eyebrow}
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", margin: "8px 0" }}>
            {passport.productName}
          </h1>
          <p style={{ color: "#e0d9cc", fontSize: "1.05rem", margin: 0 }}>
            {passport.artisan} · {passport.village}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <span className={`badge ${passport.tier}`}>
              <BadgeCheck size={14} />
              {tierLabel}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                color: "#9fe1c1",
                background: "rgba(159, 225, 193, 0.15)",
                padding: "4px 11px",
                borderRadius: 999,
                border: "1px solid rgba(159, 225, 193, 0.3)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#9fe1c1",
                  display: "inline-block",
                  animation: "pulse-soft 1.5s ease-in-out infinite",
                }}
              />
              <Radio size={14} />
              {locale === "vi"
                ? `Xác thực chip NFC · ${passport.verificationCount} lượt quét`
                : `NFC Dynamic Verified · ${passport.verificationCount} scans`}
            </span>
          </div>
        </div>
        <PassportQr value={url} label={passport.publicId} />
      </div>

      <div className="passport-body">
        {/* Verification Strip */}
        <div
          className="passport-verification-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            padding: "16px 20px",
            background: "rgba(35, 92, 67, 0.05)",
            border: "1px solid rgba(35, 92, 67, 0.15)",
            borderRadius: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              {locale === "vi" ? "Mã Hộ chiếu số" : "Digital Passport ID"}
            </span>
            <strong style={{ fontSize: "0.95rem", color: "var(--leaf)" }}>
              {passport.publicId}
            </strong>
          </div>
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              {locale === "vi" ? "Mã Dynamic NFC Token" : "Dynamic NFC Token"}
            </span>
            <strong style={{ fontSize: "0.95rem" }}>
              {passport.dynamicToken ?? "NFC-ACTIVE"}
            </strong>
          </div>
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              {locale === "vi" ? "Giá niêm yết chính hãng" : "Certified Price"}
            </span>
            <strong style={{ fontSize: "1.05rem", color: "var(--terracotta)" }}>
              {passport.priceVnd ? formatVnd(passport.priceVnd) : "1.850.000 ₫"}
            </strong>
          </div>
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              {locale === "vi" ? "Thời gian kiểm định" : "Certified At"}
            </span>
            <strong style={{ fontSize: "0.95rem" }}>
              {new Date(passport.updatedAt).toLocaleDateString(
                locale === "vi" ? "vi-VN" : "en-US",
              )}
            </strong>
          </div>
        </div>

        {/* Tier progression track */}
        <div className="tier-track">
          {(["bronze", "silver", "gold"] as const).map((tier) => (
            <div
              key={tier}
              className={`tier-node ${rank[tier] <= currentRank ? "complete" : ""}`}
            >
              {rank[tier] <= currentRank ? <CheckCircle2 size={16} /> : null}{" "}
              {t.passport.tierLabels[tier]}
            </div>
          ))}
        </div>

        {/* Specifications: Artisan & Raw Materials */}
        <div
          className="passport-spec-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {/* Artisan Card */}
          <div
            className="passport-stepper"
            style={{
              padding: 20,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid var(--leaf)",
                }}
              >
                <Image
                  src={
                    passport.artisanAvatar ??
                    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80"
                  }
                  alt={passport.artisan}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "1.1rem" }}>
                  {passport.artisan}
                </strong>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {locale === "vi"
                    ? `Nghệ nhân Ưu tú (${passport.artisanYears ?? 35} năm nghề)`
                    : `Master Artisan (${passport.artisanYears ?? 35} years exp)`}
                </span>
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              {locale === "vi" ? passport.artisanBioVi : passport.artisanBioEn}
            </p>
          </div>

          {/* Raw Material & Geographic Origin */}
          <div
            style={{
              padding: 20,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 16,
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "1rem",
                marginBottom: 10,
                color: "var(--leaf)",
              }}
            >
              <Layers
                size={17}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 6,
                }}
              />
              {locale === "vi"
                ? "Chất liệu tuyển chọn & Xuất xứ"
                : "Materials & Provenance"}
            </strong>
            <div style={{ display: "grid", gap: 8 }}>
              {(locale === "vi"
                ? passport.materialsVi
                : passport.materialsEn
              )?.map((mat, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.85rem",
                    color: "var(--ink)",
                  }}
                >
                  <CheckCircle2
                    size={15}
                    style={{ color: "var(--leaf)", flexShrink: 0 }}
                  />
                  <span>{mat}</span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.85rem",
                  marginTop: 4,
                  paddingTop: 8,
                  borderTop: "1px dashed var(--line)",
                  color: "var(--muted)",
                }}
              >
                <MapPin
                  size={15}
                  style={{ color: "var(--terracotta)", flexShrink: 0 }}
                />
                <span>
                  {locale === "vi"
                    ? `Địa lý chỉ dẫn: Làng gốm Bát Tràng, Xã Bát Tràng, Huyện Gia Lâm, Hà Nội`
                    : `Geographical Indication: Bat Trang Craft Village, Gia Lam, Hanoi`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Official OCOP Certificate Card */}
        <div
          style={{
            padding: 24,
            background: "linear-gradient(135deg, #fff9f0 0%, #fff 100%)",
            border: "2px solid #ecd8b5",
            borderRadius: 18,
            marginBottom: 36,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, #c89d43 0%, #996f1d 100%)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  boxShadow: "0 6px 16px rgba(200, 157, 67, 0.35)",
                }}
              >
                <Award size={28} />
              </div>
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "1.15rem",
                    color: "var(--ink)",
                  }}
                >
                  {t.timelineOcop.ocopTitle}
                </strong>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {locale === "vi"
                    ? passport.ocop.authorityVi
                    : passport.ocop.authorityEn}
                </span>
              </div>
            </div>

            {/* OCOP Stars */}
            <div
              className="passport-step-detail"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#fef3d6",
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid #ebd39b",
              }}
            >
              {[1, 2, 3, 4].map((star) => (
                <span
                  key={star}
                  style={{ color: "#d97706", fontSize: "1.1rem" }}
                >
                  ★
                </span>
              ))}
              <strong
                style={{ fontSize: "0.86rem", color: "#92400e", marginLeft: 4 }}
              >
                4 SAO OCOP
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              padding: "14px 16px",
              background: "rgba(255, 255, 255, 0.8)",
              borderRadius: 12,
              border: "1px solid #f3e5ce",
              fontSize: "0.82rem",
            }}
          >
            <div>
              <span style={{ display: "block", color: "var(--muted)" }}>
                {t.timelineOcop.certificateNo}
              </span>
              <strong>{passport.ocop.certificateNumber}</strong>
            </div>
            <div>
              <span style={{ display: "block", color: "var(--muted)" }}>
                {locale === "vi" ? "Ngày cấp chứng nhận" : "Issue Date"}
              </span>
              <strong>{passport.ocop.issueDate}</strong>
            </div>
            <div>
              <span style={{ display: "block", color: "var(--muted)" }}>
                {locale === "vi" ? "Phân hạng sản phẩm" : "Category"}
              </span>
              <strong>
                {locale === "vi"
                  ? passport.ocop.productCategoryVi
                  : passport.ocop.productCategoryEn}
              </strong>
            </div>
            <div>
              <span style={{ display: "block", color: "var(--muted)" }}>
                {locale === "vi" ? "Hiệu lực chứng nhận" : "Valid Until"}
              </span>
              <strong style={{ color: "var(--leaf)" }}>
                {passport.ocop.validUntil}
              </strong>
            </div>
          </div>
        </div>

        {/* Feature 2: Interactive Heritage Making Timeline */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 20 }}>
            <span
              style={{
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--terracotta)",
                fontWeight: 700,
              }}
            >
              Chronological Heritage Trail
            </span>
            <h2
              style={{
                margin: "6px 0 4px",
                fontSize: "1.5rem",
                fontFamily: "Fraunces",
              }}
            >
              {t.timelineOcop.timelineTitle}
            </h2>
            <p
              style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}
            >
              {t.timelineOcop.timelineSubtitle}
            </p>
          </div>

          {/* Stepper Buttons Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {passport.timeline.map((step) => {
              const isActive = activeStep === step.stepNumber;
              return (
                <button
                  key={step.stepNumber}
                  type="button"
                  onClick={() => setActiveStep(step.stepNumber)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 12,
                    border: isActive
                      ? "2px solid var(--leaf)"
                      : "1px solid var(--line)",
                    background: isActive ? "var(--leaf)" : "#fff",
                    color: isActive ? "#fff" : "var(--ink)",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all .2s ease",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      opacity: isActive ? 0.9 : 0.6,
                    }}
                  >
                    CHẶNG 0{step.stepNumber}
                  </span>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {locale === "vi" ? step.stageNameVi : step.stageNameEn}
                  </strong>
                </button>
              );
            })}
          </div>

          {/* Active Step Detailed Card */}
          {currentTimelineStep && (
            <div
              style={{
                padding: 24,
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 18,
                display: "grid",
                gridTemplateColumns: currentTimelineStep.imageUrl
                  ? "1.4fr 1fr"
                  : "1fr",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      background: "rgba(35, 92, 67, 0.1)",
                      color: "var(--leaf)",
                      borderRadius: 999,
                      fontSize: "0.76rem",
                      fontWeight: 700,
                    }}
                  >
                    CHẶNG 0{currentTimelineStep.stepNumber} ·{" "}
                    {locale === "vi"
                      ? currentTimelineStep.stageNameVi
                      : currentTimelineStep.stageNameEn}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    <Clock
                      size={13}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginRight: 4,
                      }}
                    />
                    {locale === "vi"
                      ? currentTimelineStep.timestampLabelVi
                      : currentTimelineStep.timestampLabelEn}
                  </span>
                </div>

                <h3
                  style={{
                    margin: "8px 0 12px",
                    fontSize: "1.3rem",
                    fontFamily: "Fraunces",
                  }}
                >
                  {locale === "vi"
                    ? currentTimelineStep.titleVi
                    : currentTimelineStep.titleEn}
                </h3>
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: "0.88rem",
                    color: "var(--muted)",
                    lineHeight: 1.6,
                  }}
                >
                  {locale === "vi"
                    ? currentTimelineStep.descriptionVi
                    : currentTimelineStep.descriptionEn}
                </p>

                {currentTimelineStep.artisanNoteVi && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(198, 94, 61, 0.08)",
                      borderLeft: "4px solid var(--terracotta)",
                      borderRadius: "0 10px 10px 0",
                      fontSize: "0.82rem",
                      color: "var(--ink)",
                      fontStyle: "italic",
                    }}
                  >
                    <strong>
                      {locale === "vi"
                        ? "Ghi chú của Nghệ nhân: "
                        : "Master Note: "}
                    </strong>
                    {locale === "vi"
                      ? currentTimelineStep.artisanNoteVi
                      : currentTimelineStep.artisanNoteEn}
                  </div>
                )}
              </div>

              {currentTimelineStep.imageUrl && (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 240,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={currentTimelineStep.imageUrl}
                    alt={currentTimelineStep.titleVi}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feature 2: Multimedia Heritage Video Stories */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--terracotta)",
                fontWeight: 700,
              }}
            >
              Documentary & Process Footage
            </span>
            <h2
              style={{
                margin: "6px 0 4px",
                fontSize: "1.5rem",
                fontFamily: "Fraunces",
              }}
            >
              {t.timelineOcop.videoStoriesTitle}
            </h2>
          </div>

          {/* Video Tabs */}
          <div
            className="passport-video-tabs"
            style={{ display: "flex", gap: 10, marginBottom: 14 }}
          >
            {passport.videos.map((vid) => {
              const isSelected = activeVideoId === vid.id;
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => setActiveVideoId(vid.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: isSelected
                      ? "1px solid var(--leaf)"
                      : "1px solid var(--line)",
                    background: isSelected ? "rgba(35, 92, 67, 0.08)" : "#fff",
                    color: isSelected ? "var(--leaf)" : "var(--ink)",
                    fontSize: "0.84rem",
                    fontWeight: isSelected ? 700 : 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <Video size={16} />
                  <span>{locale === "vi" ? vid.titleVi : vid.titleEn}</span>
                  <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                    ({vid.duration})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Video Player Box */}
          {currentVideo && (
            <div
              style={{
                background: "#000",
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid var(--line)",
              }}
            >
              <div
                style={{ position: "relative", width: "100%", maxHeight: 420 }}
              >
                <video
                  key={currentVideo.id}
                  controls
                  poster={currentVideo.poster}
                  style={{ width: "100%", maxHeight: 420, display: "block" }}
                >
                  <source src={currentVideo.videoUrl} type="video/mp4" />
                  Your browser does not support HTML5 video.
                </video>
              </div>
              <div
                style={{ padding: "16px 20px", background: "var(--surface)" }}
              >
                <strong
                  style={{
                    fontSize: "1.05rem",
                    color: "var(--ink)",
                    display: "block",
                  }}
                >
                  {locale === "vi"
                    ? currentVideo.titleVi
                    : currentVideo.titleEn}
                </strong>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                  }}
                >
                  {locale === "vi"
                    ? currentVideo.descriptionVi
                    : currentVideo.descriptionEn}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Certified Evidence Records List */}
        <div style={{ marginBottom: 30 }}>
          <h3
            style={{
              fontSize: "1.2rem",
              fontFamily: "Fraunces",
              marginBottom: 14,
            }}
          >
            {locale === "vi"
              ? "Hồ sơ bằng chứng đã phê duyệt"
              : "Approved Evidence Records"}
          </h3>
          <div className="evidence-list">
            {passport.evidence.map((item) => (
              <div key={item.id} className="evidence">
                <CheckCircle2
                  size={18}
                  style={{ color: "var(--leaf)", flexShrink: 0 }}
                />
                <div>
                  <strong>{item.type}</strong>
                  <p style={{ margin: "4px 0 0" }}>{item.statement}</p>
                  {item.sourceTitle && (
                    <small style={{ color: "var(--muted)" }}>
                      {locale === "vi"
                        ? "Tư liệu lưu trữ: "
                        : "Heritage Source: "}
                      {item.sourceTitle}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verifier Notice */}
        <div className="panel">
          <strong>
            {locale === "vi"
              ? "Cam kết chứng thực & Bảo hành"
              : "Attestation & Warranty"}
          </strong>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            {locale === "vi"
              ? "Tác phẩm được bảo hộ nguyên bản bởi Liên minh Làng nghề truyền thống Hà Nội và Nền tảng Hanoi Craft-Trust. Mọi thông tin quét từ chip NFC hoặc mã QR đều được xác thực theo cơ chế chuỗi khối bảo mật, chống hàng giả và bảo chứng quyền lợi cho người sưu tầm."
              : "Attested by the Hanoi Traditional Craft Alliance and Hanoi Craft-Trust platform. Every NFC and QR scan resolves against cryptographic provenance records ensuring counterfeit prevention and collector trust."}
          </p>
        </div>
      </div>
    </div>
  );
}

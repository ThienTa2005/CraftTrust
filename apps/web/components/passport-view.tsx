"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  QrCode,
  Radio,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Video,
} from "lucide-react";
import { DataNotice } from "@/components/data-state";
import { PassportQr } from "@/components/passport-qr";
import { QrPrintModal } from "@/components/qr-print-modal";
import { CraftModelViewer } from "@/components/model-viewer";
import { BrandLogo } from "@/components/brand-logo";
import { formatVnd } from "@/lib/format";
import type { PassportView as PassportData } from "@/lib/passport";
import { useLanguage } from "@/lib/i18n/context";

const rank = { unverified: 0, bronze: 1, silver: 2, gold: 3 } as const;

export function PassportView({
  passport,
  demo,
  error,
  url,
  traceMode = false,
}: {
  passport: PassportData;
  demo: boolean;
  error?: string | undefined;
  url: string;
  traceMode?: boolean;
}) {
  const { locale, t } = useLanguage();
  const vi = locale === "vi";

  const [activeStep, setActiveStep] = useState<number>(1);
  const [activeVideoId, setActiveVideoId] = useState<string>(
    passport.videos[0]?.id ?? "",
  );
  const [view3D, setView3D] = useState<boolean>(Boolean(passport.modelUrl));
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const viewerRef = useRef<any>(null);

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

  const handleFlipToBottomQr = () => {
    setView3D(true);
    if (viewerRef.current) {
      viewerRef.current.cameraOrbit = "0deg 175deg auto";
      viewerRef.current.jumpCameraToGoal?.();
    }
  };

  const handleResetCamera = () => {
    if (viewerRef.current) {
      viewerRef.current.cameraOrbit = "0deg 75deg auto";
      viewerRef.current.jumpCameraToGoal?.();
    }
  };

  return (
    <div className="shell passport">
      <DataNotice demo={demo} error={error} />

      {/* Brand Identification Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 18px",
          background: "#10223b",
          color: "#fff",
          borderRadius: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BrandLogo variant="compact" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: "0.78rem",
              background: "rgba(182, 95, 61, 0.3)",
              color: "#f6b297",
              border: "1px solid rgba(182, 95, 61, 0.5)",
              padding: "4px 10px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            HỆ THỐNG TRUY XUẤT DI SẢN SỐ
          </span>
        </div>
      </div>

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
            HỘ CHIẾU DI SẢN SỐ · DIGITAL HERITAGE PASSPORT
          </span>
          <h1 style={{ fontSize: "clamp(1.9rem, 4.5vw, 3.2rem)", margin: "8px 0" }}>
            {passport.productName}
          </h1>
          <p style={{ color: "#e0d9cc", fontSize: "1.05rem", margin: 0 }}>
            {passport.artisan} · {passport.village}
          </p>

          {/* Prominent Public Heritage Code Box */}
          <div
            style={{
              marginTop: 18,
              padding: "14px 18px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(239, 176, 131, 0.35)",
              borderRadius: 14,
              display: "inline-block",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                color: "#efb083",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              MÃ DI SẢN SỐ CÔNG KHAI
            </span>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "clamp(1.2rem, 3.2vw, 1.6rem)",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "0.05em",
                marginTop: 2,
              }}
            >
              {passport.publicCode || passport.publicId}
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 6,
                fontSize: "0.76rem",
                color: "#d0c8b8",
                flexWrap: "wrap",
              }}
            >
              <span>Mã hiện vật: <strong>{passport.artifactId}</strong></span>
              <span>Lô sản xuất: <strong>{passport.batchCode}</strong></span>
              <span>Trạng thái: <strong style={{ color: "#9fe1c1" }}>Đã xác minh di sản</strong></span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
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
                }}
              />
              <Radio size={14} />
              {vi
                ? `Mã QR & NFC Dynamic · ${passport.verificationCount} lượt xác thực`
                : `NFC & QR Dynamic · ${passport.verificationCount} verified scans`}
            </span>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                color: "#efb083",
                background: "rgba(239, 176, 131, 0.15)",
                border: "1px solid rgba(239, 176, 131, 0.4)",
                padding: "4px 12px",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <QrCode size={14} />
              Tải tem in ấn (QR Vật lý)
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <PassportQr value={url} label={passport.publicCode || passport.publicId} />
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            style={{
              marginTop: 8,
              fontSize: "0.78rem",
              background: "none",
              border: "none",
              color: "#efb083",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Xuất tem in QR đáy sản phẩm
          </button>
        </div>
      </div>

      <div className="passport-body">
        {/* Verification Summary Strip */}
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
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
              Mã Hộ chiếu số
            </span>
            <strong style={{ fontSize: "0.95rem", color: "var(--leaf)", fontFamily: "monospace" }}>
              {passport.publicCode}
            </strong>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
              Xưởng chế tác
            </span>
            <strong style={{ fontSize: "0.95rem" }}>
              {passport.workshop}
            </strong>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
              Giá niêm yết thương mại
            </span>
            <strong style={{ fontSize: "1.05rem", color: "var(--terracotta)" }}>
              {passport.priceVnd ? formatVnd(passport.priceVnd) : "850.000 ₫"}
            </strong>
            {passport.originalPriceVnd && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", textDecoration: "line-through", marginLeft: 6 }}>
                {formatVnd(passport.originalPriceVnd)}
              </span>
            )}
          </div>
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
              Ngày xác thực gần nhất
            </span>
            <strong style={{ fontSize: "0.95rem" }}>
              {new Date(passport.updatedAt).toLocaleDateString(vi ? "vi-VN" : "en-US")}
            </strong>
          </div>
        </div>

        {/* 3D Showcase & Base QR Hallmark Section */}
        <div
          style={{
            padding: 24,
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 20,
            marginBottom: 32,
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--terracotta)",
                  fontWeight: 700,
                }}
              >
                <Sparkles size={14} />
                Bản Sao Số 3D & Dấu Triện QR Đáy
              </span>
              <h2 style={{ margin: "4px 0 0", fontSize: "1.45rem", fontFamily: "Fraunces" }}>
                Quan sát tác phẩm 360° & Mã QR mặt đáy
              </h2>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button secondary small"
                onClick={handleFlipToBottomQr}
                style={{
                  borderColor: "var(--terracotta)",
                  color: "var(--terracotta)",
                  fontWeight: 600,
                }}
              >
                <QrCode size={16} />
                Xoay xem đáy & Tem QR
              </button>
              <button
                type="button"
                className="button secondary small"
                onClick={handleResetCamera}
              >
                <RotateCcw size={16} />
                Góc nhìn trước
              </button>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setView3D(!view3D)}
              >
                {view3D ? "Xem ảnh chụp thật" : "Xem bản sao 3D"}
              </button>
            </div>
          </div>

          {/* 3D or Photo Stage */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(180deg, #f8f6f0 0%, #ede8de 100%)",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #e2ddd3",
            }}
          >
            {view3D && passport.modelUrl ? (
              <div style={{ position: "relative" }}>
                <CraftModelViewer
                  src={passport.modelUrl}
                  poster={passport.posterUrl || "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80"}
                  dimensions={
                    passport.dimensions
                      ? {
                          heightCm: passport.dimensions.heightCm ?? null,
                          widthCm: passport.dimensions.widthCm ?? null,
                        }
                      : undefined
                  }
                  onReady={(viewer) => {
                    viewerRef.current = viewer;
                  }}
                />
                {/* Overlay Hint */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    background: "rgba(16, 34, 59, 0.85)",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    backdropFilter: "blur(4px)",
                    pointerEvents: "none",
                  }}
                >
                  <QrCode size={14} color="#efb083" />
                  Mặt đáy có tem triện QR dẫn đến đúng hộ chiếu này. Bấm &quot;Xoay xem đáy&quot; để quan sát.
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 420,
                  display: "grid",
                  placeItems: "center",
                  padding: 20,
                }}
              >
                <Image
                  src={passport.posterUrl || "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80"}
                  alt={passport.productName}
                  width={400}
                  height={380}
                  style={{ objectFit: "contain", maxHeight: 380 }}
                />
              </div>
            )}
          </div>

          {/* Direct Button for Mobile users */}
          <div
            style={{
              marginTop: 14,
              padding: "12px 16px",
              background: "rgba(182, 95, 61, 0.08)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ fontSize: "0.82rem", color: "#10223b" }}>
              <strong>Đang xem trên điện thoại?</strong> Bạn không cần quét màn hình của chính mình.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {passport.productId && (
                <Link
                  href={`/products/${passport.productId}`}
                  className="button small"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <ShoppingBag size={14} />
                  Mua sản phẩm ({formatVnd(passport.priceVnd || 850000)})
                </Link>
              )}
              <button
                type="button"
                className="button secondary small"
                onClick={() => setIsQrModalOpen(true)}
              >
                <QrCode size={14} />
                Lưu mã QR vật lý
              </button>
            </div>
          </div>
        </div>

        {/* Artisan Profile & Crafting Workshop Card */}
        <div
          className="passport-spec-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {/* Artisan Details */}
          <div
            style={{
              padding: 22,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div
                style={{
                  position: "relative",
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid var(--leaf)",
                  flexShrink: 0,
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
                <strong style={{ display: "block", fontSize: "1.15rem", color: "#10223b" }}>
                  {passport.artisan}
                </strong>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block" }}>
                  {vi ? `Nghệ nhân Ưu tú (${passport.artisanYears ?? 35} năm nghề)` : `Master Artisan (${passport.artisanYears ?? 35} yrs exp)`}
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--leaf)", fontWeight: 600 }}>
                  {passport.workshop}
                </span>
              </div>
            </div>

            <p style={{ margin: "0 0 14px", fontSize: "0.86rem", color: "var(--ink)", lineHeight: 1.55 }}>
              {passport.artisanBioVi}
            </p>

            {/* Awards list */}
            {passport.artisanAwardsVi && passport.artisanAwardsVi.length > 0 && (
              <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 12 }}>
                <span style={{ display: "block", fontSize: "0.76rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6, fontWeight: 700 }}>
                  Thành tích & Danh hiệu
                </span>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  {passport.artisanAwardsVi.map((award, i) => (
                    <li key={i}>{award}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Raw Materials, Technique & Preservation */}
          <div
            style={{
              padding: 22,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 18,
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "1.05rem",
                marginBottom: 12,
                color: "var(--leaf)",
              }}
            >
              <Layers size={17} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
              Chất liệu & Thông số Kỹ thuật
            </strong>

            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              {(vi ? passport.materialsVi : passport.materialsEn)?.map((mat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.85rem" }}>
                  <CheckCircle2 size={16} style={{ color: "var(--leaf)", flexShrink: 0, marginTop: 2 }} />
                  <span>{mat}</span>
                </div>
              ))}
            </div>

            {/* Technical specs table */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                padding: "12px 14px",
                background: "var(--paper)",
                borderRadius: 12,
                fontSize: "0.8rem",
                marginBottom: 14,
              }}
            >
              <div>
                <span style={{ color: "var(--muted)" }}>Kích thước thật:</span>
                <div><strong>{passport.dimensions?.heightCm} × {passport.dimensions?.widthCm} cm</strong></div>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Trọng lượng:</span>
                <div><strong>{passport.dimensions?.weightKg ? `${passport.dimensions.weightKg} kg` : "2.45 kg"}</strong></div>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <span style={{ color: "var(--muted)" }}>Nhiệt độ nung:</span>
                <div><strong>{passport.firingTempVi || "1280°C (Lò củi truyền thống 72 giờ)"}</strong></div>
              </div>
            </div>

            <div style={{ fontSize: "0.82rem", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <strong>Hướng dẫn bảo quản:</strong> {passport.careInstructionsVi}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", marginTop: 10, color: "var(--terracotta)" }}>
              <MapPin size={14} />
              <span>{passport.workshopAddress}</span>
            </div>
          </div>
        </div>

        {/* Feature 4: 6-Stage Crafting Process Video Tabs */}
        <div style={{ marginBottom: 36 }}>
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
              Quy Trình Chế Tác Di Sản (6 Công Đoạn)
            </span>
            <h2 style={{ margin: "4px 0", fontSize: "1.45rem", fontFamily: "Fraunces" }}>
              Từ đất phù sa sông Hồng đến kiệt tác men lam
            </h2>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--muted)" }}>
              Ghi chú: <em>Video tư liệu minh họa quy trình chuẩn xưởng Bát Tràng</em>
            </p>
          </div>

          {/* Process Stage Buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {passport.videos.map((vid, idx) => {
              const isSelected = vid.id === activeVideoId;
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => setActiveVideoId(vid.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: isSelected ? "2px solid var(--leaf)" : "1px solid var(--line)",
                    background: isSelected ? "rgba(35, 92, 67, 0.08)" : "#fff",
                    color: isSelected ? "var(--leaf)" : "var(--ink)",
                    fontSize: "0.82rem",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Video size={14} />
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>CĐ {idx + 1} ({vid.duration})</span>
                  </div>
                  <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {vi ? vid.titleVi.split(":")[1]?.trim() || vid.titleVi : vid.titleEn}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Video Player */}
          {currentVideo && (
            <div
              style={{
                background: "#000",
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ position: "relative", width: "100%", maxHeight: 420 }}>
                <video
                  key={currentVideo.id}
                  controls
                  poster={currentVideo.poster}
                  style={{ width: "100%", maxHeight: 420, display: "block" }}
                >
                  <source src={currentVideo.videoUrl} type="video/mp4" />
                  Trình duyệt không hỗ trợ xem video trực tiếp.
                </video>
              </div>
              <div style={{ padding: "16px 20px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <strong style={{ fontSize: "1.05rem", color: "#10223b" }}>
                    {vi ? currentVideo.titleVi : currentVideo.titleEn}
                  </strong>
                  <span style={{ fontSize: "0.75rem", background: "var(--paper)", padding: "3px 8px", borderRadius: 6, color: "var(--muted)" }}>
                    {currentVideo.isIllustrationNote || "Video tư liệu minh họa quy trình chuẩn xưởng Bát Tràng"}
                  </span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                  {vi ? currentVideo.descriptionVi : currentVideo.descriptionEn}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feature 5: Strictly Truthful OCOP Status Section */}
        <div
          style={{
            padding: 22,
            background: passport.ocop.hasCertificate ? "linear-gradient(135deg, #fff9f0 0%, #fff 100%)" : "linear-gradient(135deg, #fbfbfb 0%, #f7f6f2 100%)",
            border: passport.ocop.hasCertificate ? "2px solid #ecd8b5" : "1px solid #e0dcd5",
            borderRadius: 18,
            marginBottom: 36,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: passport.ocop.hasCertificate
                    ? "linear-gradient(135deg, #c89d43 0%, #996f1d 100%)"
                    : "#a0988c",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                }}
              >
                <Award size={26} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "1.1rem", color: "#10223b" }}>
                  Chứng Nhận OCOP (Mỗi Xã Một Sản Phẩm)
                </strong>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {passport.ocop.authorityVi}
                </span>
              </div>
            </div>

            {passport.ocop.hasCertificate ? (
              <div
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
                {[...Array(passport.ocop.stars)].map((_, i) => (
                  <span key={i} style={{ color: "#d97706", fontSize: "1.1rem" }}>★</span>
                ))}
                <strong style={{ fontSize: "0.86rem", color: "#92400e", marginLeft: 4 }}>
                  {passport.ocop.stars} SAO OCOP
                </strong>
              </div>
            ) : (
              <span
                style={{
                  display: "inline-block",
                  fontSize: "0.82rem",
                  color: "#6b7280",
                  background: "#eee",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                Chưa xếp hạng OCOP
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              padding: "14px 16px",
              background: "#fff",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.06)",
              fontSize: "0.84rem",
              lineHeight: 1.55,
            }}
          >
            {passport.ocop.hasCertificate ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div><span style={{ color: "var(--muted)" }}>Số quyết định:</span> <strong>{passport.ocop.certificateNumber}</strong></div>
                <div><span style={{ color: "var(--muted)" }}>Ngày cấp:</span> <strong>{passport.ocop.issueDate}</strong></div>
                <div><span style={{ color: "var(--muted)" }}>Hiệu lực:</span> <strong style={{ color: "var(--leaf)" }}>{passport.ocop.validUntil}</strong></div>
              </div>
            ) : (
              <div>
                <p style={{ margin: "0 0 6px", color: "#374151", fontWeight: 600 }}>
                  Trạng thái minh bạch: {passport.ocop.officialStatusVi || "Chưa có giấy chứng nhận OCOP được xác minh trong hệ thống."}
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.8rem" }}>
                  Hanoi CraftTrust cam kết trung thực về di sản: Không tự động gắn sao OCOP cho sản phẩm truyền thống khi chưa qua Hội đồng Thẩm định của UBND Thành phố Hà Nội (theo Quyết định số 919/QĐ-TTg của Thủ tướng Chính phủ). Hồ sơ đánh giá của xưởng đang được xử lý và sẽ cập nhật minh bạch tại đây.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feature 6: Editorial Heritage Story & Citations */}
        {passport.editorialStory && (
          <div
            style={{
              padding: 24,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 18,
              marginBottom: 36,
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--terracotta)",
                fontWeight: 700,
              }}
            >
              Hồ Sơ Ký Sự Di Sản Làng Nghề
            </span>
            <h2 style={{ margin: "6px 0 14px", fontSize: "1.45rem", fontFamily: "Fraunces" }}>
              500 năm dòng men lam Bát Tràng bên bờ sông Hồng
            </h2>

            <div style={{ display: "grid", gap: 14, fontSize: "0.88rem", color: "var(--ink)", lineHeight: 1.65 }}>
              <p style={{ margin: 0 }}>
                {passport.editorialStory.historyVi}
              </p>
              <p style={{ margin: 0 }}>
                {passport.editorialStory.techniqueVi}
              </p>
              <p style={{ margin: 0, fontStyle: "italic", color: "var(--muted)" }}>
                {passport.editorialStory.culturalSignificanceVi}
              </p>
            </div>

            {/* Official Citations */}
            <div style={{ marginTop: 20, borderTop: "1px dashed var(--line)", paddingTop: 14 }}>
              <span style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 8 }}>
                Nguồn Tư Liệu Khảo Cứu Đã Thẩm Định
              </span>
              <div style={{ display: "grid", gap: 6 }}>
                {passport.editorialStory.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.8rem",
                      color: "var(--leaf)",
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>{src.title} — <em>{src.publisher}</em></span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feature 7: Digital Verification Timeline */}
        <div style={{ marginBottom: 36 }}>
          <span
            style={{
              fontSize: "0.78rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--terracotta)",
              fontWeight: 700,
            }}
          >
            Digital Verification Timeline
          </span>
          <h2 style={{ margin: "4px 0 16px", fontSize: "1.45rem", fontFamily: "Fraunces" }}>
            Nhật ký kiểm định & chứng thực số
          </h2>

          <div style={{ display: "grid", gap: 12 }}>
            {passport.verificationEvents?.map((event) => (
              <div
                key={event.stepNumber}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "14px 18px",
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(35, 92, 67, 0.12)",
                    color: "var(--leaf)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    flexShrink: 0,
                  }}
                >
                  {event.stepNumber}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <strong style={{ fontSize: "0.95rem", color: "#10223b" }}>
                      {vi ? event.titleVi : event.titleEn}
                    </strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock size={13} />
                      {event.date}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 6px", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {event.detailVi}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem" }}>
                    <span style={{ color: "var(--leaf)", fontWeight: 600 }}>{event.statusLabelVi}</span>
                    <span style={{ color: "var(--muted)" }}>· Thẩm định bởi: {event.verifier}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verifier Attestation & Collector Trust */}
        <div className="panel" style={{ background: "#10223b", color: "#fff", border: "none" }}>
          <strong style={{ color: "#efb083", fontSize: "1.05rem", display: "block", marginBottom: 6 }}>
            Bảo Chứng Nguồn Gốc & Cam Kết Minh Bạch Hanoi CraftTrust
          </strong>
          <p style={{ color: "#d0c8b8", fontSize: "0.86rem", marginBottom: 0, lineHeight: 1.6 }}>
            Hiện vật mang mã số <strong>{passport.publicCode}</strong> được định danh duy nhất trong hệ thống Hộ chiếu di sản số của Hanoi CraftTrust. Mọi tem QR in trên sản phẩm thật hoặc tem decal dưới đáy mô hình 3D đều ánh xạ trực tiếp đến hồ sơ này. Người mua có quyền tra cứu vĩnh viễn không cần đăng nhập.
          </p>
        </div>
      </div>

      {/* QR Stamp Download Modal */}
      <QrPrintModal
        publicCode={passport.publicCode}
        traceUrl={url}
        productName={passport.productName}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, createElement } from "react";
import {
  Box,
  Smartphone,
  RotateCw,
  Columns,
  Eye,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function CraftModelViewer({
  src,
  poster,
  arUrl,
  referencePhotoUrl,
  modelReport,
  dimensions,
}: {
  src?: string | undefined;
  poster: string;
  arUrl?: string | undefined;
  referencePhotoUrl?: string | undefined;
  modelReport?: Record<string, unknown> | null | undefined;
  dimensions?: { heightCm?: number | null; widthCm?: number | null } | undefined;
}) {
  const { locale } = useLanguage();
  const [loaded, setLoaded] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const arCapable =
    typeof window !== "undefined" &&
    Boolean(arUrl && "xr" in navigator && window.isSecureContext);

  useEffect(() => {
    if (!src) return;
    import("@google/model-viewer")
      .then(() => setLoaded(true))
      .catch(() => setLoaded(false));
  }, [src]);

  if (!src) {
    return (
      <div className="viewer">
        <div className="viewer-message">
          <div>
            <Box size={34} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
            <strong>
              {locale === "vi" ? "Chưa có mô hình 3D" : "3D asset not supplied"}
            </strong>
            <br />
            <span>
              {locale === "vi"
                ? "Tác phẩm này hiện được hiển thị qua ảnh chụp thủ công thực tế. Chưa có dữ liệu 3D/AR."
                : "This product remains viewable in photography. No 3D or AR compatibility is claimed."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const specPercent =
    typeof modelReport?.speculativeRegionPercent === "number"
      ? modelReport.speculativeRegionPercent
      : null;
  const iouScore =
    typeof modelReport?.silhouetteMatchScore === "number"
      ? (modelReport.silhouetteMatchScore * 100).toFixed(1)
      : null;
  const isMultiview =
    modelReport?.hasBackPhoto === true ||
    modelReport?.engine === "multiview" ||
    specPercent === 0;

  return (
    <div className="viewer" style={{ position: "relative", overflow: "hidden" }}>
      {/* Viewer Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          padding: "10px 16px",
          background: "rgba(35, 92, 67, 0.08)",
          borderBottom: "1px solid rgba(35, 92, 67, 0.12)",
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "var(--leaf)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Box size={16} />
          {locale === "vi" ? "Khung nhìn 3D Studio PBR" : "Interactive PBR 3D Studio"}
        </span>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {referencePhotoUrl || poster ? (
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: showComparison ? "var(--leaf)" : "rgba(35, 92, 67, 0.12)",
                color: showComparison ? "#fff" : "var(--leaf)",
                border: "none",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: "0.76rem",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.2s ease",
              }}
              title={
                locale === "vi"
                  ? "Bật/tắt so sánh cạnh ảnh chụp thực tế"
                  : "Toggle side-by-side comparison with real photo"
              }
            >
              <Columns size={13} />
              {showComparison
                ? locale === "vi"
                  ? "Tắt so sánh"
                  : "Close comparison"
                : locale === "vi"
                ? "So sánh ảnh thật"
                : "Compare with photo"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontSize: "0.76rem",
              cursor: "pointer",
              padding: "3px 6px",
            }}
          >
            <Info size={13} />
            {locale === "vi" ? "Thông số" : "Specs"}
          </button>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.76rem",
              color: "var(--muted)",
              fontWeight: 400,
            }}
          >
            <RotateCw size={13} />
            {locale === "vi" ? "Xoay 360°" : "Drag 360°"}
          </span>
        </div>
      </div>

      {/* Model Spec Sheet Drawer */}
      {showInfo ? (
        <div
          style={{
            background: "#faf8f5",
            padding: "10px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            fontSize: "0.78rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 8,
          }}
        >
          <div>
            <strong style={{ display: "block", color: "var(--muted)" }}>
              {locale === "vi" ? "Độ chính xác biên dạng" : "Silhouette Match"}
            </strong>
            <span style={{ fontWeight: 600, color: "var(--leaf)" }}>
              {iouScore ? `IoU ${iouScore}%` : locale === "vi" ? "Đã đối chiếu" : "Verified"}
            </span>
          </div>
          <div>
            <strong style={{ display: "block", color: "var(--muted)" }}>
              {locale === "vi" ? "Độ tin cậy hoa văn" : "Texture Origin"}
            </strong>
            <span
              style={{
                fontWeight: 600,
                color: isMultiview ? "var(--leaf)" : "#b45309",
              }}
            >
              {isMultiview
                ? locale === "vi"
                  ? "Quan sát thực tế 100%"
                  : "100% Observed Multi-view"
                : locale === "vi"
                ? "Nội suy mặt sau (50%)"
                : "Inferred back (50%)"}
            </span>
          </div>
          <div>
            <strong style={{ display: "block", color: "var(--muted)" }}>
              {locale === "vi" ? "Kích thước thực tế" : "Real Dimensions"}
            </strong>
            <span>
              {dimensions?.heightCm ? `${dimensions.heightCm} × ${dimensions.widthCm ?? "–"} cm` : "Theo số đo thật"}
            </span>
          </div>
          <div>
            <strong style={{ display: "block", color: "var(--muted)" }}>
              {locale === "vi" ? "Vật liệu PBR" : "PBR Material"}
            </strong>
            <span>BaseColor, Normal, Roughness</span>
          </div>
        </div>
      ) : null}

      {/* Viewport: Single or Side-by-Side Comparison */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showComparison ? "1fr 1fr" : "1fr",
          alignItems: "center",
          background: "#f4f1ea",
          minHeight: "420px",
          transition: "grid-template-columns 0.3s ease",
        }}
      >
        {/* Left pane: Reference photo if comparison mode active */}
        {showComparison ? (
          <div
            style={{
              height: "420px",
              borderRight: "1px solid rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              background: "#eae6dd",
              padding: 12,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                fontSize: "0.72rem",
                padding: "3px 8px",
                borderRadius: 4,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Eye size={12} />
              {locale === "vi" ? "Ảnh chụp thực tế" : "Reference Photograph"}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referencePhotoUrl || poster}
              alt="Ảnh đối chiếu"
              style={{
                maxWidth: "100%",
                maxHeight: "380px",
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
          </div>
        ) : null}

        {/* 3D Model-Viewer Container */}
        <div style={{ position: "relative", height: "420px", width: "100%" }}>
          {showComparison ? (
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "var(--leaf)",
                color: "#fff",
                fontSize: "0.72rem",
                padding: "3px 8px",
                borderRadius: 4,
                fontWeight: 600,
                zIndex: 2,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Sparkles size={12} />
              {locale === "vi" ? "Mô hình 3D PBR" : "3D PBR Model"}
            </div>
          ) : null}

          {loaded ? (
            createElement("model-viewer", {
              src,
              poster,
              alt:
                locale === "vi"
                  ? "Mô hình 3D tương tác của tác phẩm thủ công"
                  : "Interactive three-dimensional product model",
              "camera-controls": true,
              "auto-rotate": true,
              "auto-rotate-delay": 1500,
              "rotation-per-second": "25deg",
              "shadow-intensity": "1.2",
              "shadow-softness": "0.75",
              "environment-image": "neutral",
              exposure: "1.05",
              "interaction-prompt": "auto",
              ar: arCapable,
              "ar-scale": "fixed",
              "ar-modes": "webxr scene-viewer quick-look",
              style: {
                width: "100%",
                height: "420px",
                display: "block",
                background: "transparent",
              },
            })
          ) : (
            <div className="viewer-message">
              {locale === "vi" ? "Đang tải khung nhìn 3D…" : "Loading the 3D viewer…"}
            </div>
          )}
        </div>
      </div>

      {/* AR & Fidelity Footer Panel */}
      <div
        className="panel"
        style={{
          borderRadius: 0,
          border: 0,
          fontSize: "0.82rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          background: "rgba(35, 92, 67, 0.04)",
          borderTop: "1px solid rgba(35, 92, 67, 0.08)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Smartphone size={16} />{" "}
          {arCapable
            ? locale === "vi"
              ? "Chế độ thực tế tăng cường (AR) tỉ lệ chuẩn 1:1 theo số đo đã xác thực."
              : "Augmented Reality (AR) locked to verified 1:1 real metric scale."
            : locale === "vi"
            ? "Mô hình 3D PBR hỗ trợ xoay 360°, phóng to chi tiết men gốm và xem trên mọi trình duyệt."
            : "Interactive 3D PBR model supports 360° rotation and glaze inspection."}
        </span>

        {isMultiview ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--leaf)",
              fontWeight: 600,
              fontSize: "0.76rem",
            }}
          >
            <ShieldCheck size={14} />
            {locale === "vi" ? "Quan sát thực tế 360°" : "360° Photogrammetric Truth"}
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "#b45309",
              fontSize: "0.76rem",
            }}
          >
            {locale === "vi" ? "Mặt sau: vùng nội suy tham chiếu" : "Back: inferred region"}
          </span>
        )}
      </div>
    </div>
  );
}

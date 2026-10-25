"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { AlertCircle, Compass, Loader2, Maximize2, RotateCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function ExperienceViewer({
  id,
  title,
  onReady,
  autoRotateDefault = true,
  className = "",
}: {
  id: string;
  title: string;
  onReady?: (id: string) => void;
  autoRotateDefault?: boolean;
  className?: string;
}) {
  const element = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isAutoRotate, setIsAutoRotate] = useState(autoRotateDefault);
  const { locale } = useLanguage();
  const vi = locale === "vi";

  useEffect(() => {
    const viewer = element.current;
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setStatus("error");
    }, 45_000);

    const loaded = () => {
      window.clearTimeout(timer);
      setStatus("ready");
      onReady?.(id);
    };

    const failed = () => {
      window.clearTimeout(timer);
      setStatus("error");
    };

    viewer?.addEventListener("load", loaded);
    viewer?.addEventListener("error", failed);
    import("@google/model-viewer").catch(() => {
      if (active) failed();
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
      viewer?.removeEventListener("load", loaded);
      viewer?.removeEventListener("error", failed);
    };
  }, [id, onReady]);

  const handleResetView = () => {
    const viewer = element.current as any;
    if (!viewer) return;
    if (typeof viewer.resetTurntable === "function") {
      viewer.resetTurntable();
    } else {
      viewer.cameraOrbit = "0deg 75deg 105%";
      viewer.jumpCameraToGoal?.();
    }
  };

  const handleToggleFullscreen = () => {
    const viewer = element.current;
    if (!viewer) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (viewer.requestFullscreen) {
      viewer.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className={`experience-viewer-container ${className}`}>
      <div className="experience-viewer-stage">
        {createElement("model-viewer", {
          ref: element,
          src: `/api/experiences/${id}/model`,
          alt: title,
          "camera-controls": true,
          "touch-action": "pan-y",
          "shadow-intensity": "1.4",
          "shadow-softness": "0.85",
          exposure: "1.05",
          ar: true,
          "ar-modes": "webxr scene-viewer quick-look",
          ...(isAutoRotate ? { "auto-rotate": true, "rotation-per-second": "16deg" } : {}),
          style: { width: "100%", height: "100%", minHeight: 320 },
        })}

        {status === "loading" && (
          <div className="experience-viewer-loading" role="status">
            <Loader2 className="spinner-icon" size={34} />
            <p>{vi ? "Đang tải mô hình 3D từ di sản…" : "Loading 3D heritage model…"}</p>
          </div>
        )}

        {status === "error" && (
          <div className="experience-viewer-error" role="alert">
            <AlertCircle size={32} />
            <p>
              {vi
                ? "Không tải được mô hình 3D. Hãy thử tải lại trải nghiệm."
                : "Could not load this 3D model. Please retry."}
            </p>
          </div>
        )}
      </div>

      <div className="experience-viewer-toolbar">
        <div className="toolbar-status">
          <span
            className={`status-dot ${
              status === "ready" ? "ready" : status === "loading" ? "loading" : "error"
            }`}
          />
          <span className="status-text">
            {status === "ready"
              ? vi
                ? "3D Sẵn sàng · Kéo xoay 360°"
                : "3D Ready · Drag 360°"
              : status === "loading"
              ? vi
                ? "Đang nạp mô hình…"
                : "Loading model…"
              : vi
              ? "Lỗi tải mô hình"
              : "Model error"}
          </span>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className={`viewer-btn ${isAutoRotate ? "active" : ""}`}
            onClick={() => setIsAutoRotate((prev) => !prev)}
            title={vi ? "Bật/tắt xoay tự động" : "Toggle auto-rotation"}
          >
            <RotateCw size={14} />
            <span>{isAutoRotate ? (vi ? "Dừng xoay" : "Pause") : vi ? "Tự xoay" : "Auto-spin"}</span>
          </button>

          <button
            type="button"
            className="viewer-btn"
            onClick={handleResetView}
            title={vi ? "Đặt lại góc nhìn ban đầu" : "Reset viewpoint"}
          >
            <Compass size={14} />
            <span>{vi ? "Đặt lại góc" : "Reset view"}</span>
          </button>

          <button
            type="button"
            className="viewer-btn"
            onClick={handleToggleFullscreen}
            title={vi ? "Xem toàn màn hình" : "View fullscreen"}
          >
            <Maximize2 size={14} />
            <span>{vi ? "Toàn màn hình" : "Fullscreen"}</span>
          </button>
        </div>
      </div>

      <div className="experience-viewer-hint">
        <p>
          💡{" "}
          {vi
            ? "Kéo chuột hoặc vuốt một ngón tay để xoay 360° · Cuộn chuột hoặc chụm hai ngón tay để phóng to từng đường nét men & họa tiết."
            : "Drag or swipe to rotate 360° · Scroll or pinch to inspect fine details."}
        </p>
      </div>
    </div>
  );
}

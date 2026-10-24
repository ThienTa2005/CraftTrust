"use client";

import { useEffect, useState } from "react";
import { createElement } from "react";
import { Box, Smartphone, RotateCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function CraftModelViewer({
  src,
  poster,
  arUrl
}: {
  src?: string | undefined;
  poster: string;
  arUrl?: string | undefined;
}) {
  const { locale } = useLanguage();
  const [loaded, setLoaded] = useState(false);
  const arCapable =
    typeof window !== "undefined" && Boolean(arUrl && "xr" in navigator && window.isSecureContext);

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
            <strong>{locale === "vi" ? "Chưa có mô hình 3D" : "3D asset not supplied"}</strong>
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

  return (
    <div className="viewer">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(35, 92, 67, 0.08)",
          borderBottom: "1px solid rgba(35, 92, 67, 0.12)",
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "var(--leaf)"
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Box size={16} />
          {locale === "vi" ? "Chế độ xem 3D tương tác" : "Interactive 3D Viewer"}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: "0.76rem",
            color: "var(--muted)",
            fontWeight: 400
          }}
        >
          <RotateCw size={13} />
          {locale === "vi" ? "Kéo để xoay 360° • Cuộn để zoom" : "Drag to rotate 360° • Scroll to zoom"}
        </span>
      </div>

      {loaded ? (
        createElement("model-viewer", {
          src,
          poster,
          alt: locale === "vi" ? "Mô hình 3D tương tác của tác phẩm thủ công" : "Interactive three-dimensional product model",
          "camera-controls": true,
          "auto-rotate": true,
          "shadow-intensity": "1",
          ar: arCapable,
          "ar-modes": "webxr scene-viewer quick-look",
          style: { width: "100%", height: "420px", display: "block" }
        })
      ) : (
        <div className="viewer-message">
          {locale === "vi" ? "Đang tải khung nhìn 3D…" : "Loading the 3D viewer…"}
        </div>
      )}

      <div className="panel" style={{ borderRadius: 0, border: 0, fontSize: "0.82rem" }}>
        <Smartphone size={16} />{" "}
        {arCapable
          ? locale === "vi"
            ? "Chế độ thực tế tăng cường (AR) sẵn sàng trên thiết bị hỗ trợ WebXR. Hệ điều hành sẽ quyết định khả năng kích hoạt cuối cùng."
            : "AR entry is available on this secure, WebXR-capable runtime. The OS performs the final compatibility check."
          : locale === "vi"
          ? "Chế độ thực tế ảo (AR) tự động ẩn nếu thiết bị hoặc trình duyệt không hỗ trợ WebXR."
          : "AR is hidden because a compatible asset, secure context, or runtime capability is missing."}
      </div>
    </div>
  );
}


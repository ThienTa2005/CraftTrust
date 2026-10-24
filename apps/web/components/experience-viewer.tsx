"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";

export function ExperienceViewer({ id, title, onReady }: {
  id: string;
  title: string;
  onReady?: (id: string) => void;
}) {
  const element = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const { locale } = useLanguage();

  useEffect(() => {
    const viewer = element.current;
    let active = true;
    const timer = window.setTimeout(() => { if (active) setStatus("error"); }, 45_000);
    const loaded = () => {
      window.clearTimeout(timer);
      setStatus("ready");
      onReady?.(id);
    };
    const failed = () => { window.clearTimeout(timer); setStatus("error"); };
    viewer?.addEventListener("load", loaded);
    viewer?.addEventListener("error", failed);
    import("@google/model-viewer").catch(() => { if (active) failed(); });
    return () => {
      active = false;
      window.clearTimeout(timer);
      viewer?.removeEventListener("load", loaded);
      viewer?.removeEventListener("error", failed);
    };
  }, [id, onReady]);

  return (
    <div className="experience-viewer">
      {createElement("model-viewer", {
        ref: element,
        src: `/api/experiences/${id}/model`,
        alt: title,
        "camera-controls": true,
        "touch-action": "pan-y",
        "shadow-intensity": "1",
        exposure: "1",
        style: { width: "100%", height: "min(60vh, 480px)", minHeight: 260 },
      })}
      <p role="status">
        {status === "error"
          ? locale === "vi" ? "Không tải được mô hình. Hãy mở lại trải nghiệm để thử lại." : "Could not load this model. Reopen the experience to retry."
          : status === "loading"
            ? locale === "vi" ? "Đang tải mô hình 3D…" : "Loading 3D model…"
            : locale === "vi" ? "Kéo để xoay 360°, cuộn hoặc chụm hai ngón tay để thu phóng." : "Drag to rotate; scroll or pinch to zoom."}
      </p>
    </div>
  );
}

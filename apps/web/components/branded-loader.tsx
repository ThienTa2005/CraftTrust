"use client";

import Image from "next/image";

export function BrandedLoader({
  message = "Đang kết nối không gian di sản số…",
  subtext = "Mỗi lần mua một lần về làng",
  compact = false,
  fullscreen = false,
}: {
  message?: string;
  subtext?: string;
  compact?: boolean;
  fullscreen?: boolean;
}) {
  if (compact) {
    return (
      <div className="branded-loader-compact" role="status" aria-live="polite">
        <div className="loader-emblem-pulse">
          <Image
            src="/brand/icon-192.png"
            width={36}
            height={36}
            alt="CraftTrust"
            priority
          />
        </div>
        {message && <span className="loader-compact-msg">{message}</span>}
      </div>
    );
  }

  return (
    <div
      className={`branded-loader-shell ${fullscreen ? "fullscreen" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="branded-loader-card">
        <div className="loader-emblem-halo">
          <div className="loader-glow-ring" />
          <Image
            className="loader-emblem-img"
            src="/brand/icon-512.png"
            width={96}
            height={96}
            alt="CraftTrust Logo"
            priority
          />
        </div>

        <div className="loader-brand-title">
          <span className="brand-word-blue">Craft</span>
          <span className="brand-word-gold">Trust</span>
        </div>

        <p className="loader-slogan">{subtext}</p>

        <div className="loader-bar-track">
          <div className="loader-bar-fill" />
        </div>

        <p className="loader-status-text">{message}</p>
      </div>
    </div>
  );
}

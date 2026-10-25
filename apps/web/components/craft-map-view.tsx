"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Route,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { RealInteractiveMap } from "@/components/real-interactive-map";
import { TOUR_ITINERARIES } from "@/lib/map-data";

export function CraftMapView() {
  const { locale, t } = useLanguage();
  const vi = locale === "vi";

  return (
    <div className="shell craft-map-shell" style={{ margin: "36px auto 90px" }}>
      {/* Header */}
      <div className="page-intro" style={{ maxWidth: 780, marginBottom: 28 }}>
        <span
          className="eyebrow"
          style={{
            color: "var(--leaf)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Compass size={16} />
          {vi ? "Bản đồ Địa lý Di sản & Tuyến Du lịch" : "Real Geographical Craft & Tourism Map"}
        </span>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", margin: "8px 0 10px" }}>
          {t.craftMap.title}
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
          {t.craftMap.subtitle}
        </p>
      </div>

      {/* Real Interactive Map Component */}
      <RealInteractiveMap />

      {/* Curated Day Tours Section */}
      <div style={{ marginTop: 60, borderTop: "1px solid var(--line)", paddingTop: 40 }}>
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              fontSize: "0.78rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--terracotta)",
              fontWeight: 700,
            }}
          >
            Gợi Ý Tuyến Khám Phá Trong Ngày
          </span>
          <h2 style={{ margin: "6px 0", fontSize: "1.6rem", fontFamily: "Fraunces" }}>
            Hành trình trải nghiệm văn hóa kinh kỳ Thăng Long
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            Các lộ trình kết hợp làng nghề truyền thống và danh thắng di tích đã được khảo sát thực địa.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {TOUR_ITINERARIES.map((tour) => (
            <div
              key={tour.id}
              style={{
                background: "#fff",
                borderRadius: 18,
                border: "1px solid var(--line)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span
                    style={{
                      background: "rgba(182, 95, 61, 0.1)",
                      color: "#b65f3d",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {tour.recommendedTransportVi}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={13} />
                    {tour.durationLabelVi}
                  </span>
                </div>

                <h3 style={{ margin: "0 0 6px", fontSize: "1.15rem", color: "#10223b" }}>
                  {vi ? tour.titleVi : tour.titleEn}
                </h3>
                <span style={{ display: "block", fontSize: "0.78rem", color: "var(--terracotta)", fontWeight: 600, marginBottom: 8 }}>
                  {vi ? tour.subtitleVi : tour.subtitleEn}
                </span>
                <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  {vi ? tour.descriptionVi : tour.descriptionEn}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px dashed var(--line)" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "block" }}>Điểm dừng:</span>
                  <strong style={{ fontSize: "0.88rem", color: "var(--leaf)" }}>
                    {tour.locationIds.length} địa điểm văn hóa
                  </strong>
                </div>
                <Link
                  href="/experiences"
                  className="button secondary small"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Calendar size={14} />
                  Đặt tour trải nghiệm
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

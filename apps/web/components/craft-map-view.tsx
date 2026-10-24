"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Clock,
  Sparkles,
  Route,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { CRAFT_MAP_LOCATIONS, TOUR_ITINERARIES } from "@/lib/map-data";
import type { CraftMapLocation } from "@craft-trust/contracts";

export function CraftMapView() {
  const { locale, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<
    "all" | "villages" | "attractions" | "tours"
  >("all");
  const [selectedLocationId, setSelectedLocationId] =
    useState<string>("loc-bat-trang");
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);

  const selectedLocation =
    CRAFT_MAP_LOCATIONS.find((loc) => loc.id === selectedLocationId) ??
    CRAFT_MAP_LOCATIONS[0]!;

  const selectedTour = selectedTourId
    ? (TOUR_ITINERARIES.find((tr) => tr.id === selectedTourId) ?? null)
    : null;

  // Filter locations
  const filteredLocations = CRAFT_MAP_LOCATIONS.filter((loc) => {
    if (activeTab === "villages") return loc.type === "craft_village";
    if (activeTab === "attractions") return loc.type === "tourism_attraction";
    if (selectedTour) return selectedTour.locationIds.includes(loc.id);
    return true;
  });

  const getPinIcon = (loc: CraftMapLocation) => {
    if (loc.id === "loc-bat-trang") return "🏺";
    if (loc.id === "loc-van-phuc") return "🧵";
    if (loc.id === "loc-chang-son") return "🪵";
    if (loc.id === "loc-phu-vinh") return "🎋";
    if (loc.id === "loc-quang-phu-cau") return "🪔";
    if (loc.id === "loc-lang-chuong") return "👒";
    if (loc.type === "tourism_attraction") return "⛩️";
    return "📍";
  };

  // Normalized coordinate projection for vector map rendering [0..100%]
  // Hanoi bounds roughly: lat 20.70..21.10, lng 105.55..105.95
  const getCoordinatesPct = (lat: number, lng: number) => {
    const minLat = 20.7;
    const maxLat = 21.08;
    const minLng = 105.52;
    const maxLng = 105.98;

    const x = ((lng - minLng) / (maxLng - minLng)) * 88 + 6;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 86 + 7;
    return { x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) };
  };

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
          {locale === "vi"
            ? "Bản đồ Di sản & Tuyến Du lịch"
            : "Heritage Craft & Tourism Map"}
        </span>
        <h1
          style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", margin: "8px 0 10px" }}
        >
          {t.craftMap.title}
        </h1>
        <p
          style={{
            fontSize: "1.05rem",
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {t.craftMap.subtitle}
        </p>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("all");
            setSelectedTourId(null);
          }}
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            border:
              activeTab === "all" && !selectedTourId
                ? "1px solid var(--leaf)"
                : "1px solid var(--line)",
            background:
              activeTab === "all" && !selectedTourId ? "var(--leaf)" : "#fff",
            color:
              activeTab === "all" && !selectedTourId ? "#fff" : "var(--ink)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t.craftMap.filterAll} ({CRAFT_MAP_LOCATIONS.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("villages");
            setSelectedTourId(null);
          }}
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            border:
              activeTab === "villages"
                ? "1px solid var(--leaf)"
                : "1px solid var(--line)",
            background: activeTab === "villages" ? "var(--leaf)" : "#fff",
            color: activeTab === "villages" ? "#fff" : "var(--ink)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t.craftMap.filterVillages} (6)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("attractions");
            setSelectedTourId(null);
          }}
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            border:
              activeTab === "attractions"
                ? "1px solid var(--leaf)"
                : "1px solid var(--line)",
            background: activeTab === "attractions" ? "var(--leaf)" : "#fff",
            color: activeTab === "attractions" ? "#fff" : "var(--ink)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t.craftMap.filterAttractions} (4)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("tours");
            setSelectedTourId(TOUR_ITINERARIES[0]!.id);
          }}
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            border:
              activeTab === "tours" || selectedTourId
                ? "1px solid var(--terracotta)"
                : "1px solid var(--line)",
            background:
              activeTab === "tours" || selectedTourId
                ? "var(--terracotta)"
                : "#fff",
            color:
              activeTab === "tours" || selectedTourId ? "#fff" : "var(--ink)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Route
            size={15}
            style={{
              display: "inline",
              verticalAlign: "middle",
              marginRight: 5,
            }}
          />
          {t.craftMap.filterTours} (3)
        </button>
      </div>

      {/* If Tour tab active, render Tour Selector bar */}
      {(activeTab === "tours" || selectedTourId) && (
        <div
          className="tour-selector-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginBottom: 24,
            padding: 16,
            background: "rgba(198, 94, 61, 0.06)",
            borderRadius: 16,
            border: "1px solid rgba(198, 94, 61, 0.18)",
          }}
        >
          {TOUR_ITINERARIES.map((tour) => {
            const isTourSelected = selectedTourId === tour.id;
            return (
              <button
                key={tour.id}
                type="button"
                onClick={() => {
                  setSelectedTourId(tour.id);
                  setSelectedLocationId(tour.locationIds[0] ?? "loc-bat-trang");
                }}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: isTourSelected
                    ? "2px solid var(--terracotta)"
                    : "1px solid var(--line)",
                  background: isTourSelected
                    ? "#fff"
                    : "rgba(255, 255, 255, 0.8)",
                  cursor: "pointer",
                  transition: "all .2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "0.92rem",
                      color: isTourSelected
                        ? "var(--terracotta)"
                        : "var(--ink)",
                    }}
                  >
                    {locale === "vi" ? tour.titleVi : tour.titleEn}
                  </strong>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--muted)",
                      fontWeight: 600,
                    }}
                  >
                    {locale === "vi"
                      ? tour.durationLabelVi
                      : tour.durationLabelEn}
                  </span>
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {locale === "vi" ? tour.subtitleVi : tour.subtitleEn}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Grid: Visual Topographic Map Canvas + Detail Inspector Drawer */}
      <div
        className="craft-map-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 24,
          alignItems: "start",
          marginBottom: 48,
        }}
      >
        {/* Interactive Vector Map Canvas */}
        <div
          className="craft-map-canvas"
          style={{
            position: "relative",
            minHeight: 560,
            background:
              "radial-gradient(circle at 60% 40%, #f7f3ea 0%, #ece5d6 100%)",
            border: "1px solid var(--line)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
          }}
        >
          {/* Topographic Background SVG (Red River & Day River flow) */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
            viewBox="0 0 1000 700"
            preserveAspectRatio="none"
          >
            {/* Grid coordinate guidelines */}
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="rgba(35, 92, 67, 0.05)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="1000" height="700" fill="url(#grid)" />

            {/* Sông Hồng (Red River) Path */}
            <path
              d="M 620,0 C 650,150 780,240 760,400 C 740,540 880,620 920,700"
              fill="none"
              stroke="#cbdbe5"
              strokeWidth="28"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M 620,0 C 650,150 780,240 760,400 C 740,540 880,620 920,700"
              fill="none"
              stroke="#90b8d4"
              strokeWidth="6"
              strokeDasharray="6,4"
              opacity="0.6"
            />
            <text
              x="790"
              y="320"
              fill="#719cb8"
              fontSize="13"
              fontWeight="700"
              letterSpacing="2"
            >
              SÔNG HỒNG (RED RIVER)
            </text>

            {/* Sông Đáy (Day River) Path */}
            <path
              d="M 280,0 C 310,180 390,320 420,520 C 440,620 460,700 480,700"
              fill="none"
              stroke="#dce8ee"
              strokeWidth="16"
              strokeLinecap="round"
              opacity="0.7"
            />
            <text
              x="350"
              y="440"
              fill="#8dafb8"
              fontSize="11"
              fontWeight="600"
              letterSpacing="1"
            >
              SÔNG ĐÁY
            </text>

            {/* Hanoi Center Marker (Hoan Kiem Lake) */}
            <circle cx="680" cy="270" r="14" fill="rgba(198, 94, 61, 0.15)" />
            <circle cx="680" cy="270" r="6" fill="var(--terracotta)" />
            <text
              x="702"
              y="275"
              fill="var(--ink)"
              fontSize="13"
              fontWeight="800"
            >
              TRUNG TÂM HÀ NỘI (HỒ GƯƠM)
            </text>

            {/* If a tour is selected, draw connecting route line */}
            {selectedTour && (
              <polyline
                points={selectedTour.locationIds
                  .map((id) => {
                    const loc = CRAFT_MAP_LOCATIONS.find((l) => l.id === id);
                    if (!loc) return "0,0";
                    const pt = getCoordinatesPct(
                      loc.coordinates.lat,
                      loc.coordinates.lng,
                    );
                    return `${(pt.x / 100) * 1000},${(pt.y / 100) * 700}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="var(--terracotta)"
                strokeWidth="4"
                strokeDasharray="8,6"
              />
            )}
          </svg>

          {/* Interactive Pins on Map */}
          {filteredLocations.map((loc) => {
            const isSelected = selectedLocationId === loc.id;
            const pt = getCoordinatesPct(
              loc.coordinates.lat,
              loc.coordinates.lng,
            );
            const icon = getPinIcon(loc);

            return (
              <div
                key={loc.id}
                onClick={() => setSelectedLocationId(loc.id)}
                style={{
                  position: "absolute",
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer",
                  zIndex: isSelected ? 10 : 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transition: "all .2s ease",
                }}
              >
                {/* Pin Circle */}
                <div
                  style={{
                    position: "relative",
                    width: isSelected ? 46 : 34,
                    height: isSelected ? 46 : 34,
                    borderRadius: "50%",
                    background: isSelected
                      ? "var(--terracotta)"
                      : loc.type === "craft_village"
                        ? "var(--leaf)"
                        : "var(--gold)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: isSelected ? "1.25rem" : "1rem",
                    boxShadow: isSelected
                      ? "0 0 0 4px rgba(198, 94, 61, 0.3), 0 10px 24px rgba(198, 94, 61, 0.4)"
                      : "0 3px 10px rgba(0,0,0,0.15)",
                    transition: "all var(--dur-normal) var(--ease-spring)",
                  }}
                >
                  {isSelected && (
                    <div
                      className="radar-pulse-ring"
                      style={{ borderColor: "var(--terracotta)" }}
                    />
                  )}
                  {icon}
                </div>

                {/* Floating Pin Label */}
                <span
                  style={{
                    marginTop: 4,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: isSelected
                      ? "var(--ink)"
                      : "rgba(255, 255, 255, 0.95)",
                    color: isSelected ? "#fff" : "var(--ink)",
                    fontSize: "0.72rem",
                    fontWeight: isSelected ? 800 : 600,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                    whiteSpace: "nowrap",
                    maxWidth: 130,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {locale === "vi" ? loc.nameVi : loc.nameEn}
                </span>
              </div>
            );
          })}

          {/* Map Compass Legend */}
          <div
            className="craft-map-legend"
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              padding: "8px 14px",
              background: "rgba(255, 255, 255, 0.9)",
              borderRadius: 10,
              fontSize: "0.72rem",
              color: "var(--muted)",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span>🏺 Làng nghề gốm / lụa / mộc</span>
            <span>⛩️ Di tích văn hóa lân cận</span>
            <span>📍 TT Hà Nội (Hồ Gươm)</span>
          </div>
        </div>

        {/* Selected Location Detail Inspector Drawer */}
        <div
          className="craft-map-detail"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          {/* Cover photo */}
          <div style={{ position: "relative", width: "100%", height: 210 }}>
            <Image
              src={selectedLocation.imageUrl}
              alt={selectedLocation.nameVi}
              fill
              style={{ objectFit: "cover" }}
            />
            <span
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                background: "rgba(23, 40, 32, 0.85)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: "0.74rem",
                fontWeight: 700,
              }}
            >
              {locale === "vi"
                ? selectedLocation.categoryVi
                : selectedLocation.categoryEn}
            </span>
          </div>

          <div style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--muted)",
                fontSize: "0.8rem",
                marginBottom: 4,
              }}
            >
              <MapPin size={14} style={{ color: "var(--terracotta)" }} />
              <span>{selectedLocation.district}</span>
              <span>•</span>
              <strong>
                {selectedLocation.distanceKmFromCenter} km{" "}
                {locale === "vi" ? "từ Hồ Gươm" : "from center"}
              </strong>
            </div>

            <h2
              style={{
                margin: "4px 0 10px",
                fontSize: "1.45rem",
                fontFamily: "Fraunces",
              }}
            >
              {locale === "vi"
                ? selectedLocation.nameVi
                : selectedLocation.nameEn}
            </h2>

            <p
              style={{
                margin: "0 0 16px",
                fontSize: "0.85rem",
                color: "var(--muted)",
                lineHeight: 1.55,
              }}
            >
              {locale === "vi"
                ? selectedLocation.summaryVi
                : selectedLocation.summaryEn}
            </p>

            {/* Quick Metrics */}
            <div
              className="craft-map-metrics"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                padding: "12px 14px",
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--line)",
                marginBottom: 16,
                fontSize: "0.78rem",
              }}
            >
              <div>
                <span style={{ display: "block", color: "var(--muted)" }}>
                  <Clock
                    size={12}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 4,
                    }}
                  />
                  {t.craftMap.travelTime}
                </span>
                <strong>
                  {selectedLocation.travelTimeMins}{" "}
                  {locale === "vi" ? "phút đi xe" : "mins drive"}
                </strong>
              </div>
              <div>
                <span style={{ display: "block", color: "var(--muted)" }}>
                  <Calendar
                    size={12}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 4,
                    }}
                  />
                  {t.craftMap.openHours}
                </span>
                <strong>
                  {locale === "vi"
                    ? selectedLocation.openingHoursVi
                    : selectedLocation.openingHoursEn}
                </strong>
              </div>
            </div>

            {/* Highlights List */}
            <div style={{ marginBottom: 20 }}>
              <strong
                style={{
                  display: "block",
                  fontSize: "0.84rem",
                  marginBottom: 8,
                  color: "var(--leaf)",
                }}
              >
                ✦ {t.craftMap.highlights}
              </strong>
              <div style={{ display: "grid", gap: 6 }}>
                {(locale === "vi"
                  ? selectedLocation.highlightsVi
                  : selectedLocation.highlightsEn
                ).map((hl, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: "0.8rem",
                    }}
                  >
                    <CheckCircle2
                      size={14}
                      style={{
                        color: "var(--leaf)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    />
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "grid", gap: 10 }}>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.coordinates.lat},${selectedLocation.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button full"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Navigation size={16} />
                <span>{t.craftMap.viewDirections}</span>
                <ExternalLink size={13} />
              </a>

              {selectedLocation.villageSlug && (
                <Link
                  href={`/villages/${selectedLocation.villageSlug}`}
                  className="button secondary full"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Sparkles size={16} />
                  <span>{t.craftMap.exploreCrafts}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Curated Tour Itineraries Deep-Dive Card */}
      {selectedTour && (
        <div
          style={{
            padding: 28,
            background: "linear-gradient(135deg, #fff9f0 0%, #fff 100%)",
            border: "2px solid #ecd8b5",
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <Route size={22} style={{ color: "var(--terracotta)" }} />
            <span
              style={{
                fontSize: "0.82rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
                color: "var(--terracotta)",
              }}
            >
              {locale === "vi"
                ? "Lộ trình Tour Chi tiết"
                : "Curated Day-Tour Itinerary"}
            </span>
          </div>

          <h2
            style={{
              margin: "4px 0 12px",
              fontSize: "1.6rem",
              fontFamily: "Fraunces",
            }}
          >
            {locale === "vi" ? selectedTour.titleVi : selectedTour.titleEn}
          </h2>

          <div
            style={{
              padding: "14px 18px",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid var(--line)",
              marginBottom: 18,
              fontSize: "0.86rem",
              lineHeight: 1.6,
            }}
          >
            <strong>
              {locale === "vi"
                ? "Phương tiện khuyến nghị: "
                : "Recommended Transport: "}
            </strong>
            {locale === "vi"
              ? selectedTour.recommendedTransportVi
              : selectedTour.recommendedTransportEn}
            <div style={{ marginTop: 8 }}>
              {locale === "vi"
                ? selectedTour.descriptionVi
                : selectedTour.descriptionEn}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--muted)",
              }}
            >
              {locale === "vi" ? "Các điểm dừng trong tour:" : "Tour stops:"}
            </span>
            {selectedTour.locationIds.map((locId, idx) => {
              const loc = CRAFT_MAP_LOCATIONS.find((l) => l.id === locId);
              return (
                <button
                  key={locId}
                  type="button"
                  onClick={() => setSelectedLocationId(locId)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border:
                      selectedLocationId === locId
                        ? "2px solid var(--leaf)"
                        : "1px solid var(--line)",
                    background:
                      selectedLocationId === locId
                        ? "rgba(35, 92, 67, 0.1)"
                        : "#fff",
                    color:
                      selectedLocationId === locId
                        ? "var(--leaf)"
                        : "var(--ink)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{idx + 1}.</span>
                  <span>{locale === "vi" ? loc?.nameVi : loc?.nameEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

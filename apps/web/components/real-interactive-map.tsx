"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  ExternalLink,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Route,
  Search,
  Sparkles,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { CRAFT_MAP_LOCATIONS, TOUR_ITINERARIES } from "@/lib/map-data";
import type { CraftMapLocation, TourItinerary } from "@craft-trust/contracts";

export function RealInteractiveMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylineRef = useRef<any>(null);

  const [selectedLocationId, setSelectedLocationId] = useState<string>("loc-bat-trang");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const selectedLocation =
    CRAFT_MAP_LOCATIONS.find((loc) => loc.id === selectedLocationId) ??
    CRAFT_MAP_LOCATIONS[0]!;

  const selectedTour = selectedTourId
    ? (TOUR_ITINERARIES.find((t) => t.id === selectedTourId) ?? null)
    : null;

  // Filter locations by search, category, and selected tour
  const filteredLocations = CRAFT_MAP_LOCATIONS.filter((loc) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = loc.nameVi.toLowerCase().includes(q) || loc.nameEn.toLowerCase().includes(q);
      const matchDist = loc.district.toLowerCase().includes(q);
      const matchCat = loc.categoryVi.toLowerCase().includes(q);
      if (!matchName && !matchDist && !matchCat) return false;
    }

    if (selectedCategory === "villages" && loc.type !== "craft_village") return false;
    if (selectedCategory === "attractions" && loc.type !== "tourism_attraction") return false;
    if (selectedCategory === "gom" && !loc.categoryVi.toLowerCase().includes("gốm")) return false;
    if (selectedCategory === "lua" && !loc.categoryVi.toLowerCase().includes("lụa")) return false;
    if (selectedCategory === "maytre" && !loc.categoryVi.toLowerCase().includes("mây tre")) return false;
    if (selectedCategory === "moc" && !loc.categoryVi.toLowerCase().includes("mộc")) return false;
    if (selectedCategory === "huong" && !loc.categoryVi.toLowerCase().includes("hương")) return false;
    if (selectedCategory === "non" && !loc.categoryVi.toLowerCase().includes("nón")) return false;

    if (selectedTour && !selectedTour.locationIds.includes(loc.id)) return false;

    return true;
  });

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = await import("leaflet");

      // Center roughly around Hanoi metropolitan area (lat 20.95, lng 105.80)
      const map = L.map(mapContainerRef.current, {
        center: [20.95, 105.80],
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // CartoDB Voyager tiles: clean, readable, high-contrast cartography
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers
      renderMarkers(L, map);
    }

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when filteredLocations or selectedLocationId changes
  useEffect(() => {
    async function update() {
      if (!mapInstanceRef.current) return;
      const L = await import("leaflet");
      renderMarkers(L, mapInstanceRef.current);
    }
    void update();
  }, [filteredLocations, selectedLocationId, selectedTourId]);

  function getPinEmoji(loc: CraftMapLocation) {
    if (loc.id === "loc-bat-trang") return "🏺";
    if (loc.id === "loc-van-phuc") return "🧵";
    if (loc.id === "loc-chang-son") return "🪵";
    if (loc.id === "loc-phu-vinh") return "🎋";
    if (loc.id === "loc-quang-phu-cau") return "🪔";
    if (loc.id === "loc-lang-chuong") return "👒";
    if (loc.type === "tourism_attraction") return "⛩️";
    return "📍";
  }

  function renderMarkers(L: any, map: any) {
    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    filteredLocations.forEach((loc) => {
      const isSelected = selectedLocationId === loc.id;
      const emoji = getPinEmoji(loc);

      const html = `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          background: ${isSelected ? "#b65f3d" : "#10223b"};
          color: #fff;
          padding: 4px 10px;
          border-radius: 999px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          border: 2px solid ${isSelected ? "#fff" : "#c89d43"};
          cursor: pointer;
          font-family: system-ui, sans-serif;
          white-space: nowrap;
          transform: translate(-50%, -50%) ${isSelected ? "scale(1.15)" : "scale(1)"};
          transition: transform 0.2s ease;
        ">
          <span style="font-size: 15px;">${emoji}</span>
          <span style="font-size: 12px; font-weight: 700;">${loc.nameVi}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html,
        iconSize: [120, 36],
        iconAnchor: [60, 18],
      });

      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], { icon: customIcon })
        .addTo(map)
        .on("click", () => {
          setSelectedLocationId(loc.id);
          map.panTo([loc.coordinates.lat, loc.coordinates.lng], { animate: true });
        });

      markersRef.current[loc.id] = marker;
    });

    // Draw tour polyline if tour is selected
    if (selectedTour) {
      const tourPoints: [number, number][] = [];
      selectedTour.locationIds.forEach((id) => {
        const found = CRAFT_MAP_LOCATIONS.find((l) => l.id === id);
        if (found) tourPoints.push([found.coordinates.lat, found.coordinates.lng]);
      });

      if (tourPoints.length > 1) {
        polylineRef.current = L.polyline(tourPoints, {
          color: "#b65f3d",
          weight: 4,
          dashArray: "8, 6",
          opacity: 0.85,
        }).addTo(map);
      }
    }
  }

  // Handle fly to location
  const handleSelectLocation = (id: string) => {
    setSelectedLocationId(id);
    const loc = CRAFT_MAP_LOCATIONS.find((l) => l.id === id);
    if (loc && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.coordinates.lat, loc.coordinates.lng], 14, {
        duration: 1.2,
      });
    }
  };

  // User Geolocation
  const handleLocateMe = async () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocating(false);

        if (mapInstanceRef.current) {
          const L = await import("leaflet");
          const userIcon = L.divIcon({
            html: `<div style="width: 18px; height: 18px; background: #2563eb; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 10px rgba(37,99,235,0.8); animation: pulse-soft 1.5s infinite;"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          L.marker([latitude, longitude], { icon: userIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup("Vị trí hiện tại của bạn")
            .openPopup();
          mapInstanceRef.current.flyTo([latitude, longitude], 13);
        }
      },
      (err) => {
        setLocating(false);
        alert(`Không thể lấy vị trí hiện tại: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.coordinates.lat},${selectedLocation.coordinates.lng}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Search & Category Filter Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "clamp(12px, 2.5vw, 18px)",
          background: "#fff",
          borderRadius: 18,
          border: "1px solid var(--line)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          boxSizing: "border-box",
          maxWidth: "100%",
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "min(100%, 180px)", flex: 1, maxWidth: "100%" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên làng nghề, quận huyện, hoặc dòng sản phẩm..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 12,
              border: "1px solid #dcd7cc",
              fontSize: "0.86rem",
              outline: "none",
            }}
          />
        </div>

        {/* Categories Chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "Tất cả địa điểm" },
            { id: "gom", label: "Gốm sứ" },
            { id: "lua", label: "Dệt lụa" },
            { id: "maytre", label: "Mây tre đan" },
            { id: "moc", label: "Chạm mộc" },
            { id: "huong", label: "Tăm hương" },
            { id: "non", label: "Nón lá" },
            { id: "attractions", label: "Điểm tham quan" },
          ].map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedTourId(null);
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: isCatActive ? "1px solid #10223b" : "1px solid #e0dcd5",
                  background: isCatActive ? "#10223b" : "#fff",
                  color: isCatActive ? "#fff" : "var(--ink)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Locate Me Button */}
        <button
          type="button"
          className="button secondary small"
          onClick={handleLocateMe}
          disabled={locating}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <LocateFixed size={15} color="#2563eb" />
          <span>{locating ? "Đang định vị..." : "Vị trí của tôi"}</span>
        </button>
      </div>

      {/* Main Map Viewport & Details Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.55fr 1fr",
          gap: 20,
          alignItems: "stretch",
        }}
        className="craft-map-main-grid"
      >
        {/* Real Leaflet Map Container */}
        <div
          style={{
            position: "relative",
            minHeight: 600,
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid var(--line)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: 600 }} />

          {/* Quick Legend Overlay */}
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 500,
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(6px)",
              padding: "8px 12px",
              borderRadius: 12,
              fontSize: "0.74rem",
              border: "1px solid #e5e0d4",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#b65f3d" }} />
              <strong>Đang chọn:</strong> {selectedLocation.nameVi}
            </div>
            <div style={{ color: "var(--muted)" }}>
              {selectedLocation.coordinates.lat.toFixed(4)}, {selectedLocation.coordinates.lng.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Inspector & Location Detail Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid var(--line)",
            padding: 22,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            {/* Image Preview */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 220,
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <Image
                src={selectedLocation.imageUrl}
                alt={selectedLocation.nameVi}
                fill
                style={{ objectFit: "cover" }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  background: "rgba(16, 34, 59, 0.85)",
                  color: "#fff",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  backdropFilter: "blur(4px)",
                }}
              >
                {selectedLocation.categoryVi}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "1.35rem", color: "#10223b", fontFamily: "Fraunces" }}>
                  {selectedLocation.nameVi}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--terracotta)" }}>
                  <MapPin size={14} />
                  <span>{selectedLocation.district}, TP. Hà Nội</span>
                  <span>· {selectedLocation.distanceKmFromCenter} km từ Trung tâm</span>
                </div>
              </div>
            </div>

            <p style={{ margin: "14px 0", fontSize: "0.86rem", color: "var(--ink)", lineHeight: 1.55 }}>
              {selectedLocation.summaryVi}
            </p>

            {/* Highlights */}
            <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: 12, marginBottom: 16 }}>
              <span style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>
                Điểm Trải Nghiệm Nổi Bật
              </span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5 }}>
                {selectedLocation.highlightsVi.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>

            {/* Verified Coordinate Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                padding: "10px 12px",
                border: "1px dashed var(--line)",
                borderRadius: 10,
                fontSize: "0.78rem",
                color: "var(--muted)",
                marginBottom: 16,
              }}
            >
              <div>Tọa độ Vĩ độ: <strong>{selectedLocation.coordinates.lat}° N</strong></div>
              <div>Tọa độ Kinh độ: <strong>{selectedLocation.coordinates.lng}° E</strong></div>
              <div>Giờ mở cửa: <strong>{selectedLocation.openingHoursVi}</strong></div>
              <div>Hotline hỗ trợ: <strong>{selectedLocation.contactHotline}</strong></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "grid", gap: 10 }}>
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="button"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#10223b",
                color: "#fff",
              }}
            >
              <Navigation size={16} />
              Chỉ đường Google Maps đến đây
            </a>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {selectedLocation.villageSlug ? (
                <Link
                  href={`/villages/${selectedLocation.villageSlug}`}
                  className="button secondary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Compass size={15} />
                  Xem Làng nghề
                </Link>
              ) : (
                <Link
                  href="/marketplace"
                  className="button secondary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Compass size={15} />
                  Xem tác phẩm
                </Link>
              )}

              <Link
                href="/trace/CT-BTG-NVA-2026-0085"
                className="button secondary"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <ExternalLink size={15} />
                Tra cứu Hộ chiếu
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Villages Carousel List at Bottom */}
      <div style={{ marginTop: 12 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: "1.1rem", color: "#10223b" }}>
          Khám phá danh sách các làng nghề tiêu biểu
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {filteredLocations.map((loc) => {
            const isSelected = selectedLocationId === loc.id;
            return (
              <div
                key={loc.id}
                onClick={() => handleSelectLocation(loc.id)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: isSelected ? "2px solid #b65f3d" : "1px solid var(--line)",
                  background: isSelected ? "rgba(182, 95, 61, 0.05)" : "#fff",
                  cursor: "pointer",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 54,
                    height: 54,
                    borderRadius: 10,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <Image src={loc.imageUrl} alt={loc.nameVi} fill style={{ objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {loc.nameVi}
                  </strong>
                  <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)" }}>
                    {loc.categoryVi}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--terracotta)", fontWeight: 600 }}>
                    {loc.distanceKmFromCenter} km từ Trung tâm
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

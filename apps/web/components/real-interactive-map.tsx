"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Compass,
  ExternalLink,
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { CRAFT_MAP_LOCATIONS, TOUR_ITINERARIES } from "@/lib/map-data";
import type { CraftMapLocation } from "@craft-trust/contracts";

export interface TileProvider {
  id: string;
  name: string;
  shortLabel: string;
  url: string;
  attribution: string;
  subdomains?: string[];
  maxZoom: number;
}

export const TILE_PROVIDERS: TileProvider[] = [
  {
    id: "esri-street",
    name: "Bản đồ Du lịch (Esri World Street)",
    shortLabel: "Du lịch",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, USGS, Intermap',
    maxZoom: 18,
  },
  {
    id: "osm-standard",
    name: "Bản đồ Chi tiết (OpenStreetMap)",
    shortLabel: "Chi tiết",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    subdomains: ["a", "b", "c"],
    maxZoom: 19,
  },
  {
    id: "esri-topo",
    name: "Bản đồ Địa hình & Làng nghề (Esri Topo)",
    shortLabel: "Địa hình",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, FAO, NOAA, USGS',
    maxZoom: 18,
  },
];

export function RealInteractiveMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylineRef = useRef<any>(null);
  const tileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inspectorCardRef = useRef<HTMLDivElement>(null);

  const [currentProviderIndex, setCurrentProviderIndex] = useState<number>(0);
  const [tileLoading, setTileLoading] = useState<boolean>(true);
  const [tileLoadError, setTileLoadError] = useState<boolean>(false);
  const [tileNotice, setTileNotice] = useState<string | null>(null);

  const [selectedLocationId, setSelectedLocationId] = useState<string>("loc-bat-trang");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);

  const selectedLocation =
    CRAFT_MAP_LOCATIONS.find((loc) => loc.id === selectedLocationId) ??
    CRAFT_MAP_LOCATIONS[0]!;

  const selectedTour = selectedTourId
    ? (TOUR_ITINERARIES.find((t) => t.id === selectedTourId) ?? null)
    : null;

  // Filter locations by search, category, and selected tour
  const filteredLocations = useMemo(() => {
    return CRAFT_MAP_LOCATIONS.filter((loc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName =
          loc.nameVi.toLowerCase().includes(q) ||
          loc.nameEn.toLowerCase().includes(q);
        const matchDist = loc.district.toLowerCase().includes(q);
        const matchCat = loc.categoryVi.toLowerCase().includes(q);
        if (!matchName && !matchDist && !matchCat) return false;
      }

      if (selectedCategory === "villages" && loc.type !== "craft_village")
        return false;
      if (selectedCategory === "attractions" && loc.type !== "tourism_attraction")
        return false;
      if (selectedCategory === "gom" && !loc.categoryVi.toLowerCase().includes("gốm"))
        return false;
      if (selectedCategory === "lua" && !loc.categoryVi.toLowerCase().includes("lụa"))
        return false;
      if (
        selectedCategory === "maytre" &&
        !loc.categoryVi.toLowerCase().includes("mây tre")
      )
        return false;
      if (selectedCategory === "moc" && !loc.categoryVi.toLowerCase().includes("mộc"))
        return false;
      if (
        selectedCategory === "huong" &&
        !loc.categoryVi.toLowerCase().includes("hương")
      )
        return false;
      if (selectedCategory === "non" && !loc.categoryVi.toLowerCase().includes("nón"))
        return false;

      if (selectedTour && !selectedTour.locationIds.includes(loc.id))
        return false;

      return true;
    });
  }, [searchQuery, selectedCategory, selectedTour]);

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

  // Robust Tile Layer Switching & Health Monitoring
  const mountTileLayer = useCallback((providerIndex: number) => {
    if (!mapInstanceRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    if (tileTimeoutRef.current) {
      clearTimeout(tileTimeoutRef.current);
      tileTimeoutRef.current = null;
    }

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const provider = TILE_PROVIDERS[providerIndex];
    if (!provider) return;

    setCurrentProviderIndex(providerIndex);
    setTileLoading(true);
    setTileLoadError(false);

    let loadedCount = 0;
    let errorCount = 0;

    const layerOptions: any = {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains ?? ["a", "b", "c"],
      crossOrigin: true,
    };

    if (provider.id.includes("carto")) {
      layerOptions.detectRetina = true;
    }

    const newLayer = L.tileLayer(provider.url, layerOptions);

    newLayer.on("tileloadstart", () => {
      setTileLoading(true);
    });

    newLayer.on("tileload", () => {
      loadedCount++;
      if (tileTimeoutRef.current) {
        clearTimeout(tileTimeoutRef.current);
        tileTimeoutRef.current = null;
      }
      setTileLoading(false);
      setTileLoadError(false);
      setTileNotice(null);
    });

    newLayer.on("tileerror", () => {
      errorCount++;
      // If 4+ tiles fail and none has loaded yet, auto-switch to next fallback tier
      if (errorCount >= 4 && loadedCount === 0) {
        if (tileTimeoutRef.current) {
          clearTimeout(tileTimeoutRef.current);
          tileTimeoutRef.current = null;
        }

        if (providerIndex < TILE_PROVIDERS.length - 1) {
          const nextIndex = providerIndex + 1;
          const nextProv = TILE_PROVIDERS[nextIndex];
          setTileNotice(
            `Máy chủ ${provider.shortLabel} phản hồi chậm, đang chuyển sang ${nextProv?.shortLabel ?? "dự phòng"}...`
          );
          mountTileLayer(nextIndex);
        } else {
          setTileLoading(false);
          setTileLoadError(true);
        }
      }
    });

    // 8-second safety timeout: If network stalls completely and 0 tiles load
    tileTimeoutRef.current = setTimeout(() => {
      if (loadedCount === 0) {
        if (providerIndex < TILE_PROVIDERS.length - 1) {
          const nextIndex = providerIndex + 1;
          const nextProv = TILE_PROVIDERS[nextIndex];
          setTileNotice(
            `Hết thời gian chờ máy chủ ${provider.shortLabel}, đang kết nối ${nextProv?.shortLabel ?? "dự phòng"}...`
          );
          mountTileLayer(nextIndex);
        } else {
          setTileLoading(false);
          setTileLoadError(true);
        }
      }
    }, 8000);

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, []);

  // Render map markers and tour routes
  const renderMarkers = useCallback((L: any, map: any) => {
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

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 170px; padding: 2px;">
          <strong style="display: block; font-size: 13px; color: #10223b; margin-bottom: 2px;">
            ${emoji} ${loc.nameVi}
          </strong>
          <span style="display: block; font-size: 11px; color: #b65f3d; font-weight: 600; margin-bottom: 6px;">
            ${loc.categoryVi}
          </span>
          <p style="margin: 0 0 6px; font-size: 11px; color: #555; line-height: 1.35;">
            ${loc.summaryVi.slice(0, 80)}...
          </p>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.coordinates.lat},${loc.coordinates.lng}" 
             target="_blank" rel="noopener noreferrer" 
             style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: #10223b; color: #fff; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Chỉ đường Google Maps →
          </a>
        </div>
      `;

      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
        icon: customIcon,
      })
        .addTo(map)
        .bindPopup(popupHtml, { offset: [0, -10] })
        .on("click", () => {
          setSelectedLocationId(loc.id);
          map.panTo([loc.coordinates.lat, loc.coordinates.lng], {
            animate: true,
          });
          if (
            typeof window !== "undefined" &&
            window.innerWidth < 960 &&
            inspectorCardRef.current
          ) {
            inspectorCardRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        });

      markersRef.current[loc.id] = marker;
    });

    // Draw tour polyline if a tour is selected
    if (selectedTour) {
      const tourPoints: [number, number][] = [];
      selectedTour.locationIds.forEach((id) => {
        const found = CRAFT_MAP_LOCATIONS.find((l) => l.id === id);
        if (found)
          tourPoints.push([found.coordinates.lat, found.coordinates.lng]);
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
  }, [filteredLocations, selectedLocationId, selectedTour]);

  // Leaflet initialization with race condition prevention and resize handling
  useEffect(() => {
    let isMounted = true;
    let t1: any = null;
    let t2: any = null;
    let t3: any = null;
    let ro: ResizeObserver | null = null;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const container = mapContainerRef.current;
      // Clean up any stale leaflet id on the container before recreating
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }

      const L = leafletRef.current ?? (await import("leaflet"));
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      leafletRef.current = L;

      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }

      const map = L.map(container, {
        center: [20.95, 105.80],
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;
      setMapReady(true);

      // Mount primary tile provider with fallback monitoring
      mountTileLayer(0);

      // Multiple staggered size invalidations to ensure proper rendering after layout settlement
      t1 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 100);
      t2 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 400);
      t3 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 900);

      if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
        ro = new ResizeObserver(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        });
        ro.observe(mapContainerRef.current);
      }
    }

    void initMap();

    const handleWindowResize = () => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    };
    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("orientationchange", handleWindowResize);

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (tileTimeoutRef.current) {
        clearTimeout(tileTimeoutRef.current);
        tileTimeoutRef.current = null;
      }
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("orientationchange", handleWindowResize);
      ro?.disconnect();

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, [mountTileLayer]);

  // Update markers when filtered locations or selected location change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !leafletRef.current) return;
    renderMarkers(leafletRef.current, mapInstanceRef.current);
    mapInstanceRef.current.invalidateSize();
  }, [mapReady, renderMarkers]);

  // Handle fly to location
  const handleSelectLocation = (id: string) => {
    setSelectedLocationId(id);
    const loc = CRAFT_MAP_LOCATIONS.find((l) => l.id === id);
    if (loc && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [loc.coordinates.lat, loc.coordinates.lng],
        14,
        { duration: 1.2 }
      );
      mapInstanceRef.current.invalidateSize();
    }
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 960 &&
      inspectorCardRef.current
    ) {
      inspectorCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
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
        setLocating(false);

        if (mapInstanceRef.current && leafletRef.current) {
          const L = leafletRef.current;
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

  const handleRetryTileLoad = () => {
    setTileLoadError(false);
    mountTileLayer(0);
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
        <div
          style={{
            position: "relative",
            minWidth: "min(100%, 220px)",
            flex: 1,
            maxWidth: "100%",
          }}
        >
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
                  border: isCatActive
                    ? "1px solid #10223b"
                    : "1px solid #e0dcd5",
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
      <div className="craft-map-main-grid">
        {/* Real Leaflet Map Container with Canvas Fallbacks */}
        <div className="craft-map-viewport-panel">
          <div ref={mapContainerRef} className="craft-map-leaflet-wrapper" />

          {/* Loading Skeleton / Badge */}
          {tileLoading && !tileLoadError && (
            <div className="craft-map-loading-overlay">
              <Loader2 size={15} className="spinner-icon" />
              <span>Đang tải dữ liệu bản đồ di sản...</span>
            </div>
          )}

          {/* Fallback Notice Toast */}
          {tileNotice && (
            <div
              style={{
                position: "absolute",
                top: 56,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 800,
                background: "rgba(182, 95, 61, 0.95)",
                color: "#fff",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: "0.76rem",
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {tileNotice}
            </div>
          )}

          {/* Error Fallback Card if all tile servers fail */}
          {tileLoadError && (
            <div className="craft-map-error-overlay">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(182, 95, 61, 0.12)",
                  color: "var(--terracotta)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={26} />
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "1.05rem",
                    color: "#10223b",
                    marginBottom: 4,
                  }}
                >
                  Không thể kết nối máy chủ bản đồ trực tuyến
                </strong>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.84rem",
                    color: "var(--muted)",
                    lineHeight: 1.5,
                    maxWidth: 440,
                  }}
                >
                  Đường truyền mạng hoặc kết nối vệ tinh tạm thời gián đoạn.
                  Tọa độ địa lý của <strong>{selectedLocation.nameVi}</strong> và
                  các làng nghề vẫn sẵn sàng để tra cứu hoặc chỉ đường.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "center",
                  marginTop: 6,
                }}
              >
                <button
                  type="button"
                  className="button primary small"
                  onClick={handleRetryTileLoad}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshCw size={14} />
                  <span>Thử tải lại bản đồ</span>
                </button>

                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button secondary small"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Navigation size={14} />
                  <span>Mở chỉ đường Google Maps</span>
                </a>
              </div>
            </div>
          )}

          {/* Tile Layer Provider Switcher */}
          <div className="craft-map-tile-switcher" title="Đổi máy chủ bản đồ">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0 4px",
                color: "#6b7280",
              }}
            >
              <Layers size={13} />
            </span>
            {TILE_PROVIDERS.map((prov, idx) => (
              <button
                key={prov.id}
                type="button"
                className={`craft-map-tile-btn ${
                  currentProviderIndex === idx ? "active" : ""
                }`}
                onClick={() => mountTileLayer(idx)}
              >
                {prov.shortLabel}
              </button>
            ))}
          </div>

          {/* Quick Legend Overlay */}
          <div className="craft-map-legend-overlay">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#b65f3d",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  color: "#10223b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedLocation.nameVi}
              </span>
            </div>
            <div
              className="craft-map-legend-coords"
              style={{ color: "var(--muted)", fontSize: "0.7rem" }}
            >
              {selectedLocation.coordinates.lat.toFixed(4)}°N,{" "}
              {selectedLocation.coordinates.lng.toFixed(4)}°E
            </div>
          </div>
        </div>

        {/* Inspector & Location Detail Card */}
        <div ref={inspectorCardRef} className="craft-map-inspector-card">
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
                sizes="(max-width: 960px) 100vw, 40vw"
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

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: "1.35rem",
                    color: "#10223b",
                    fontFamily: "Fraunces",
                  }}
                >
                  {selectedLocation.nameVi}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.82rem",
                    color: "var(--terracotta)",
                  }}
                >
                  <MapPin size={14} />
                  <span>{selectedLocation.district}, TP. Hà Nội</span>
                  <span>
                    · {selectedLocation.distanceKmFromCenter} km từ Trung tâm
                  </span>
                </div>
              </div>
            </div>

            <p
              style={{
                margin: "14px 0",
                fontSize: "0.86rem",
                color: "var(--ink)",
                lineHeight: 1.55,
              }}
            >
              {selectedLocation.summaryVi}
            </p>

            {/* Highlights */}
            <div
              style={{
                background: "var(--paper)",
                padding: "12px 14px",
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Điểm Trải Nghiệm Nổi Bật
              </span>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                  lineHeight: 1.5,
                }}
              >
                {selectedLocation.highlightsVi.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>

            {/* Verified Coordinate Details */}
            <div className="craft-map-coords-grid">
              <div className="craft-coord-cell">
                📍 Vĩ độ:{" "}
                <strong>{selectedLocation.coordinates.lat}° N</strong>
              </div>
              <div className="craft-coord-cell">
                🧭 Kinh độ:{" "}
                <strong>{selectedLocation.coordinates.lng}° E</strong>
              </div>
              <div className="craft-coord-cell">
                🕒 Mở cửa:{" "}
                <strong>{selectedLocation.openingHoursVi}</strong>
              </div>
              <div className="craft-coord-cell">
                📞 Hotline:{" "}
                <strong>{selectedLocation.contactHotline}</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="craft-map-action-panel">
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary craft-map-primary-cta"
            >
              <Navigation size={16} />
              <span>Chỉ đường Google Maps đến đây</span>
            </a>

            <div className="craft-map-action-grid">
              {selectedLocation.villageSlug ? (
                <Link
                  href={`/villages/${selectedLocation.villageSlug}`}
                  className="button secondary"
                >
                  <Compass size={15} />
                  <span>Xem Làng nghề</span>
                </Link>
              ) : (
                <Link href="/marketplace" className="button secondary">
                  <Compass size={15} />
                  <span>Xem tác phẩm</span>
                </Link>
              )}

              <Link
                href="/trace/CT-BTG-NVA-2026-0085"
                className="button secondary"
              >
                <ExternalLink size={15} />
                <span>Tra cứu Hộ chiếu</span>
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
                  border: isSelected
                    ? "2px solid #b65f3d"
                    : "1px solid var(--line)",
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
                  <Image
                    src={loc.imageUrl}
                    alt={loc.nameVi}
                    fill
                    sizes="54px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "0.88rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {loc.nameVi}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                    }}
                  >
                    {loc.categoryVi}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--terracotta)",
                      fontWeight: 600,
                    }}
                  >
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

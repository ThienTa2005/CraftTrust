"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Box,
  Check,
  Layers,
  Maximize2,
  PenTool,
  RotateCw,
  ShoppingBag,
  Sparkles,
  Smartphone
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { formatVnd } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import {
  GLAZE_DEFINITIONS,
  LIVING_ROOM_COMBO
} from "@/lib/glazes-data";
import type { EngravingConfig, GlazeType } from "@craft-trust/contracts";

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    nameEn?: string | undefined;
    priceVnd: number;
    image: string;
    modelUrl?: string | undefined;
    arUrl?: string | undefined;
    artisan: string;
    village: string;
  };
}

export function GlazeEngravingCustomizer({ product }: Props) {
  const { locale, t } = useLanguage();
  const { addItem } = useCartStore();

  const [activeTab, setActiveTab] = useState<"single" | "room">("single");
  const [selectedGlaze, setSelectedGlaze] = useState<GlazeType>("hoa-bien");
  const [engravingText, setEngravingText] = useState("");
  const [fontStyle, setFontStyle] = useState<EngravingConfig["fontStyle"]>("calligraphy");
  const [placement, setPlacement] = useState<EngravingConfig["placement"]>("front");
  const [finishStyle, setFinishStyle] = useState<EngravingConfig["finishStyle"]>("gilded-gold");
  const [addedNotice, setAddedNotice] = useState(false);

  // Multi-product room combo items toggle
  const [activeComboItems, setActiveComboItems] = useState<Record<string, boolean>>({
    "item-1-binh-gom": true,
    "item-2-dia-trung-bay": true,
    "item-3-khay-may-tre": true
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  const arCapable =
    typeof window !== "undefined" &&
    Boolean("xr" in navigator && window.isSecureContext);

  // Load model-viewer script dynamically
  useEffect(() => {
    if (!product.modelUrl) return;
    import("@google/model-viewer")
      .then(() => setModelLoaded(true))
      .catch(() => setModelLoaded(false));
  }, [product.modelUrl]);

  // Apply material & glaze swap in real-time onto the 3D model
  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = containerRef.current.querySelector<any>("model-viewer");
    if (!viewer) return;

    const applyMaterial = () => {
      try {
        if (!viewer.model || !viewer.model.materials || viewer.model.materials.length === 0) {
          return;
        }
        const material = viewer.model.materials[0];
        const glaze = GLAZE_DEFINITIONS[selectedGlaze];
        if (!glaze || !material.pbrMetallicRoughness) return;

        // Convert Hex to RGBA array [0..1]
        const hex = glaze.baseColor.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        material.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1.0]);
        material.pbrMetallicRoughness.setRoughnessFactor(glaze.roughness);
        material.pbrMetallicRoughness.setMetallicFactor(glaze.metallic);
      } catch (err) {
        console.warn("Could not dynamically update 3D material:", err);
      }
    };

    if (viewer.loaded) {
      applyMaterial();
    } else {
      viewer.addEventListener("load", applyMaterial, { once: true });
    }
  }, [selectedGlaze, modelLoaded]);

  const currentGlazeDef = GLAZE_DEFINITIONS[selectedGlaze];

  const handleAddToCartWithCustomization = () => {
    const glazeLabel =
      locale === "vi" ? currentGlazeDef.nameVi : currentGlazeDef.nameEn;
    const engravingNote = engravingText.trim()
      ? `${locale === "vi" ? "Khắc" : "Engraved"}: "${engravingText.trim()}" (${
          locale === "vi"
            ? t.engraving.fonts[fontStyle]
            : fontStyle
        } · ${
          locale === "vi"
            ? t.engraving.finishes[finishStyle === "gilded-gold" ? "gold" : finishStyle === "cobalt-brush" ? "cobalt" : "clay"]
            : finishStyle
        })`
      : undefined;

    addItem({
      productId: product.id,
      name: `${locale === "en" && product.nameEn ? product.nameEn : product.name} [${glazeLabel}]`,
      priceVnd: product.priceVnd,
      image: product.image,
      artisan: product.artisan,
      village: product.village,
      customNote: engravingNote
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3500);
  };

  // Combo calculation
  const selectedComboItemsList = LIVING_ROOM_COMBO.items.filter(
    (item) => activeComboItems[item.id]
  );
  const rawComboTotal = selectedComboItemsList.reduce(
    (sum, item) => sum + item.priceVnd,
    0
  );
  const discountedComboTotal = Math.round(
    rawComboTotal * (1 - LIVING_ROOM_COMBO.totalDiscountPercent / 100)
  );

  const handleAddComboToCart = () => {
    selectedComboItemsList.forEach((item) => {
      addItem({
        productId: `${product.id}-${item.id}`,
        name: locale === "vi" ? item.nameVi : item.nameEn,
        priceVnd: Math.round(
          item.priceVnd * (1 - LIVING_ROOM_COMBO.totalDiscountPercent / 100)
        ),
        image: item.image,
        artisan: "Nghệ nhân liên minh làng nghề Hà Nội",
        village: item.village,
        customNote: "Combo Trang trí Phòng khách Tràng An (Giảm 10%)"
      });
    });
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3500);
  };

  return (
    <div className="customizer-card" style={{ marginTop: 24 }}>
      {/* Mode Switcher: Single 3D vs Multi-Product AR Room */}
      <div
        style={{
          display: "flex",
          background: "var(--paper)",
          padding: 4,
          borderRadius: 14,
          border: "1px solid var(--line)",
          marginBottom: 16
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          style={{
            flex: 1,
            padding: "9px 14px",
            border: "none",
            borderRadius: 10,
            background: activeTab === "single" ? "var(--leaf)" : "transparent",
            color: activeTab === "single" ? "#fff" : "var(--muted)",
            fontWeight: 600,
            fontSize: "0.86rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all .2s ease"
          }}
        >
          <Box size={16} />
          {t.arRoom.tabSingle}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("room")}
          style={{
            flex: 1,
            padding: "9px 14px",
            border: "none",
            borderRadius: 10,
            background: activeTab === "room" ? "var(--leaf)" : "transparent",
            color: activeTab === "room" ? "#fff" : "var(--muted)",
            fontWeight: 600,
            fontSize: "0.86rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all .2s ease"
          }}
        >
          <Layers size={16} />
          {t.arRoom.tabRoom}
        </button>
      </div>

      {activeTab === "single" ? (
        <div>
          {/* 3D Canvas with Realtime Glaze & Engraving Overlay */}
          <div
            className="viewer"
            style={{
              position: "relative",
              borderRadius: 18,
              overflow: "hidden",
              background: "radial-gradient(circle at center, #f4efe4 0%, #e5ddcc 100%)",
              border: "1px solid var(--line)"
            }}
          >
            {/* Header Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(8px)",
                borderBottom: "1px solid var(--line)",
                fontSize: "0.82rem"
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                  color: "var(--leaf)"
                }}
              >
                <Sparkles size={15} />
                {t.glazeCustomizer.realtimeBadge}: {locale === "vi" ? currentGlazeDef.nameVi : currentGlazeDef.nameEn}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "var(--muted)",
                  fontSize: "0.76rem"
                }}
              >
                <RotateCw size={13} />
                {locale === "vi" ? "Kéo xoay 360°" : "Drag 360°"}
              </span>
            </div>

            {/* The 3D model-viewer element */}
            <div ref={containerRef} style={{ position: "relative", width: "100%", height: 380 }}>
              {product.modelUrl && modelLoaded ? (
                createElement("model-viewer", {
                  src: product.modelUrl,
                  poster: product.image,
                  alt: product.name,
                  "camera-controls": true,
                  "auto-rotate": true,
                  "shadow-intensity": "1.2",
                  "touch-action": "pan-y",
                  style: { width: "100%", height: "100%", display: "block" }
                })
              ) : (
                <div className="viewer-message">
                  {locale === "vi" ? "Đang tải mô hình 3D..." : "Loading 3D model..."}
                </div>
              )}

              {/* Dynamic Engraved Text 3D Surface Overlay Simulation */}
              {engravingText.trim() && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    ...(placement === "neck"
                      ? { top: "22%" }
                      : placement === "base"
                      ? { bottom: "16%" }
                      : { top: "52%" }),
                    pointerEvents: "none",
                    maxWidth: "80%",
                    textAlign: "center",
                    padding: "6px 14px",
                    borderRadius: 8,
                    background:
                      finishStyle === "gilded-gold"
                        ? "linear-gradient(135deg, rgba(200, 157, 67, 0.3) 0%, rgba(255, 230, 160, 0.4) 100%)"
                        : "rgba(0, 0, 0, 0.15)",
                    backdropFilter: "blur(2px)",
                    border:
                      finishStyle === "gilded-gold"
                        ? "1px dashed #d4af37"
                        : "1px dashed rgba(255, 255, 255, 0.3)",
                    transition: "all .3s ease"
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize:
                        fontStyle === "calligraphy" ? "1.05rem" : "0.9rem",
                      fontFamily:
                        fontStyle === "calligraphy"
                          ? '"Fraunces", Georgia, serif'
                          : fontStyle === "serif"
                          ? 'Georgia, "Times New Roman", serif'
                          : '"DM Sans", system-ui, sans-serif',
                      fontStyle:
                        fontStyle === "calligraphy" ? "italic" : "normal",
                      fontWeight: 700,
                      letterSpacing: fontStyle === "modern" ? "0.08em" : "0.02em",
                      color:
                        finishStyle === "gilded-gold"
                          ? "#fff"
                          : finishStyle === "cobalt-brush"
                          ? "#0c2b54"
                          : "#3a2e28",
                      textShadow:
                        finishStyle === "gilded-gold"
                          ? "0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(255,215,0,0.8)"
                          : finishStyle === "cobalt-brush"
                          ? "0 1px 2px rgba(255,255,255,0.8)"
                          : "1px 1px 0px rgba(255,255,255,0.4), -1px -1px 0px rgba(0,0,0,0.4)"
                    }}
                  >
                    {engravingText}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: finishStyle === "gilded-gold" ? "#ffd700" : "var(--muted)",
                      marginTop: 2
                    }}
                  >
                    ✦ {t.engraving.previewBadge} ✦
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Glaze Swatches Bar */}
          <div
            style={{
              marginTop: 18,
              padding: "16px 18px",
              background: "var(--surface)",
              borderRadius: 16,
              border: "1px solid var(--line)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12
              }}
            >
              <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>
                {t.glazeCustomizer.swatchLabel}
              </strong>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "var(--terracotta)",
                  fontWeight: 600
                }}
              >
                {currentGlazeDef.firingTemp}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10
              }}
            >
              {(Object.keys(GLAZE_DEFINITIONS) as GlazeType[]).map((glazeKey) => {
                const def = GLAZE_DEFINITIONS[glazeKey];
                const isSelected = selectedGlaze === glazeKey;
                return (
                  <button
                    key={glazeKey}
                    type="button"
                    onClick={() => setSelectedGlaze(glazeKey)}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 12,
                      border: isSelected
                        ? "2px solid var(--leaf)"
                        : "1px solid var(--line)",
                      background: isSelected
                        ? "rgba(35, 92, 67, 0.06)"
                        : "var(--surface)",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all .2s ease"
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        margin: "0 auto 8px",
                        background: def.swatchGradient,
                        boxShadow: isSelected
                          ? "0 0 0 3px rgba(35, 92, 67, 0.25), 0 4px 10px rgba(0,0,0,0.15)"
                          : "0 2px 6px rgba(0,0,0,0.1)",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff"
                      }}
                    >
                      {isSelected && <Check size={18} strokeWidth={3} />}
                    </div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.76rem",
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? "var(--leaf)" : "var(--ink)",
                        lineHeight: 1.25
                      }}
                    >
                      {locale === "vi" ? def.nameVi : def.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Glaze Details Note */}
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "rgba(35, 92, 67, 0.04)",
                borderRadius: 10,
                fontSize: "0.8rem",
                color: "var(--muted)",
                lineHeight: 1.45
              }}
            >
              <strong style={{ color: "var(--leaf)" }}>
                {locale === "vi" ? currentGlazeDef.taglineVi : currentGlazeDef.taglineEn}
              </strong>
              <div style={{ marginTop: 4 }}>
                {locale === "vi" ? currentGlazeDef.historyVi : currentGlazeDef.historyEn}
              </div>
            </div>
          </div>

          {/* Feature 4: Real-time 3D Engraving & Personalization Section */}
          <div
            style={{
              marginTop: 16,
              padding: "18px",
              background: "var(--surface)",
              borderRadius: 16,
              border: "1px solid var(--line)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6
              }}
            >
              <PenTool size={18} style={{ color: "var(--terracotta)" }} />
              <strong style={{ fontSize: "0.92rem", color: "var(--ink)" }}>
                {t.engraving.title}
              </strong>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "var(--muted)" }}>
              {t.engraving.subtitle}
            </p>

            {/* Input field */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={engravingText}
                onChange={(e) => setEngravingText(e.target.value.slice(0, 75))}
                placeholder={t.engraving.placeholder}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  fontSize: "0.88rem",
                  background: "#fff"
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.72rem",
                  color: "var(--muted)",
                  marginTop: 4
                }}
              >
                <span>{locale === "vi" ? "Chữ khắc nổi/chìm theo phối cảnh 3D" : "Simulated 3D relief on ceramic"}</span>
                <span>{engravingText.length}/75</span>
              </div>
            </div>

            {/* Controls row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: 14
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    marginBottom: 4,
                    color: "var(--muted)"
                  }}
                >
                  {t.engraving.fontStyle}
                </label>
                <select
                  value={fontStyle}
                  onChange={(e) => setFontStyle(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    fontSize: "0.78rem"
                  }}
                >
                  <option value="calligraphy">{t.engraving.fonts.calligraphy}</option>
                  <option value="serif">{t.engraving.fonts.serif}</option>
                  <option value="modern">{t.engraving.fonts.modern}</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    marginBottom: 4,
                    color: "var(--muted)"
                  }}
                >
                  {t.engraving.placement}
                </label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    fontSize: "0.78rem"
                  }}
                >
                  <option value="front">{t.engraving.placements.front}</option>
                  <option value="neck">{t.engraving.placements.neck}</option>
                  <option value="base">{t.engraving.placements.base}</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    marginBottom: 4,
                    color: "var(--muted)"
                  }}
                >
                  {t.engraving.finishStyle}
                </label>
                <select
                  value={finishStyle}
                  onChange={(e) => setFinishStyle(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    fontSize: "0.78rem"
                  }}
                >
                  <option value="gold">{t.engraving.finishes.gold}</option>
                  <option value="clay">{t.engraving.finishes.clay}</option>
                  <option value="cobalt">{t.engraving.finishes.cobalt}</option>
                </select>
              </div>
            </div>

            {/* Customization Add-to-cart button */}
            <button
              type="button"
              className="button full"
              onClick={handleAddToCartWithCustomization}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "13px 20px"
              }}
            >
              <ShoppingBag size={18} />
              <span>
                {engravingText.trim()
                  ? t.engraving.submitToArtisan
                  : locale === "vi"
                  ? `Chọn mua men ${currentGlazeDef.nameVi}`
                  : `Order with ${currentGlazeDef.nameEn}`}
              </span>
            </button>
            {addedNotice && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "0.82rem",
                  color: "var(--leaf)",
                  textAlign: "center",
                  fontWeight: 600
                }}
              >
                ✓ {t.engraving.addedToCartWithEngraving}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Multi-product AR Room Scene Staging */
        <div
          style={{
            padding: 20,
            background: "var(--surface)",
            borderRadius: 18,
            border: "1px solid var(--line)"
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--terracotta)",
                fontWeight: 700
              }}
            >
              AR Multi-product Staging (1:1 Scale)
            </span>
            <h3 style={{ margin: "6px 0", fontSize: "1.2rem", fontFamily: "Fraunces" }}>
              {locale === "vi" ? LIVING_ROOM_COMBO.titleVi : LIVING_ROOM_COMBO.titleEn}
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
              {locale === "vi" ? LIVING_ROOM_COMBO.descriptionVi : LIVING_ROOM_COMBO.descriptionEn}
            </p>
          </div>

          {/* Staging Room Mockup Visual */}
          <div
            style={{
              position: "relative",
              height: 280,
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 16,
              background: "linear-gradient(180deg, #eae5d9 0%, #d8cfbe 100%)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 16,
              paddingBottom: 24,
              border: "1px solid var(--line)"
            }}
          >
            {/* Table surface line */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 50,
                background: "#7d5a44",
                borderTop: "6px solid #5a3c2a",
                boxShadow: "0 -8px 20px rgba(0,0,0,0.15)"
              }}
            />

            {/* Item 3: Phu Vinh Bamboo Tray */}
            {activeComboItems["item-3-khay-may-tre"] && (
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: 130,
                  textAlign: "center",
                  transition: "all .3s ease"
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 120,
                    height: 80,
                    margin: "0 auto",
                    borderRadius: 10,
                    overflow: "hidden",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.2)"
                  }}
                >
                  <Image
                    src={LIVING_ROOM_COMBO.items[2]!.image}
                    alt="Khay tre Phú Vinh"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    background: "rgba(255,255,255,0.9)",
                    padding: "2px 6px",
                    borderRadius: 6
                  }}
                >
                  Khay mây Phú Vinh (55cm)
                </span>
              </div>
            )}

            {/* Item 1: Bat Trang Ceramic Vase (Hero Center) */}
            {activeComboItems["item-1-binh-gom"] && (
              <div
                style={{
                  position: "relative",
                  zIndex: 3,
                  width: 110,
                  textAlign: "center",
                  transition: "all .3s ease"
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 90,
                    height: 150,
                    margin: "0 auto",
                    borderRadius: 14,
                    overflow: "hidden",
                    boxShadow: "0 16px 30px rgba(0,0,0,0.25)"
                  }}
                >
                  <Image
                    src={LIVING_ROOM_COMBO.items[0]!.image}
                    alt="Bình gốm Bát Tràng"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "var(--leaf)",
                    background: "rgba(255,255,255,0.95)",
                    padding: "2px 8px",
                    borderRadius: 6
                  }}
                >
                  Bình gốm Bát Tràng (42cm)
                </span>
              </div>
            )}

            {/* Item 2: Ceramic Lotus Platter */}
            {activeComboItems["item-2-dia-trung-bay"] && (
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: 110,
                  textAlign: "center",
                  transition: "all .3s ease"
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 95,
                    height: 95,
                    margin: "0 auto",
                    borderRadius: "50%",
                    overflow: "hidden",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.2)"
                  }}
                >
                  <Image
                    src={LIVING_ROOM_COMBO.items[1]!.image}
                    alt="Đĩa sen Bát Tràng"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    background: "rgba(255,255,255,0.9)",
                    padding: "2px 6px",
                    borderRadius: 6
                  }}
                >
                  Đĩa sen gốm sứ (32cm)
                </span>
              </div>
            )}
          </div>

          {/* AR Launch Banner */}
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(35, 92, 67, 0.08)",
              borderRadius: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--leaf)" }}>
                <Smartphone size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                {t.arRoom.launchRoomAr}
              </strong>
              <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                {arCapable
                  ? locale === "vi"
                    ? "Camera AR sẽ chiếu đồng thời cả bộ 3 sản phẩm vào phòng khách của bạn."
                    : "AR camera will place all 3 products into your room simultaneously."
                  : locale === "vi"
                  ? "Chế độ AR khả dụng trực tiếp trên iPhone / điện thoại Android WebXR."
                  : "AR room preview available on iOS / Android WebXR devices."}
              </span>
            </div>
            <button
              type="button"
              className="button small"
              onClick={() => {
                alert(
                  locale === "vi"
                    ? "Khởi chạy AR: Đang mở phiên WebXR không gian phòng khách để đặt 3 tác phẩm theo tỉ lệ thực tế 1:1."
                    : "Launching AR: Opening WebXR room session to place all 3 craft pieces at 1:1 scale."
                );
              }}
            >
              <Maximize2 size={15} />
              <span>{locale === "vi" ? "Mở AR" : "Open AR"}</span>
            </button>
          </div>

          {/* Combo Items Toggle List */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 8 }}>
              {t.arRoom.toggleItem}
            </span>
            <div style={{ display: "grid", gap: 8 }}>
              {LIVING_ROOM_COMBO.items.map((item) => {
                const isActive = Boolean(activeComboItems[item.id]);
                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      setActiveComboItems((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id]
                      }))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: isActive ? "1px solid var(--leaf)" : "1px solid var(--line)",
                      background: isActive ? "rgba(35, 92, 67, 0.04)" : "#fff",
                      cursor: "pointer",
                      fontSize: "0.82rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: isActive ? "none" : "1px solid var(--line)",
                          background: isActive ? "var(--leaf)" : "transparent",
                          display: "grid",
                          placeItems: "center",
                          color: "#fff"
                        }}
                      >
                        {isActive && <Check size={13} strokeWidth={3} />}
                      </div>
                      <div>
                        <strong>{locale === "vi" ? item.nameVi : item.nameEn}</strong>
                        <span style={{ display: "block", fontSize: "0.74rem", color: "var(--muted)" }}>
                          {item.village} · {item.scaleLabel}
                        </span>
                      </div>
                    </div>
                    <strong>{formatVnd(item.priceVnd)}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combo Price & Add to Cart */}
          <div
            style={{
              paddingTop: 14,
              borderTop: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <span style={{ fontSize: "0.78rem", color: "var(--terracotta)", fontWeight: 700 }}>
                {t.arRoom.comboDiscount}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    textDecoration: "line-through",
                    color: "var(--muted)"
                  }}
                >
                  {formatVnd(rawComboTotal)}
                </span>
                <strong style={{ fontSize: "1.25rem", color: "var(--leaf)" }}>
                  {formatVnd(discountedComboTotal)}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="button"
              onClick={handleAddComboToCart}
              disabled={selectedComboItemsList.length === 0}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <ShoppingBag size={17} />
              <span>{locale === "vi" ? "Mua trọn bộ Combo" : "Add Combo to Cart"}</span>
            </button>
          </div>
          {addedNotice && (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "0.82rem",
                color: "var(--leaf)",
                textAlign: "center",
                fontWeight: 600
              }}
            >
              ✓ {locale === "vi" ? "Đã thêm bộ Combo vào giỏ hàng!" : "Added combo to cart!"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

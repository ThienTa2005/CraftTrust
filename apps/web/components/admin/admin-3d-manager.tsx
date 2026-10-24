"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import {
  Box,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Eye,
  Check,
  RotateCcw,
  Maximize2,
  Trash2,
  Sparkles,
  Sliders,
  Settings,
  History,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { formatVnd } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/context";
import { CraftModelViewer } from "@/components/model-viewer";
import type { ModelConfig, EngravingRegion } from "@/lib/model-config";

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  stock: number;
  image: string;
  artisan: string;
  village: string;
  hasModel: boolean;
  modelUrl?: string;
  modelStatus: string;
  activeAssetId?: string;
  assets?: any[];
}

export function Admin3DManager() {
  const { locale } = useLanguage();
  const vi = locale === "vi";

  // State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "has_model" | "no_model" | "review">("all");

  // Selected asset / preview state
  const [activeAsset, setActiveAsset] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Configuration form state
  const [heightCm, setHeightCm] = useState(25);
  const [widthCm, setWidthCm] = useState(16);
  const [scale, setScale] = useState(1);
  const [cameraOrbit, setCameraOrbit] = useState("0deg 75deg auto");
  const [orientation, setOrientation] = useState<[number, number, number]>([0, 0, 0]);
  const [arEnabled, setArEnabled] = useState(true);
  const [regions, setRegions] = useState<EngravingRegion[]>([]);

  // Action / feedback state
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load products list
  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Không thể tải danh sách sản phẩm.");
      const json = await res.json();
      setProducts(json.products || []);
      if (json.products?.length > 0 && !selectedProduct) {
        selectProduct(json.products[0]);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  }

  function selectProduct(product: ProductItem) {
    setSelectedProduct(product);
    setSelectedFile(null);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    const assets = product.assets || [];
    const published = assets.find((a: any) => a.status === "published");
    const active = published || assets[0] || null;
    setActiveAsset(active);

    if (active) {
      setPreviewUrl(`/api/models/${active.id}`);
      const s: Partial<ModelConfig> = active.settings || {};
      setHeightCm(s.heightCm ?? 25);
      setWidthCm(s.widthCm ?? 16);
      setScale(s.scale ?? 1);
      setCameraOrbit(s.cameraOrbit ?? "0deg 75deg auto");
      setOrientation(s.orientation ?? [0, 0, 0]);
      setArEnabled(s.arEnabled ?? true);
      setRegions(s.regions ?? []);
    } else {
      setPreviewUrl(null);
      setHeightCm(25);
      setWidthCm(16);
      setScale(1);
      setCameraOrbit("0deg 75deg auto");
      setOrientation([0, 0, 0]);
      setArEnabled(true);
      setRegions([
        {
          id: "front-body",
          label: "Thân bình trước",
          materialIndex: 0,
          uv: [0.35, 0.45, 0.3, 0.25],
          widthMm: 80,
          heightMm: 50,
          finishes: ["ink", "gold", "recessed", "raised"],
          cameraOrbit: "0deg 75deg auto",
        },
      ]);
    }
  }

  // Handle GLB file selection & local preview
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".glb")) {
      showToast(vi ? "Vui lòng chọn file 3D định dạng chuẩn .glb" : "Please select a valid .glb 3D file", "error");
      return;
    }
    if (file.size > 4_000_000) {
      showToast(vi ? "Kích thước file vượt quá 4MB (chuẩn web tối ưu)." : "File size exceeds 4MB web limit.", "error");
      return;
    }

    setSelectedFile(file);
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    const blobUrl = URL.createObjectURL(file);
    setPreviewBlobUrl(blobUrl);
    showToast(vi ? "Đã nạp file để xem trước hình học và chất liệu." : "File loaded for preview.");
  }

  // Upload GLB file
  async function handleUploadModel() {
    if (!selectedProduct || !selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("productId", selectedProduct.id);
      formData.append("model", selectedFile);

      const res = await fetch("/api/admin/models", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Tải lên thất bại");

      showToast(vi ? "Tải lên mô hình 3D thành công! Đang lưu nháp." : "3D model uploaded successfully!");
      setSelectedFile(null);
      await loadProducts();
      // Select the newly uploaded asset
      const updated = products.find((p) => p.id === selectedProduct.id);
      if (updated) selectProduct(updated);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  }

  // Save draft configuration
  async function handleSaveConfig() {
    if (!activeAsset) {
      showToast(vi ? "Chưa có mô hình để lưu cấu hình. Vui lòng tải file trước." : "No model to configure.", "error");
      return;
    }
    setSaving(true);
    try {
      const settingsPayload: ModelConfig = {
        heightCm,
        widthCm,
        scale,
        cameraOrbit,
        orientation,
        arEnabled,
        regions,
      };

      const res = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeAsset.id,
          action: "configure",
          settings: settingsPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lưu cấu hình thất bại");

      showToast(vi ? "Đã lưu thông số kỹ thuật và vùng khắc chữ." : "Configuration saved successfully.");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // Publish model to marketplace
  async function handlePublishModel() {
    if (!activeAsset) return;
    setSaving(true);
    try {
      // First save configuration if modified
      const settingsPayload: ModelConfig = {
        heightCm,
        widthCm,
        scale,
        cameraOrbit,
        orientation,
        arEnabled,
        regions,
      };
      await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeAsset.id,
          action: "configure",
          settings: settingsPayload,
        }),
      });

      // Now publish
      const res = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeAsset.id,
          action: "publish",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xuất bản thất bại");

      showToast(vi ? "Mô hình 3D/AR đã được phê duyệt và xuất bản lên trang sản phẩm!" : "Model published to product page!");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // Archive / Unpublish model
  async function handleArchiveModel() {
    if (!activeAsset) return;
    if (!confirm(vi ? "Bạn có chắc chắn muốn gỡ bỏ mô hình này khỏi sản phẩm?" : "Archive this 3D model?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeAsset.id,
          action: "archive",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gỡ bỏ thất bại");

      showToast(vi ? "Đã gỡ mô hình 3D khỏi sản phẩm." : "Model archived.");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // Region helpers
  function addRegion() {
    const newId = `zone-${regions.length + 1}`;
    setRegions([
      ...regions,
      {
        id: newId,
        label: `Vùng khắc ${regions.length + 1}`,
        materialIndex: 0,
        uv: [0.35, 0.45, 0.3, 0.25],
        widthMm: 60,
        heightMm: 40,
        finishes: ["ink", "gold", "recessed", "raised"],
        cameraOrbit: "0deg 75deg auto",
      },
    ]);
  }

  function updateRegion(index: number, patch: Partial<EngravingRegion>) {
    setRegions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch } as EngravingRegion;
      return next;
    });
  }

  function removeRegion(index: number) {
    setRegions((prev) => prev.filter((_, i) => i !== index));
  }

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.artisan.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "has_model") return p.hasModel;
    if (statusFilter === "no_model") return !p.hasModel;
    if (statusFilter === "review") return p.modelStatus === "draft" || p.modelStatus === "pending_review";
    return true;
  });

  const currentModelUrl = previewBlobUrl || previewUrl;

  return (
    <div className="admin-3d-manager-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`admin-toast-banner ${toastMessage.type}`} role="status">
          {toastMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="admin-card-header" style={{ marginBottom: 20 }}>
        <div>
          <h2>{vi ? "Quản Lý & Kiểm Định Mô Hình 3D/AR" : "3D/AR Model Governance Studio"}</h2>
          <p className="card-sub">
            {vi
              ? "Tải lên, kiểm định hình học mesh, thiết lập kích thước tỷ lệ 1:1, cấu hình camera và vùng khắc chữ cá nhân hóa theo từng sản phẩm."
              : "Upload, inspect geometry, set 1:1 real metric dimensions, and define engraving regions."}
          </p>
        </div>
        <button
          type="button"
          className="button secondary small"
          onClick={() => void loadProducts()}
          title="Tải lại danh sách"
        >
          <RefreshCw size={14} />
          <span>{vi ? "Làm mới" : "Refresh"}</span>
        </button>
      </div>

      <div className="admin-3d-grid-layout">
        {/* LEFT COLUMN: Products selector */}
        <div className="admin-3d-products-panel">
          <div className="panel-search-bar">
            <div className="search-input-wrap">
              <Search size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={vi ? "Tìm tên tác phẩm, nghệ nhân..." : "Search product, artisan..."}
              />
            </div>
            <div className="status-filter-tabs">
              <button
                type="button"
                className={`filter-tab ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                {vi ? "Tất cả" : "All"} ({products.length})
              </button>
              <button
                type="button"
                className={`filter-tab ${statusFilter === "has_model" ? "active" : ""}`}
                onClick={() => setStatusFilter("has_model")}
              >
                {vi ? "Có 3D" : "Has 3D"} ({products.filter((p) => p.hasModel).length})
              </button>
              <button
                type="button"
                className={`filter-tab ${statusFilter === "no_model" ? "active" : ""}`}
                onClick={() => setStatusFilter("no_model")}
              >
                {vi ? "Chưa có 3D" : "No 3D"} ({products.filter((p) => !p.hasModel).length})
              </button>
            </div>
          </div>

          <div className="admin-products-scroll-list">
            {loading ? (
              <div className="admin-empty-state">
                <RefreshCw size={24} className="spin" />
                <p>{vi ? "Đang tải danh sách tác phẩm..." : "Loading products..."}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="admin-empty-state">
                <p>{vi ? "Không tìm thấy tác phẩm phù hợp" : "No matching products"}</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`product-select-card ${isSelected ? "selected" : ""}`}
                    onClick={() => selectProduct(p)}
                  >
                    <img src={p.image} alt={p.name} className="product-thumb" />
                    <div className="product-card-body">
                      <strong className="product-name">{p.name}</strong>
                      <span className="product-meta">
                        {p.artisan} · {formatVnd(p.priceVnd)}
                      </span>
                      <div className="product-status-row">
                        {p.hasModel ? (
                          <span className="badge success">
                            <Sparkles size={11} /> {vi ? "3D Đã xuất bản" : "Published 3D"}
                          </span>
                        ) : p.modelStatus === "draft" ? (
                          <span className="badge warning">{vi ? "Bản nháp 3D" : "Draft 3D"}</span>
                        ) : (
                          <span className="badge secondary">{vi ? "Chưa có 3D" : "No 3D"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Studio & Configuration */}
        <div className="admin-3d-editor-panel">
          {selectedProduct ? (
            <>
              {/* Active Product Banner */}
              <div className="active-product-banner">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="banner-thumb" />
                <div className="banner-info">
                  <span className="eyebrow">{selectedProduct.village} · {selectedProduct.artisan}</span>
                  <h3>{selectedProduct.name}</h3>
                  <div className="banner-badges">
                    <span className="mono-code">{selectedProduct.slug}</span>
                    <span className="price-tag">{formatVnd(selectedProduct.priceVnd)}</span>
                    {activeAsset ? (
                      <span className={`status-pill ${activeAsset.status}`}>
                        {activeAsset.status === "published"
                          ? vi
                            ? "Đã Xuất Bản Trên Sàn"
                            : "Published"
                          : activeAsset.status === "draft"
                          ? vi
                            ? "Bản Nháp (Chưa Công Khai)"
                            : "Draft"
                          : activeAsset.status}
                      </span>
                    ) : (
                      <span className="status-pill no-model">
                        {vi ? "Chưa có mô hình 3D" : "No model attached"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Upload Trigger Button */}
                <div className="banner-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".glb"
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={16} />
                    <span>{vi ? "Chọn File .GLB Mới" : "Upload .GLB"}</span>
                  </button>
                  {selectedFile && (
                    <button
                      type="button"
                      className="button terracotta small"
                      onClick={() => void handleUploadModel()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <span>{vi ? "Đang tải lên..." : "Uploading..."}</span>
                      ) : (
                        <span>{vi ? "Xác nhận Tải lên" : "Confirm Upload"}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {selectedFile && (
                <div className="file-staging-notice">
                  <UploadCloud size={18} />
                  <span>
                    {vi ? "Đang chọn file: " : "Staged file: "}
                    <strong>{selectedFile.name}</strong> ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <small>{vi ? "Nhấn 'Xác nhận Tải lên' để lưu vào hệ thống." : "Click confirm to save."}</small>
                </div>
              )}

              {/* 3D Viewer & Controls */}
              <div className="admin-viewer-stage-wrapper">
                {currentModelUrl ? (
                  <div className="model-stage-box">
                    <CraftModelViewer
                      src={currentModelUrl}
                      poster={selectedProduct.image}
                      config={{
                        heightCm,
                        widthCm,
                        scale,
                        cameraOrbit,
                        orientation,
                        arEnabled,
                        regions,
                      }}
                    />
                    <div className="stage-quick-orbits">
                      <span>{vi ? "Góc quan sát:" : "Quick angle:"}</span>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => setCameraOrbit("0deg 75deg auto")}
                      >
                        0° {vi ? "Chính diện" : "Front"}
                      </button>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => setCameraOrbit("90deg 75deg auto")}
                      >
                        90° {vi ? "Bên hông" : "Side"}
                      </button>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => setCameraOrbit("180deg 75deg auto")}
                      >
                        180° {vi ? "Mặt sau" : "Back"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-no-model-placeholder">
                    <Box size={48} style={{ color: "var(--indigo)" }} />
                    <h4>{vi ? "Sản phẩm chưa có mô hình 3D" : "No 3D model attached"}</h4>
                    <p>
                      {vi
                        ? "Khi chưa có mô hình, website chỉ hiển thị ảnh chụp thực tế và thông báo lịch sự, không dùng mô hình giả."
                        : "Products without 3D models only display genuine photography."}
                    </p>
                    <button
                      type="button"
                      className="button terracotta"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud size={16} />
                      <span>{vi ? "Tải lên file GLB của sản phẩm" : "Upload GLB for this product"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* CONFIGURATION TABS / FORMS */}
              <div className="admin-config-panels">
                {/* 1. Metric Dimensions & AR */}
                <div className="config-card">
                  <div className="config-card-head">
                    <Sliders size={18} />
                    <h4>{vi ? "1. Kích thước thực tế & AR (Tỷ lệ 1:1)" : "1. Real Dimensions & AR"}</h4>
                  </div>
                  <div className="config-form-grid">
                    <label>
                      <span>{vi ? "Chiều cao thực (cm):" : "Real height (cm):"}</span>
                      <input
                        type="number"
                        min={1}
                        max={250}
                        step={0.5}
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                      />
                    </label>

                    <label>
                      <span>{vi ? "Đường kính / Rộng (cm):" : "Real width/diameter (cm):"}</span>
                      <input
                        type="number"
                        min={1}
                        max={250}
                        step={0.5}
                        value={widthCm}
                        onChange={(e) => setWidthCm(Number(e.target.value))}
                      />
                    </label>

                    <label>
                      <span>{vi ? "Hệ số tỷ lệ Scale:" : "Scale factor:"}</span>
                      <input
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.05}
                        value={scale}
                        onChange={(e) => setScale(Number(e.target.value))}
                      />
                    </label>

                    <label className="checkbox-label" style={{ marginTop: 24 }}>
                      <input
                        type="checkbox"
                        checked={arEnabled}
                        onChange={(e) => setArEnabled(e.target.checked)}
                      />
                      <span>{vi ? "Bật chế độ AR xem trong phòng" : "Enable AR viewing"}</span>
                    </label>
                  </div>
                </div>

                {/* 2. Camera & Orientation */}
                <div className="config-card">
                  <div className="config-card-head">
                    <Settings size={18} />
                    <h4>{vi ? "2. Góc Camera Mặc Định & Hướng Đặt" : "2. Default Camera & Orientation"}</h4>
                  </div>
                  <div className="config-form-grid">
                    <label>
                      <span>{vi ? "Góc Camera Mặc Định (Orbit):" : "Default Camera Orbit:"}</span>
                      <input
                        type="text"
                        value={cameraOrbit}
                        onChange={(e) => setCameraOrbit(e.target.value)}
                        placeholder="0deg 75deg auto"
                      />
                    </label>

                    <label>
                      <span>{vi ? "Góc xoay Roll / Pitch / Yaw:" : "Rotation Orientation (deg):"}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="number"
                          value={orientation[0]}
                          onChange={(e) => setOrientation([Number(e.target.value), orientation[1], orientation[2]])}
                          placeholder="X"
                        />
                        <input
                          type="number"
                          value={orientation[1]}
                          onChange={(e) => setOrientation([orientation[0], Number(e.target.value), orientation[2]])}
                          placeholder="Y"
                        />
                        <input
                          type="number"
                          value={orientation[2]}
                          onChange={(e) => setOrientation([orientation[0], orientation[1], Number(e.target.value)])}
                          placeholder="Z"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Engraving Zones Setup */}
                <div className="config-card">
                  <div className="config-card-head" style={{ justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Layers size={18} />
                      <h4>{vi ? "3. Vùng Cho Phép Khắc Chữ Cá Nhân Hóa" : "3. Engraving Regions"}</h4>
                    </div>
                    <button type="button" className="button secondary small" onClick={addRegion}>
                      + {vi ? "Thêm vùng khắc" : "Add region"}
                    </button>
                  </div>

                  {regions.length === 0 ? (
                    <p className="hint-text">
                      {vi
                        ? "Chưa có vùng khắc nào. Khách hàng sẽ chỉ xem 3D nguyên bản và không thể tùy biến."
                        : "No engraving regions configured. Product will be view-only."}
                    </p>
                  ) : (
                    <div className="regions-list">
                      {regions.map((reg, idx) => (
                        <div key={reg.id || idx} className="region-config-item">
                          <div className="region-item-head">
                            <strong>{reg.label || `Vùng ${idx + 1}`}</strong>
                            <button
                              type="button"
                              className="button-icon-danger"
                              onClick={() => removeRegion(idx)}
                              title="Xóa vùng này"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="config-form-grid">
                            <label>
                              <span>{vi ? "Tên vùng hiển thị:" : "Region label:"}</span>
                              <input
                                type="text"
                                value={reg.label}
                                onChange={(e) => updateRegion(idx, { label: e.target.value })}
                              />
                            </label>

                            <label>
                              <span>{vi ? "Mã định danh ID:" : "Region ID:"}</span>
                              <input
                                type="text"
                                value={reg.id}
                                onChange={(e) => updateRegion(idx, { id: e.target.value })}
                              />
                            </label>

                            <label>
                              <span>{vi ? "Kích thước khắc tối đa (Rộng × Cao mm):" : "Max size (W × H mm):"}</span>
                              <div style={{ display: "flex", gap: 8 }}>
                                <input
                                  type="number"
                                  value={reg.widthMm}
                                  onChange={(e) => updateRegion(idx, { widthMm: Number(e.target.value) })}
                                  placeholder="Rộng"
                                />
                                <input
                                  type="number"
                                  value={reg.heightMm}
                                  onChange={(e) => updateRegion(idx, { heightMm: Number(e.target.value) })}
                                  placeholder="Cao"
                                />
                              </div>
                            </label>

                            <label>
                              <span>{vi ? "Kiểu hoàn thiện cho phép:" : "Allowed finishes:"}</span>
                              <div className="finishes-checkbox-group">
                                {(["ink", "gold", "recessed", "raised"] as const).map((finish) => {
                                  const checked = reg.finishes.includes(finish);
                                  return (
                                    <label key={finish} className="checkbox-small">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          const nextFinishes = e.target.checked
                                            ? [...reg.finishes, finish]
                                            : reg.finishes.filter((f) => f !== finish);
                                          if (nextFinishes.length > 0) {
                                            updateRegion(idx, { finishes: nextFinishes });
                                          }
                                        }}
                                      />
                                      <span>
                                        {finish === "ink"
                                          ? vi ? "Men màu" : "Ink"
                                          : finish === "gold"
                                          ? vi ? "Chữ vàng" : "Gold"
                                          : finish === "recessed"
                                          ? vi ? "Khắc chìm" : "Recessed"
                                          : vi ? "Khắc nổi" : "Raised"}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Action bar */}
                <div className="config-actions-bar">
                  <div className="actions-left">
                    {activeAsset && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => void handleArchiveModel()}
                        disabled={saving}
                      >
                        <Trash2 size={16} />
                        <span>{vi ? "Gỡ Bỏ Mô Hình" : "Archive Model"}</span>
                      </button>
                    )}
                  </div>

                  <div className="actions-right">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => void handleSaveConfig()}
                      disabled={saving || !activeAsset}
                    >
                      <Check size={16} />
                      <span>{saving ? (vi ? "Đang lưu..." : "Saving...") : (vi ? "Lưu Bản Nháp" : "Save Draft")}</span>
                    </button>

                    <button
                      type="button"
                      className="button terracotta"
                      onClick={() => void handlePublishModel()}
                      disabled={saving || !activeAsset}
                    >
                      <Sparkles size={16} />
                      <span>{vi ? "Phê Duyệt & Xuất Bản Lên Sàn" : "Approve & Publish"}</span>
                    </button>
                  </div>
                </div>

                {/* 5. Version History */}
                {selectedProduct.assets && selectedProduct.assets.length > 0 && (
                  <div className="config-card">
                    <div className="config-card-head">
                      <History size={18} />
                      <h4>{vi ? "Lịch Sử Phiên Bản Mô Hình" : "Model Version History"}</h4>
                    </div>
                    <div className="version-table-wrap">
                      <table className="version-table">
                        <thead>
                          <tr>
                            <th>{vi ? "File gốc" : "Filename"}</th>
                            <th>{vi ? "Kích thước" : "Size"}</th>
                            <th>{vi ? "Trạng thái" : "Status"}</th>
                            <th>{vi ? "Ngày tải" : "Uploaded"}</th>
                            <th>{vi ? "Thao tác" : "Actions"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct.assets.map((asset: any) => (
                            <tr key={asset.id} className={activeAsset?.id === asset.id ? "active-row" : ""}>
                              <td>
                                <strong>{asset.original_filename}</strong>
                                <br />
                                <small className="mono-code">{asset.id.slice(0, 8)}...</small>
                              </td>
                              <td>{(asset.file_size / (1024 * 1024)).toFixed(2)} MB</td>
                              <td>
                                <span className={`status-pill ${asset.status}`}>{asset.status}</span>
                              </td>
                              <td>
                                <small>{new Date(asset.created_at).toLocaleDateString()}</small>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="button secondary small"
                                  onClick={() => {
                                    setActiveAsset(asset);
                                    setPreviewUrl(`/api/models/${asset.id}`);
                                    const s = asset.settings || {};
                                    setHeightCm(s.heightCm ?? 25);
                                    setWidthCm(s.widthCm ?? 16);
                                    setScale(s.scale ?? 1);
                                    setCameraOrbit(s.cameraOrbit ?? "0deg 75deg auto");
                                    setOrientation(s.orientation ?? [0, 0, 0]);
                                    setArEnabled(s.arEnabled ?? true);
                                    setRegions(s.regions ?? []);
                                  }}
                                >
                                  {vi ? "Xem lại" : "Load"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="admin-empty-state">
              <Box size={40} style={{ color: "var(--muted)" }} />
              <h3>{vi ? "Chọn một sản phẩm để quản lý mô hình 3D" : "Select a product to manage 3D model"}</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExperienceViewer } from "@/components/experience-viewer";
import type { Experience, ExperienceProduct } from "@/lib/experiences";

export function AdminExperiences() {
  const [items, setItems] = useState<Experience[]>([]);
  const [products, setProducts] = useState<ExperienceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const markReady = useCallback((id: string) => setReviewed((current) => current.includes(id) ? current : [...current, id]), []);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/experiences", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Không tải được trải nghiệm.");
    setItems(result.experiences ?? []);
    setProducts(result.products ?? []);
  }, []);

  useEffect(() => {
    refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không tải được trải nghiệm."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
  };

  async function createExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, title, description }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không lưu được trải nghiệm.");
      setSelectedProductId("");
      setTitle("");
      setDescription("");
      await refresh();
      setPreview(result.id);
      setNotice("Đã tạo bản nháp từ mô hình 3D của nghệ nhân. Hãy xem trước trước khi xuất bản.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được trải nghiệm.");
    } finally { setBusy(false); }
  }

  async function changeStatus(item: Experience) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const status = item.status === "published" ? "draft" : "published";
      const response = await fetch(`/api/admin/experiences/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không đổi được trạng thái.");
      await refresh();
      setNotice(status === "published" ? "Đã xuất bản trải nghiệm." : "Đã ẩn trải nghiệm khỏi bộ sưu tập công khai.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đổi được trạng thái.");
    } finally { setBusy(false); }
  }

  return (
    <section className="admin-card experiences-manager">
      <div className="admin-card-header">
        <div>
          <h2>Quản lý Trải nghiệm 3D/VR</h2>
          <p className="card-sub">Chọn sản phẩm đã có mô hình 3D được duyệt của nghệ nhân để đưa vào trải nghiệm tương tác 3D/VR công khai.</p>
        </div>
        <Link href="/experiences" className="button secondary">Mở trang trải nghiệm</Link>
      </div>
      <form className="experience-form" onSubmit={createExperience}>
        <label>Sản phẩm 3D của nghệ nhân
          <select
            name="productId"
            required
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
          >
            <option value="" disabled>-- Nhấp để chọn sản phẩm đã có mô hình 3D --</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {product.artisan}{!product.hasModel && !product.modelAssetId ? " (Chưa có 3D)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>Tiêu đề
          <input
            name="title"
            required
            minLength={3}
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Bình gốm men lam Bát Tràng – Di sản Nguyễn Văn An"
          />
        </label>
        <label>Mô tả
          <textarea
            name="description"
            rows={3}
            maxLength={3000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả kỹ nghệ chế tác, câu chuyện tác phẩm và điểm nhấn không gian 3D..."
          />
        </label>
        {!loading && products.length === 0 && !error && (
          <p className="error-banner">Chưa có sản phẩm nào có mô hình 3D đã xuất bản. Hãy duyệt mô hình tại mục Kiểm Duyệt Sản Phẩm &amp; 3D trước.</p>
        )}
        <button className="button" type="submit" disabled={busy || !selectedProductId || products.length === 0}>
          {busy ? "Đang xử lý…" : "Tạo trải nghiệm từ sản phẩm"}
        </button>
      </form>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading ? <p className="admin-inline-loading" role="status">Đang tải danh sách…</p> : !items.length && !error ? <p>Chưa có trải nghiệm. Hãy chọn một sản phẩm 3D ở trên.</p> : null}
      <div className="experiences-grid">
        {items.map((item) => (
          <article className="experience-card" key={item.id}>
            {item.product?.posterUrl && (
              <div className="experience-card-media" style={{ aspectRatio: "16 / 10", position: "relative", width: "100%", borderRadius: 12, overflow: "hidden", background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f6f2ea 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Image src={item.product.posterUrl} fill alt={item.product.name} style={{ objectFit: "contain", padding: 8 }} />
              </div>
            )}
            <span className="badge" style={{ marginTop: 12, width: "fit-content" }}>{item.status === "published" ? "Đã xuất bản" : "Bản nháp"}</span>
            <h3 style={{ marginBlock: "8px 4px" }}>{item.title}</h3>
            <p style={{ margin: 0, fontWeight: 500, color: "var(--muted)" }}>{item.product ? `${item.product.name} · ${item.product.artisan}` : "Sản phẩm 3D"}</p>
            {item.description && <p style={{ marginBlock: 8 }}>{item.description}</p>}
            <div className="experience-actions">
              <button className="button secondary" type="button" onClick={() => setPreview(preview === item.id ? null : item.id)}>{preview === item.id ? "Đóng xem trước" : "Xem trước"}</button>
              <button className="button" type="button" disabled={busy || (item.status === "draft" && !reviewed.includes(item.id))} onClick={() => void changeStatus(item)}>{item.status === "published" ? "Ẩn trải nghiệm" : "Xuất bản"}</button>
            </div>
            {item.status === "draft" && !reviewed.includes(item.id) && <small style={{ color: "var(--muted)" }}>Mở xem trước để kiểm tra mô hình trước khi xuất bản.</small>}
            {preview === item.id && <ExperienceViewer key={item.id} id={item.id} title={item.title} onReady={markReady} />}
          </article>
        ))}
      </div>
    </section>
  );
}

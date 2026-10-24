"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExperienceViewer } from "@/components/experience-viewer";
import { MAX_EXPERIENCE_BYTES, type Experience } from "@/lib/experiences";

export function AdminExperiences() {
  const [items, setItems] = useState<Experience[]>([]);
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
    setItems(result.experiences);
  }, []);

  useEffect(() => {
    refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không tải được trải nghiệm."))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("model");
    setError(null);
    setNotice(null);
    if (!(file instanceof File) || file.size > MAX_EXPERIENCE_BYTES) {
      setError("Chọn file GLB tối đa 4 MB.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/experiences", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tải được mô hình.");
      form.reset();
      await refresh();
      setPreview(result.id);
      setNotice("Đã lưu bản nháp. Kiểm tra mô hình trước khi xuất bản lên trang Trải nghiệm 3D/VR.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được mô hình.");
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
      <h2>Quản lý Trải nghiệm 3D/VR</h2>
      <p>Admin đăng mô hình cho trang trải nghiệm. Nghệ nhân vẫn tải ảnh và tạo 3D cho sản phẩm tại Kênh người bán.</p>
      <Link href="/experiences" className="button secondary">Mở trang trải nghiệm</Link>
      <form className="experience-form" onSubmit={upload}>
        <label>Tiêu đề<input name="title" required minLength={3} maxLength={140} /></label>
        <label>Mô tả<textarea name="description" rows={3} maxLength={3000} /></label>
        <label>Mô hình GLB (tối đa 4 MB)<input name="model" type="file" accept=".glb,model/gltf-binary" required /></label>
        <p>File GLB cần chứa đầy đủ texture. Lưu nháp, xem trước rồi xuất bản khi mô hình hiển thị đúng.</p>
        <button className="button" type="submit" disabled={busy}>{busy ? "Đang xử lý…" : "Tải lên và lưu nháp"}</button>
      </form>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading ? <p role="status">Đang tải danh sách…</p> : !items.length && !error ? <p>Chưa có trải nghiệm. Hãy tải lên mô hình đầu tiên.</p> : null}
      <div className="experiences-grid">
        {items.map((item) => (
          <article className="experience-card" key={item.id}>
            <span className="badge">{item.status === "published" ? "Đã xuất bản" : "Bản nháp"}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="experience-actions">
              <button className="button secondary" type="button" onClick={() => setPreview(preview === item.id ? null : item.id)}>{preview === item.id ? "Đóng xem trước" : "Xem trước"}</button>
              <button className="button" type="button" disabled={busy || (item.status === "draft" && !reviewed.includes(item.id))} onClick={() => void changeStatus(item)}>{item.status === "published" ? "Ẩn trải nghiệm" : "Xuất bản"}</button>
            </div>
            {item.status === "draft" && !reviewed.includes(item.id) && <small>Mở xem trước để kiểm tra mô hình trước khi xuất bản.</small>}
            {preview === item.id && <ExperienceViewer key={item.id} id={item.id} title={item.title} onReady={markReady} />}
          </article>
        ))}
      </div>
    </section>
  );
}

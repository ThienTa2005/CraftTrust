"use client";

import { useState } from "react";

type Evidence = {
  id: string; status: string; current_step: string | null; error_code: string | null;
  created_at: string; gpu_runtime_ms: number | null; estimated_cost_usd: number | null;
  model_asset_id: string | null; images: { direction: string; url: string | null }[];
};

export function ModelEvidencePanel({ productId }: { productId: string }) {
  const [history, setHistory] = useState<Evidence[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    setMessage("Đang tải…");
    try {
      const response = await fetch(`/api/products/${productId}/model-evidence`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setHistory(data.history);
      setMessage(data.history.length ? "Ảnh riêng tư có hiệu lực 5 phút. Tải lại nếu ảnh hết hạn." : "Chưa có job.");
    } catch { setMessage("Không tải được bằng chứng. Hãy thử lại."); }
  }
  return <details><summary onClick={() => { if (!history.length) void load(); }}>Ảnh nguồn và lịch sử tạo 3D</summary>
    <button type="button" className="button secondary small" onClick={() => void load()}>Làm mới bằng chứng</button>
    <p role="status">{message}</p>
    {history.map(job => <section key={job.id}>
      <p><code>{job.id}</code> · {job.status} · {job.current_step} · {new Date(job.created_at).toLocaleString("vi-VN")}</p>
      <p>GPU handler: {job.gpu_runtime_ms === null ? "Chưa đo" : `${(job.gpu_runtime_ms / 1000).toFixed(1)} s`} · GPU ước tính: {job.estimated_cost_usd === null ? "Chưa đo" : `$${job.estimated_cost_usd}`} (chưa phải billing)</p>
      {job.error_code && <p role="alert">Mã lỗi: {job.error_code}</p>}
      {job.model_asset_id && <a href={`/api/models/${job.model_asset_id}`} target="_blank" rel="noreferrer">Mở GLB của lần tạo này</a>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {job.images.map((source, index) => source.url && <a key={index} href={source.url} target="_blank" rel="noreferrer">
          {/* Signed private URLs must not go through the public image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={source.url} alt={`Ảnh nguồn ${source.direction}`} width={180} height={180} style={{ objectFit: "contain" }} />
        </a>)}
      </div>
    </section>)}
  </details>;
}

"use client";

import { useState, useRef, useEffect } from "react";
import { CraftModelViewer } from "@/components/model-viewer";
import { ShieldCheck } from "lucide-react";

export default function Preview3DPage() {
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const mountTime = useRef<number | null>(null);

  useEffect(() => {
    mountTime.current = performance.now();
    setLoadTimeMs(null);
  }, []);

  const handleModelReady = () => {
    if (mountTime.current !== null) {
      setLoadTimeMs(Math.round(performance.now() - mountTime.current));
    }
  };

  const modelUrl = "/models/web.glb";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ background: "rgba(46, 125, 50, 0.12)", color: "#2e7d32", padding: "4px 10px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700 }}>
            PIXAL3D QA BENCHMARK
          </span>
          <span style={{ color: "#666", fontSize: "0.85rem" }}>CraftTrust 3D Pipeline v2</span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "#1a1a1a" }}>
          Kiểm Thử Hiển Thị Mô Hình 3D Web GLB (Desktop & Mobile)
        </h1>
        <p style={{ color: "#555", fontSize: "0.92rem", marginTop: 6 }}>
          Kiểm tra trực tiếp <strong>Web GLB (Tối ưu hóa: 6.19 MB, 200k faces)</strong> bảo toàn UV và PBR Material trên nền tảng CraftTrust.
        </p>
      </div>

      {/* Main Grid: Viewer + Inspector Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Left: 3D Model Viewer Container */}
        <div style={{ background: "#f8f9fa", borderRadius: 12, border: "1px solid #e0e0e0", padding: 16, minHeight: 480 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#333" }}>
              VIEWER: web.glb (Optimized for Web & Mobile)
            </span>
            {loadTimeMs !== null ? (
              <span style={{ background: "#c8e6c9", color: "#256029", padding: "2px 8px", borderRadius: 12, fontSize: "0.78rem", fontWeight: 600 }}>
                Loaded in {loadTimeMs} ms
              </span>
            ) : (
              <span style={{ color: "#999", fontSize: "0.78rem" }}>Đang nạp mô hình…</span>
            )}
          </div>

          <CraftModelViewer
            key={modelUrl}
            src={modelUrl}
            poster=""
            onReady={handleModelReady}
            dimensions={{ heightCm: 25, widthCm: 18 }}
          />
        </div>

        {/* Right: Technical Inspector & Comparison */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Card 1: Inspector Verified Facts */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 12px 0", color: "#1b5e20", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={18} /> Kết Quả Inspector (Đã Khắc Phục Nhận Diện Texture)
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.84rem" }}>
              <div style={{ padding: "8px 10px", background: "#f1f8e9", borderRadius: 6 }}>
                <span style={{ color: "#555", display: "block" }}>Has Texture:</span>
                <strong style={{ color: "#2e7d32", fontSize: "0.95rem" }}>✓ TRUE (glTF Chunk 0)</strong>
              </div>
              <div style={{ padding: "8px 10px", background: "#f1f8e9", borderRadius: 6 }}>
                <span style={{ color: "#555", display: "block" }}>Has UV Coordinates:</span>
                <strong style={{ color: "#2e7d32", fontSize: "0.95rem" }}>✓ TRUE (Topological Replay)</strong>
              </div>
              <div style={{ padding: "8px 10px", background: "#f5f5f5", borderRadius: 6 }}>
                <span style={{ color: "#555", display: "block" }}>Texture Slots:</span>
                <strong style={{ color: "#333" }}>baseColor, metallicRoughness</strong>
              </div>
              <div style={{ padding: "8px 10px", background: "#f5f5f5", borderRadius: 6 }}>
                <span style={{ color: "#555", display: "block" }}>Embedded Formats:</span>
                <strong style={{ color: "#333" }}>WEBP (EXT_texture_webp)</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Optimization Comparison Table */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 12px 0", color: "#333" }}>
              Đối Chiếu Master GLB vs Web GLB
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "6px 4px" }}>Chỉ số</th>
                  <th style={{ padding: "6px 4px" }}>Master GLB (Archive)</th>
                  <th style={{ padding: "6px 4px", color: "#2e7d32" }}>Web GLB (Viewer)</th>
                  <th style={{ padding: "6px 4px", color: "#1565c0" }}>Mức tối ưu</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px 4px", color: "#666" }}>Dung lượng</td>
                  <td style={{ padding: "6px 4px" }}>36.48 MB</td>
                  <td style={{ padding: "6px 4px", fontWeight: 700, color: "#2e7d32" }}>6.19 MB</td>
                  <td style={{ padding: "6px 4px", color: "#1565c0", fontWeight: 600 }}>Giảm 83.0%</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px 4px", color: "#666" }}>Số đa giác (Faces)</td>
                  <td style={{ padding: "6px 4px" }}>979,789</td>
                  <td style={{ padding: "6px 4px", fontWeight: 700, color: "#2e7d32" }}>200,000</td>
                  <td style={{ padding: "6px 4px", color: "#1565c0", fontWeight: 600 }}>Giảm 79.6%</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px 4px", color: "#666" }}>Số đỉnh (Vertices)</td>
                  <td style={{ padding: "6px 4px" }}>682,872</td>
                  <td style={{ padding: "6px 4px", fontWeight: 700, color: "#2e7d32" }}>142,255</td>
                  <td style={{ padding: "6px 4px", color: "#1565c0", fontWeight: 600 }}>Giảm 79.2%</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 4px", color: "#666" }}>Lưu trữ / Hiển thị</td>
                  <td style={{ padding: "6px 4px" }}>Cloud Storage (Private)</td>
                  <td style={{ padding: "6px 4px", color: "#2e7d32" }}>Buyer Web Viewer</td>
                  <td style={{ padding: "6px 4px" }}>Web Ready</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card 3: Multi-View Surface Grounding */}
          <div style={{ background: "#f0f7ff", border: "1px solid #bbdefb", borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 8px 0", color: "#0d47a1" }}>
              Độ Che Phủ Theo Số Lượng Ảnh (Cardinal Angles)
            </h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.83rem", color: "#333", lineHeight: 1.6 }}>
              <li><strong>1 ảnh (Single-view):</strong> Chỉ hỗ trợ ảnh thật mặt trước (0°); toàn bộ mặt sau và hai hông do AI ước lượng từ mô hình suy đoán.</li>
              <li><strong>2 ảnh (Two-view: Trước + Sau):</strong> Mặt trước (0°) và mặt sau (180°) được neo trực tiếp bằng ảnh sản phẩm thật; khử suy đoán sai về hoa văn lưng, hai hông còn yếu tố nội suy.</li>
              <li><strong>4 ảnh (Multi-view 4 hướng):</strong> 4 góc cardinal (0°, 90°, 180°, 270°) đều có ảnh thật đối chiếu; tuy nhiên vùng đỉnh/đáy và các góc lõm sâu vẫn được AI hoàn thiện theo prior 3D.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Store, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

interface Village {
  id: string;
  name: string;
  district: string;
}

interface SellerRegistrationFormProps {
  villages: Village[];
}

export function SellerRegistrationForm({ villages }: SellerRegistrationFormProps) {
  const [name, setName] = useState("");
  const [villageId, setVillageId] = useState(villages[0]?.id || "");
  const [bio, setBio] = useState("");
  const [yearsPracticing, setYearsPracticing] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên xưởng hoặc cơ sở sản xuất.");
      return;
    }
    if (!villageId) {
      setError("Vui lòng chọn làng nghề thủ công.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/seller/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          villageId,
          bio: bio.trim(),
          yearsPracticing: Number(yearsPracticing) || 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể đăng ký xưởng người bán.");
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="seller-unauthorized-box" style={{ maxWidth: 540 }}>
        <div className="seller-unauthorized-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
          <CheckCircle size={36} />
        </div>
        <span className="eyebrow" style={{ color: "#059669" }}>Đăng Ký Thành Công</span>
        <h2>Chào mừng Nghệ nhân đến với CraftTrust!</h2>
        <p style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.6 }}>
          Hồ sơ xưởng thủ công của bạn đã được kích hoạt thành công trên hệ thống. Đang chuyển hướng bạn vào Kênh Người Bán...
        </p>
      </div>
    );
  }

  return (
    <div className="seller-unauthorized-box" style={{ maxWidth: 600, textAlign: "left" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div className="seller-unauthorized-icon">
          <Store size={32} />
        </div>
        <span className="eyebrow">Hanoi Craft-Trust · Đăng Ký Kênh Người Bán</span>
        <h2 style={{ margin: "8px 0 6px" }}>Mở Gian Hàng Làng Nghề</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
          Đăng ký thông tin xưởng gốm sứ / thủ công mỹ nghệ của bạn để bắt đầu đăng bán và số hóa 3D/AR.
        </p>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 4 }}>
            Tên Xưởng / Cơ sở chế tác thủ công <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="Ví dụ: Xưởng Gốm Mỹ Nghệ Bát Tràng Bảo Long"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 12px" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 4 }}>
              Làng nghề trực thuộc <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              className="select"
              value={villageId}
              onChange={(e) => setVillageId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px" }}
            >
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.district})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 4 }}>
              Số năm kinh nghiệm truyền thống
            </label>
            <input
              type="number"
              min={1}
              max={80}
              className="input"
              value={yearsPracticing}
              onChange={(e) => setYearsPracticing(Number(e.target.value))}
              style={{ width: "100%", padding: "10px 12px" }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 4 }}>
            Giới thiệu tinh hoa nghề và xưởng
          </label>
          <textarea
            className="input"
            rows={3}
            placeholder="Mô tả kỹ thuật làm gốm vuốt tay, bài men gia truyền, hoặc các giải thưởng chứng nhận nghề..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", resize: "vertical" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="button terracotta"
          style={{ width: "100%", padding: "12px", marginTop: 8, justifyContent: "center" }}
        >
          {loading ? "Đang khởi tạo hồ sơ xưởng..." : "Hoàn tất đăng ký & Mở Kênh Người Bán"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>
    </div>
  );
}

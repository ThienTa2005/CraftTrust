"use client";
import { useState } from "react";
import { cameraDirections, type CameraDirection } from "@/lib/model-source-views";

const defaultRoles: CameraDirection[] = ["FRONT", "BACK", "LEFT", "RIGHT"];

const roleDescriptions: Record<string, string> = {
  FRONT: "Mặt trước (0°) — Chuẩn đối xứng",
  BACK: "Mặt sau (180°) — Khử suy đoán mặt sau",
  LEFT: "Góc trái (270°) — Thân & quai trái",
  RIGHT: "Góc phải (90°) — Thân & quai phải",
  TOP: "Miệng / Đỉnh",
  BOTTOM: "Đáy / Chân gốm",
  CUSTOM: "Góc tùy biến",
};

export function ModelCameraFields({
  index,
  name,
  prefix = "camera",
  initialDirection,
  onChange,
}: {
  index: number;
  name: string;
  prefix?: string;
  initialDirection?: CameraDirection;
  onChange?: (dir: CameraDirection) => void;
}) {
  const fallbackDefault = defaultRoles[index] ?? "FRONT";
  const [selectedDirection, setSelectedDirection] = useState<CameraDirection>(
    initialDirection ?? fallbackDefault,
  );

  return (
    <div className="seller-fields" style={{ marginTop: 6, marginBottom: 6 }}>
      <label className="seller-field">
        <span style={{ fontSize: "0.76rem", fontWeight: 600 }}>
          Vai trò ảnh: {name}
        </span>
        <select
          name={`${prefix}-direction-${index}`}
          value={selectedDirection}
          onChange={(e) => {
            const val = e.target.value as CameraDirection;
            setSelectedDirection(val);
            onChange?.(val);
          }}
          required
          style={{ fontSize: "0.82rem", padding: "4px 8px" }}
        >
          {cameraDirections.map((dir) => (
            <option key={dir} value={dir}>
              {dir} — {roleDescriptions[dir] ?? dir}
            </option>
          ))}
        </select>
      </label>
      {selectedDirection === "CUSTOM" && (
        <label className="seller-field">
          <span style={{ fontSize: "0.76rem" }}>
            Góc azimuth (0–359°, FRONT = 0°)
          </span>
          <input
            name={`${prefix}-azimuth-${index}`}
            type="number"
            min={0}
            max={359.99}
            step="any"
            placeholder="Ví dụ: 45"
            style={{ fontSize: "0.82rem" }}
          />
        </label>
      )}
    </div>
  );
}

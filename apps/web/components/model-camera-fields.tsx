"use client";
import { cameraDirections } from "@/lib/model-source-views";

export function ModelCameraFields({ index, name, prefix = "camera" }: { index: number; name: string; prefix?: string }) {
  return <div className="seller-fields">
    <label className="seller-field"><span>Hướng ảnh: {name}</span>
      <select name={`${prefix}-direction-${index}`} defaultValue="" required>
        <option value="" disabled>Chọn hướng camera</option>
        {cameraDirections.map(direction => <option key={direction} value={direction}>{direction}</option>)}
      </select>
    </label>
    <label className="seller-field"><span>Góc CUSTOM (0–359°, FRONT = 0°)</span>
      <input name={`${prefix}-azimuth-${index}`} type="number" min={0} max={359.99} step="any" placeholder="Chỉ nhập khi chọn CUSTOM" />
    </label>
  </div>;
}

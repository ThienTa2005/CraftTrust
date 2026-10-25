export const cameraDirections = ["FRONT", "BACK", "LEFT", "RIGHT", "TOP", "BOTTOM", "CUSTOM"] as const;
export type CameraDirection = typeof cameraDirections[number];
export type CameraView = { direction: CameraDirection; azimuth: number | null };
const angles: Partial<Record<CameraDirection, number>> = { FRONT: 0, BACK: 180, LEFT: 270, RIGHT: 90 };

export function parseSourceViews(value: FormDataEntryValue | null, count: number): CameraView[] {
  if (!count) return [];
  if (typeof value !== "string") throw new Error("Hãy khai báo hướng camera cho từng ảnh.");
  let entries: unknown;
  try { entries = JSON.parse(value); } catch { throw new Error("Thông tin góc chụp không hợp lệ."); }
  if (!Array.isArray(entries) || entries.length !== count) throw new Error("Số góc chụp phải khớp số ảnh.");
  const views: CameraView[] = entries.map(entry => {
    if (!entry || !cameraDirections.includes(entry.direction)) throw new Error("Hướng camera không hợp lệ.");
    const direction = entry.direction as CameraDirection;
    const azimuth = angles[direction] ?? (direction === "CUSTOM" ? entry.azimuth : null);
    if (direction === "CUSTOM" && (typeof azimuth !== "number" || !Number.isFinite(azimuth) || azimuth < 0 || azimuth >= 360))
      throw new Error("Góc tùy chọn phải từ 0 đến dưới 360 độ.");
    return { direction, azimuth };
  });
  if (!views.some(v => v.direction === "FRONT")) throw new Error("Cần ít nhất một ảnh FRONT.");
  const body = views.filter(v => v.azimuth !== null);
  if (new Set(body.map(v => v.azimuth)).size !== body.length) throw new Error("Các góc dựng thân không được trùng nhau.");
  return views;
}

export function parseRequestedEngine(value: FormDataEntryValue | null) {
  const engine = typeof value === "string" ? value : "auto";
  if (!["auto", "ceramic", "multiview"].includes(engine))
    throw new Error("Engine này chưa có hạ tầng inference được kiểm chứng. Hãy chọn Ceramic hoặc Limited Multi-view.");
  return engine;
}

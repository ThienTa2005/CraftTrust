export const EXPERIENCE_BUCKET = "experience-models";
export const MAX_EXPERIENCE_BYTES = 4_000_000;

export type Experience = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  created_at: string;
  product_id?: string;
  model_asset_id?: string;
  product?: ExperienceProduct | null;
};

export type ExperienceProduct = {
  id: string;
  name: string;
  slug: string;
  posterUrl?: string;
  artisan: string;
  village?: string;
  priceVnd?: number;
  modelAssetId?: string;
  hasModel?: boolean;
  modelUrl?: string;
  status?: string;
};

// Require a self-contained GLB: no remote textures or sibling resource files.
export function validateExperienceGlb(buffer: ArrayBuffer): string | null {
  try {
    const view = new DataView(buffer);
    if (buffer.byteLength < 20 || buffer.byteLength > MAX_EXPERIENCE_BYTES ||
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== buffer.byteLength) {
      return "Tệp phải là GLB 2.0 hợp lệ, tối đa 4 MB.";
    }
    const jsonSize = view.getUint32(12, true);
    if (jsonSize % 4 !== 0 || view.getUint32(16, true) !== 0x4e4f534a || 20 + jsonSize > buffer.byteLength) {
      return "Không đọc được dữ liệu mô hình GLB.";
    }
    const document = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonSize)));
    if (document.asset?.version !== "2.0" || !document.meshes?.length || !document.scenes?.length) {
      return "GLB cần có scene và mesh để hiển thị.";
    }
    const hasExternalResource = (value: unknown): boolean => {
      if (!value || typeof value !== "object") return false;
      return Object.entries(value).some(([key, child]) =>
        key === "uri" ? typeof child !== "string" || !child.startsWith("data:") : hasExternalResource(child),
      );
    };
    if (hasExternalResource(document)) return "Hãy nhúng toàn bộ texture và tài nguyên vào file GLB.";
    let offset = 20 + jsonSize;
    let binarySize = 0;
    if (offset < buffer.byteLength) {
      if (offset + 8 > buffer.byteLength || view.getUint32(offset + 4, true) !== 0x004e4942) return "Khối nhị phân GLB không hợp lệ.";
      binarySize = view.getUint32(offset, true);
      if (binarySize % 4 !== 0) return "Khối nhị phân GLB không hợp lệ.";
      offset += 8 + binarySize;
    }
    if (offset !== buffer.byteLength || (document.buffers ?? []).some((entry: { uri?: string; byteLength: number }) =>
      !entry.uri && (!Number.isInteger(entry.byteLength) || entry.byteLength < 0 || entry.byteLength > binarySize),
    )) return "Dữ liệu nhị phân GLB bị thiếu hoặc sai kích thước.";
    return null;
  } catch {
    return "Không đọc được tệp GLB. Hãy xuất lại mô hình rồi thử lại.";
  }
}

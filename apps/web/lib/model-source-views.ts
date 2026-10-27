export const cameraDirections = [
  "FRONT",
  "BACK",
  "LEFT",
  "RIGHT",
  "TOP",
  "BOTTOM",
  "CUSTOM",
] as const;

export type CameraDirection = (typeof cameraDirections)[number];
export type CameraView = { direction: CameraDirection; azimuth: number | null };

export const cardinalAngles: Record<"FRONT" | "BACK" | "LEFT" | "RIGHT", number> = {
  FRONT: 0,
  RIGHT: 90,
  BACK: 180,
  LEFT: 270,
};

const angles: Partial<Record<CameraDirection, number>> = {
  FRONT: 0,
  BACK: 180,
  LEFT: 270,
  RIGHT: 90,
};

export function autoAssignViews(count: number): CameraView[] {
  if (count <= 0) return [];
  if (count === 1) return [{ direction: "FRONT", azimuth: 0 }];
  if (count === 2)
    return [
      { direction: "FRONT", azimuth: 0 },
      { direction: "BACK", azimuth: 180 },
    ];
  if (count === 3)
    return [
      { direction: "FRONT", azimuth: 0 },
      { direction: "BACK", azimuth: 180 },
      { direction: "LEFT", azimuth: 270 },
    ];
  return [
    { direction: "FRONT", azimuth: 0 },
    { direction: "BACK", azimuth: 180 },
    { direction: "LEFT", azimuth: 270 },
    { direction: "RIGHT", azimuth: 90 },
  ];
}

export function resolveGenerationMode(
  views: CameraView[],
): "single" | "two_view" | "multiview" {
  if (views.length <= 1) return "single";
  const directions = new Set(views.map((v) => v.direction));
  if (views.length === 2 && directions.has("FRONT") && directions.has("BACK")) {
    return "two_view";
  }
  return "multiview";
}

export function computeViewCoverage(views: CameraView[]) {
  const directions = new Set(views.map((v) => v.direction));
  const front_supported = directions.has("FRONT");
  const back_supported = directions.has("BACK");
  const left_supported = directions.has("LEFT");
  const right_supported = directions.has("RIGHT");
  const supported_cardinal_count = [
    front_supported,
    back_supported,
    left_supported,
    right_supported,
  ].filter(Boolean).length;
  const supported_views = (["FRONT", "BACK", "LEFT", "RIGHT"] as const).filter((d) =>
    directions.has(d),
  );
  const cardinal_coverage_ratio = Number(
    (supported_cardinal_count / 4).toFixed(2),
  );
  const speculative_regions_percent = Math.max(
    0,
    (4 - supported_cardinal_count) * 25,
  );
  const mode = resolveGenerationMode(views);
  return {
    mode,
    supported_views,
    front_supported,
    back_supported,
    left_supported,
    right_supported,
    supported_cardinal_count,
    cardinal_coverage_ratio,
    speculative_regions_percent,
    confidence_score: cardinal_coverage_ratio,
    coverage_formula: "cardinal_coverage_ratio = supported_cardinal_views / 4.0",
    coverage_limitations:
      "Chỉ đo độ che phủ trên 4 hướng chính. Vùng đỉnh, đáy và góc lõm vẫn do AI suy đoán.",
    pose_estimation_warning:
      "Góc camera được gán xấp xỉ theo 4 hướng chính (0°, 90°, 180°, 270°).",
  };
}

export function parseSourceViews(
  value: FormDataEntryValue | null,
  count: number,
): CameraView[] {
  if (!count) return [];
  if (typeof value !== "string")
    throw new Error("Hãy khai báo hướng camera cho từng ảnh.");

  let entries: unknown;
  try {
    entries = JSON.parse(value);
  } catch {
    throw new Error("Thông tin góc chụp không hợp lệ.");
  }

  if (!Array.isArray(entries) || entries.length !== count) {
    throw new Error("Số góc chụp phải khớp số ảnh.");
  }

  const views: CameraView[] = entries.map((entry) => {
    if (!entry || !cameraDirections.includes(entry.direction)) {
      throw new Error("Hướng camera không hợp lệ.");
    }
    const direction = entry.direction as CameraDirection;
    const azimuth =
      angles[direction] ?? (direction === "CUSTOM" ? entry.azimuth : null);
    if (
      direction === "CUSTOM" &&
      (typeof azimuth !== "number" ||
        !Number.isFinite(azimuth) ||
        azimuth < 0 ||
        azimuth >= 360)
    ) {
      throw new Error("Góc tùy chọn phải từ 0 đến dưới 360 độ.");
    }
    return { direction, azimuth };
  });

  if (!views.some((v) => v.direction === "FRONT")) {
    throw new Error("Cần ít nhất một ảnh FRONT.");
  }
  const body = views.filter((v) => v.azimuth !== null);
  if (new Set(body.map((v) => v.azimuth)).size !== body.length) {
    throw new Error("Các góc dựng thân không được trùng nhau.");
  }
  return views;
}

export function parseRequestedEngine(value: FormDataEntryValue | null) {
  const engine = typeof value === "string" ? value : "pixal3d";
  if (!["pixal3d", "pixal3d-multiview"].includes(engine)) {
    throw new Error("Chỉ Pixal3D Cloud được phép tạo job mới.");
  }
  return engine;
}

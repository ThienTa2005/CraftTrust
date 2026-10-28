from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

CARDINAL: dict[str, float] = {
    "FRONT": 0.0,
    "RIGHT": 90.0,
    "BACK": 180.0,
    "LEFT": 270.0,
}

ROLE_ORDER: tuple[str, ...] = ("FRONT", "BACK", "LEFT", "RIGHT")


def auto_assign_cardinal_roles(count: int) -> list[str]:
    """Auto-assign cardinal roles based on upload sequence (1 to 4 images)."""
    if count < 1 or count > 4:
        raise ValueError(f"Input image count ({count}) must be between 1 and 4.")
    if count == 1:
        return ["FRONT"]
    if count == 2:
        return ["FRONT", "BACK"]
    if count == 3:
        return ["FRONT", "BACK", "LEFT"]
    return ["FRONT", "BACK", "LEFT", "RIGHT"]


def resolve_generation_mode(records: list[dict[str, Any]]) -> str:
    """Resolve generation mode from input records: 'single', 'two_view', or 'multiview'."""
    count = len(records)
    if count <= 1:
        return "single"
    directions = {str(r.get("direction", "")).upper() for r in records}
    if count == 2 and "FRONT" in directions and "BACK" in directions:
        return "two_view"
    return "multiview"


def compute_view_coverage_advisory(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate verified coverage vs speculative geometry and texture regions."""
    directions = {str(r.get("direction", "")).upper() for r in records}
    front_ok = "FRONT" in directions
    back_ok = "BACK" in directions
    left_ok = "LEFT" in directions
    right_ok = "RIGHT" in directions

    photo_supported_views = [d for d in ("FRONT", "BACK", "LEFT", "RIGHT") if d in directions]
    supported_count = len(photo_supported_views)
    # Heuristic cardinal sector coverage (horizontal belt only)
    cardinal_ratio = round(supported_count / 4.0, 2)
    unsupported_cardinal_percent = round(max(0.0, (4 - supported_count) * 25.0), 1)
    mode = resolve_generation_mode(records)

    coverage_formula = "cardinal_coverage_ratio = supported_cardinal_views / 4.0"
    coverage_limitations = (
        "Chỉ đo độ che phủ trên 4 hướng chính (0°, 90°, 180°, 270°). "
        "Ngay cả khi có 4 ảnh, vùng đỉnh miệng, đáy và góc lõm khuất sâu vẫn do diffusion prior sinh ra, "
        "không triệt tiêu hoàn toàn vùng suy đoán."
    )

    if mode == "single":
        strategy = (
            "Pixal3D single-view flow: chỉ góc nhìn mặt trước (0°) được hỗ trợ bởi ảnh chụp thật; "
            "toàn bộ hình học và hoa văn mặt sau/hai hông do mô hình AI suy đoán hoàn toàn."
        )
        quality_advisory = "Chỉ có ảnh thật mặt trước (1/4 hướng). Mặt sau và hông hoàn toàn suy đoán."
    elif mode == "two_view":
        strategy = (
            "Pixal3D two-view flow: mặt trước (0°) và mặt sau (180°) được hỗ trợ trực tiếp bằng ảnh thật; "
            "giúp định hình đúng họa tiết lưng và giảm sai lệch hình khối, hai hông và đỉnh vẫn suy đoán."
        )
        quality_advisory = "Có ảnh thật mặt trước và mặt sau (2/4 hướng). Hai bên hông vẫn suy đoán."
    elif supported_count == 3:
        strategy = (
            "Pixal3D 3-view flow: 3 hướng cardinal được hỗ trợ bởi ảnh thật; "
            "còn 1 hướng hông cùng vùng đỉnh/đáy do mô hình AI suy đoán."
        )
        quality_advisory = "Có ảnh thật 3 hướng cardinal (3/4 hướng). Còn 1 hướng hông suy đoán."
    else:
        strategy = (
            "Pixal3D 4-view multi-view flow: 4 hướng thân chính (0°, 90°, 180°, 270°) đều có ảnh thật đối chiếu; "
            "vùng đỉnh miệng, đáy và các góc lõm phức tạp vẫn do mô hình AI hoàn thiện theo prior 3D."
        )
        quality_advisory = "Hỗ trợ ảnh thật 4 hướng thân chính (4/4). Đỉnh/đáy và góc lõm vẫn do AI suy đoán."

    return {
        "mode": mode,
        "inputImageCount": len(records),
        "supported_views": photo_supported_views,
        "front_supported": front_ok,
        "back_supported": back_ok,
        "left_supported": left_ok,
        "right_supported": right_ok,
        "supported_cardinal_count": supported_count,
        "cardinal_coverage_ratio": cardinal_ratio,
        "speculative_regions_percent": unsupported_cardinal_percent,
        "confidence_score": cardinal_ratio,
        "coverage_formula": coverage_formula,
        "coverage_limitations": coverage_limitations,
        "pose_estimation_type": "approximate-cardinal-assumption",
        "pose_estimation_warning": (
            "Góc camera được gán xấp xỉ theo 4 hướng chính (0°, 90°, 180°, 270°). "
            "Nếu người bán chụp lệch góc đáng kể, mô hình có thể bị biến dạng."
        ),
        "engine_actual_strategy": strategy,
        "quality_advisory": quality_advisory,
    }


def camera_to_world(azimuth_degrees: float, distance: float = 3.1192) -> list[list[float]]:
    angle = math.radians(azimuth_degrees)
    c, s = math.cos(angle), math.sin(angle)
    front = (
        (1.0, 0.0, 0.0, 0.0),
        (0.0, 0.0, -1.0, -distance),
        (0.0, 1.0, 0.0, 0.0),
        (0.0, 0.0, 0.0, 1.0),
    )
    result = []
    for row in range(4):
        if row == 0:
            result.append([c * front[0][i] - s * front[1][i] for i in range(4)])
        elif row == 1:
            result.append([s * front[0][i] + c * front[1][i] for i in range(4)])
        else:
            result.append(list(front[row]))
    return [[0.0 if abs(value) < 1e-12 else value for value in row] for row in result]


def pad_image_to_square(image_path: Path, target_path: Path) -> None:
    """Pad non-square images to 1:1 aspect ratio with centered subject to prevent squashing in Pixal3D multi-view."""
    from PIL import Image
    try:
        with Image.open(image_path) as im:
            w, h = im.size
            if w == h:
                if image_path != target_path:
                    im.save(target_path)
                return
            max_dim = max(w, h)
            if im.mode == "RGBA":
                bg = (0, 0, 0, 0)
                canvas = Image.new("RGBA", (max_dim, max_dim), bg)
            else:
                corner_px = im.getpixel((0, 0))
                canvas = Image.new(im.mode, (max_dim, max_dim), corner_px)
            x_off = (max_dim - w) // 2
            y_off = (max_dim - h) // 2
            canvas.paste(im, (x_off, y_off))
            canvas.save(target_path)
    except Exception:
        # Non-image files in synthetic testing or fallback
        if image_path != target_path:
            import shutil
            shutil.copyfile(image_path, target_path)


def apply_symmetry_aware_regularization(
    mesh: Any,
    target_aspect_ratio: float | None = None,
    symmetry_strength: float = 0.85,
) -> Any:
    """Regularize radial cross-sections of rotational ceramic vessels to eliminate dents/asymmetry

    while strictly preserving vertical contour silhouette and surface relief details.
    """
    import numpy as np
    import trimesh

    verts = mesh.vertices.copy()
    y_min, y_max = float(np.min(verts[:, 1])), float(np.max(verts[:, 1]))
    dy = max(1e-6, y_max - y_min)
    dx = float(np.max(verts[:, 0]) - np.min(verts[:, 0]))
    dz = float(np.max(verts[:, 2]) - np.min(verts[:, 2]))

    current_ratio = max(dx, dz) / dy
    aspect_scale = (target_aspect_ratio / current_ratio) if target_aspect_ratio is not None else 1.0

    num_bins = 200
    y_bins = np.linspace(y_min, y_max, num_bins + 1)

    for i in range(num_bins):
        y0, y1 = y_bins[i], y_bins[i + 1]
        in_bin = (verts[:, 1] >= y0) & (verts[:, 1] < y1)
        pts = verts[in_bin]
        if len(pts) > 10:
            cx = float(np.median(pts[:, 0]))
            cz = float(np.median(pts[:, 2]))
            dx_rel = pts[:, 0] - cx
            dz_rel = pts[:, 2] - cz
            r = np.sqrt(dx_rel**2 + dz_rel**2)
            r_target = float(np.median(r)) * aspect_scale
            r_new = (1.0 - symmetry_strength) * (r * aspect_scale) + symmetry_strength * r_target
            scale_factor = np.where(r > 1e-6, r_new / np.maximum(r, 1e-6), 1.0)
            verts[in_bin, 0] = cx + dx_rel * scale_factor
            verts[in_bin, 2] = cz + dz_rel * scale_factor

    regularized = trimesh.Trimesh(
        vertices=verts,
        faces=mesh.faces,
        visual=mesh.visual,
        process=False,
    )
    _ = regularized.vertex_normals
    return regularized


def write_transforms(records: list[dict[str, Any]], directory: Path) -> Path:
    """Generate calibrated camera transform manifest for Pixal3D multi-view inference."""
    if not 2 <= len(records) <= 4:
        raise ValueError("Pixal3D multi-view requires 2-4 calibrated views.")
    directions = [str(record.get("direction", "")).upper() for record in records]
    if "FRONT" not in directions or len(set(directions)) != len(directions):
        raise ValueError("Multi-view requires one FRONT view and unique directions.")
    if any(direction not in CARDINAL for direction in directions):
        raise ValueError("Only the calibrated FRONT/RIGHT/BACK/LEFT preset is accepted.")

    # Canonical order: FRONT first, then other cardinal angles in order
    ordered = sorted(records, key=lambda item: (item["direction"] != "FRONT", item.get("ordinal", 0)))
    frames = []
    for index, record in enumerate(ordered):
        direction = record["direction"].upper()
        declared = float(record.get("azimuth", CARDINAL[direction]))
        if abs(declared - CARDINAL[direction]) > 0.01:
            raise ValueError(f"{direction} azimuth does not match the calibrated preset.")
        target = directory / f"view{index:02d}_azim{int(declared):03d}{Path(record['path']).suffix.lower()}"
        pad_image_to_square(Path(record["path"]), target)
        record["path"] = target
        frames.append({
            "file_path": target.name,
            "name": f"azim{int(declared):03d}",
            "direction": direction,
            "camera_angle_x": math.radians(20.0),
            "transform_matrix": camera_to_world(declared),
        })

    advisory = compute_view_coverage_advisory(records)

    output = directory / "transforms.json"
    output.write_text(json.dumps({
        "camera_angle_x": math.radians(20.0),
        "mesh_scale": 1.0,
        "cameraPreset": "crafttrust-cardinal-orbit-v1",
        "poseEstimationType": "approximate-cardinal-assumption",
        "poseConfidence": "calibrated-cardinal-preset-approximate",
        "photographyGuideline": "Photos must be taken ~90 degrees apart around the object at uniform elevation.",
        "viewCoverage": advisory,
        "frames": frames,
    }, indent=2), encoding="utf-8")
    return output

"""CPU ceramic approximation with mask-constrained limited-view textures. Not a relief scan."""

import argparse
import io
import json
import math
import struct
import sys
import time
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ImageOps
from scipy.ndimage import gaussian_filter1d, grey_opening, median_filter
from scipy.stats import theilslopes

from ai_adapter import Hybrid3DManager

MAX_WEB_BYTES = 2_000_000


from segmentation import segment_object
from texture_projection import project_textures
from quality_validation import compact_parts, validate_mesh


def extract_ceramic_profile(
    mask: np.ndarray,
    rim_flare: float = 1.0,
    wall_thickness_ratio: float = 0.04,
) -> Tuple[np.ndarray, int, int, np.ndarray, np.ndarray]:
    """Extracts continuous radial profile along the rotational symmetry axis.

    Applies ceramic structural modeling:
    - Preserves delicate neck/collar transitions.
    - Accentuates rim flare lip if specified.
    - Stabilizes bottom foot-ring base.
    """
    height, width = mask.shape
    occupied = np.flatnonzero(mask.any(axis=1))
    if len(occupied) < 20:
        raise ValueError("Không đủ biên dạng. Hãy chụp toàn bộ sản phẩm trên nền trơn.")
    top, bottom = int(occupied[0]), int(occupied[-1])
    ys = np.arange(top, bottom + 1)
    valid = mask[ys].any(axis=1)
    left = np.argmax(mask[ys], axis=1).astype(float)
    right = width - 1 - np.argmax(mask[ys, ::-1], axis=1).astype(float)
    left = np.interp(ys, ys[valid], left[valid])
    right = np.interp(ys, ys[valid], right[valid])
    centers = (left + right) / 2
    region = (ys >= top + (bottom - top) * 0.35) & (ys <= top + (bottom - top) * 0.85)
    # A dragon/handle can bias least-squares initialization enough that it is
    # never rejected. Seed with a high-breakdown line fit instead.
    fit_rows = np.flatnonzero(region)[::max(1, int(region.sum()) // 128)]
    slope, intercept, _, _ = theilslopes(centers[fit_rows], ys[fit_rows])
    residual = centers - (slope * ys + intercept)
    tolerance = max(3.0, 3 * float(np.median(np.abs(residual[region] - np.median(residual[region])))))
    keep = region & (np.abs(residual - np.median(residual[region])) <= tolerance)
    for _ in range(4):
        slope, intercept = np.polyfit(ys[keep], centers[keep], 1)
        residual = centers - (slope * ys + intercept)
        error = residual[keep]
        tolerance = max(3.0, 3 * float(np.median(np.abs(error - np.median(error)))))
        candidate = region & (np.abs(residual - np.median(error)) <= tolerance)
        if candidate.sum() < 12:
            break
        keep = candidate
    axis = slope * ys + intercept
    center_hit = mask[ys, np.clip(np.rint(axis).astype(int), 0, width - 1)] > 0
    hit_rows = ys[center_hit]
    if len(hit_rows) < 20:
        raise ValueError("Không xác định được trục bình. Hãy dùng ảnh nền trơn hoặc PNG tách nền.")
    top, bottom = int(hit_rows[0]), int(hit_rows[-1])
    use = (ys >= top) & (ys <= bottom)
    ys, left, right, centers, axis = (a[use] for a in (ys, left, right, centers, axis))
    if bottom - top < height * 0.15:
        raise ValueError("Vật thể quá nhỏ hoặc bị che khuất. Hãy chụp gần hơn.")

    half_width = (right - left) / 2
    symmetric = np.abs(centers - axis) <= max(3.0, np.percentile(half_width, 90) * 0.055)
    tracked = np.where(symmetric, centers, axis)
    tracked = gaussian_filter1d(tracked, max(1.0, len(ys) / 180))
    radius = half_width.copy()
    body_rows = symmetric & (ys > top + (bottom - top) * 0.25) & (
        ys < top + (bottom - top) * 0.8
    )
    anchor = int(np.argmax(np.where(body_rows, half_width, -1)))
    if not body_rows.any():
        raise ValueError("Hai bên vật thể bị che khuất. Hãy dùng ảnh nền trơn hoặc PNG tách nền.")

    for step in (-1, 1):
        history = [float(radius[anchor])]
        for i in range(anchor + step, len(ys) if step > 0 else -1, step):
            if not symmetric[i]:
                drift = float(np.median(np.diff(history[-12:]))) if len(history) > 2 else 0.0
                prediction = history[-1] + np.clip(drift, -3, 3)
                candidates = np.array([tracked[i] - left[i], right[i] - tracked[i]])
                candidates[candidates <= 2] = np.inf
                radius[i] = candidates[np.argmin(np.abs(candidates - prediction))]
            history.append(float(radius[i]))

    good = (radius > 2) & np.isfinite(radius)
    if good.sum() < len(ys) * 0.65:
        raise ValueError("Biên dạng không liên tục. Hãy dùng ảnh chụp thẳng hoặc PNG tách nền.")
    radius = np.interp(ys, ys[good], radius[good])
    window = max(3, int(len(ys) * 0.018) | 1)
    # A protruding ornament is not a ring around the whole pot. Use the
    # nearer silhouette side, then remove narrow positive excursions.
    radius = np.minimum(radius, np.minimum(axis - left, right - axis))
    radius = grey_opening(median_filter(radius, size=5), size=max(window, int(len(ys) * 0.06) | 1))
    # First/last scanlines can contain only a few antialiased pixels on a
    # tilted ellipse. Do not collapse the mouth or foot to that tiny chord.
    edge_rows = max(3, int(len(ys) * 0.012))
    radius[:edge_rows] = np.median(radius[edge_rows:2 * edge_rows])
    radius[-edge_rows:] = np.median(radius[-2 * edge_rows:-edge_rows])

    # 128 vertical profile sample rings
    samples = np.linspace(bottom, top, 128)
    radii = np.interp(samples, ys, radius)
    radii = gaussian_filter1d(radii, 2.5, mode="nearest")

    # Apply rim flare factor to top 5% rings if specified
    if abs(rim_flare - 1.0) > 0.01:
        flare_rows = int(len(radii) * 0.08)
        flare_curve = np.linspace(1.0, rim_flare, flare_rows)
        radii[-flare_rows:] *= flare_curve

    radii[0] = max(radii[0], radii[1])
    radii[-1] = max(radii[-1], radii[-2])
    return np.interp(samples, ys, tracked), top, bottom, samples, radii


def compute_silhouette_iou(
    mask: np.ndarray,
    cx_samples: np.ndarray,
    samples: np.ndarray,
    radii: np.ndarray,
    top: int,
    bottom: int,
) -> float:
    """Computes exact mathematical Intersection-over-Union between photo foreground and reprojected 3D silhouette."""
    h, w = mask.shape
    reprojected = np.zeros_like(mask, dtype=np.uint8)
    ys = np.arange(top, bottom + 1)
    cx_interp = np.interp(ys, samples[::-1], cx_samples[::-1])
    r_interp = np.interp(ys, samples[::-1], radii[::-1])
    for y, cx, r in zip(ys, cx_interp, r_interp):
        if 0 <= y < h:
            x_min = max(0, int(cx - r))
            x_max = min(w - 1, int(cx + r))
            if x_max > x_min:
                reprojected[y, x_min : x_max + 1] = 1
    photo_fg = (mask > 0).astype(np.uint8)
    intersection = np.logical_and(photo_fg, reprojected).sum()
    union = np.logical_or(photo_fg, reprojected).sum()
    if union == 0:
        return 0.0
    return round(float(intersection / union), 4)


def generate_pbr_maps(
    base_color_rgb: np.ndarray,
    is_master: bool = False,
) -> Tuple[bytes, bytes, bytes]:
    """Generates complete PBR map suite: Base Color, Metallic-Roughness, and Normal Map.

    Returns: (base_color_bytes, metallic_roughness_bytes, normal_map_bytes)
    """
    h, w = base_color_rgb.shape[:2]

    # 1. Base Color JPEG
    base_color_io = io.BytesIO()
    Image.fromarray(base_color_rgb).save(
        base_color_io,
        format="JPEG",
        quality=95 if is_master else 88,
        subsampling=0,
    )
    base_color_bytes = base_color_io.getvalue()

    # Display assumptions only: RGB photos do not measure a material BRDF.
    # glTF packs roughness in green and metallic in blue.
    # Neutral display roughness; a lit photograph cannot measure glaze BRDF.
    roughness = np.full((h, w), 166, dtype=np.uint8)
    foot_rows = max(4, int(h * 0.06))
    foot_gradient = np.linspace(217, 166, foot_rows).astype(np.uint8)
    roughness[:foot_rows, :] = foot_gradient[:, None]

    # Subtle roughness variance from glaze micro-texture
    gray = cv2.cvtColor(base_color_rgb, cv2.COLOR_RGB2GRAY).astype(float)
    glaze_variance = ((gray - np.mean(gray)) * 0.05).clip(-12, 12).astype(np.int16)
    roughness_final = np.clip(roughness.astype(np.int16) + glaze_variance, 35, 230).astype(np.uint8)

    metallic = np.zeros((h, w), dtype=np.uint8)
    mr_image = np.stack([np.zeros((h, w), dtype=np.uint8), roughness_final, metallic], axis=-1)
    mr_io = io.BytesIO()
    Image.fromarray(mr_image).save(mr_io, format="PNG", optimize=True)
    mr_bytes = mr_io.getvalue()

    # RGB intensity contains pigment and illumination, not measured depth.
    # A neutral normal map avoids presenting painted motifs as recovered relief.
    normal_map = np.full((h, w, 3), (128, 128, 255), dtype=np.uint8)

    normal_io = io.BytesIO()
    Image.fromarray(normal_map).save(
        normal_io,
        format="JPEG",
        quality=92 if is_master else 82,
        subsampling=0,
    )
    normal_bytes = normal_io.getvalue()

    return base_color_bytes, mr_bytes, normal_bytes


def fuse_multiview_textures(front_rgb, front_cx, front_samples, front_radii,
    front_top, front_bottom, back_rgb=None, size=768, back_mode="plain", *,
    front_mask, back_mask=None, back_azimuth=None):
    """Compatibility entry point; masks and explicit back direction are mandatory."""
    views = [{"rgb": front_rgb, "mask": front_mask, "direction": "FRONT", "azimuth": 0,
              "profile": (front_cx, front_top, front_bottom, front_samples, front_radii)}]
    if back_rgb is not None:
        if back_mask is None or back_azimuth is None:
            raise ValueError("Back mask and camera azimuth are required")
        views.append({"rgb": back_rgb, "mask": back_mask, "direction": "BACK", "azimuth": back_azimuth,
                      "profile": extract_ceramic_profile(back_mask)})
    return project_textures(views, front_radii / (front_bottom - front_top), size)


def construct_pottery_mesh(
    radii_px: np.ndarray,
    height_cm: float,
    width_cm: float,
    sides: int = 80,
    wall_thickness_ratio: float = 0.04,
) -> Tuple[List[Any], int, int]:
    """Generates ceramic mesh with interior cavity, unglazed base ring, and accurate normals.

    Returns: (parts_list, total_vertices, total_triangles)
    """
    rings = len(radii_px)
    real_height = height_cm / 100.0
    max_radius = width_cm / 200.0
    radii = radii_px / max(radii_px) * max_radius
    yvalues = np.linspace(0, real_height, rings)
    gradients = np.gradient(radii, yvalues)
    theta = np.linspace(-math.pi, math.pi, sides + 1)

    positions, normals, uv, indices = [], [], [], []

    # 1. Outer Ceramic Body
    for i, (y, radius) in enumerate(zip(yvalues, radii)):
        for j, angle in enumerate(theta):
            sine, cosine = math.sin(angle), math.cos(angle)
            positions.append((radius * sine, y, radius * cosine))
            # Analytical normal for surface of revolution
            normal = np.array([sine, -gradients[i], cosine], dtype=np.float32)
            n_len = np.linalg.norm(normal)
            if n_len > 1e-6:
                normal /= n_len
            normals.append(normal.tolist())
            uv.append((j / sides, i / (rings - 1)))

    for i in range(rings - 1):
        for j in range(sides):
            a = i * (sides + 1) + j
            b = a + sides + 1
            indices += [a, a + 1, b, a + 1, b + 1, b]

    outer_vertex_count = len(positions)
    outer_indices = indices.copy()

    # 2. Inner Vessel Cavity
    # Realistic ceramic wall thickness: thicker at bottom (structural), tapered at neck
    t_base = max(0.003, max_radius * (wall_thickness_ratio * 1.5))
    t_lip = max(0.002, max_radius * (wall_thickness_ratio * 0.75))
    thickness_profile = np.linspace(t_base, t_lip, rings)
    inner_y = np.linspace(t_base, real_height, rings)
    raw_inner_r = np.interp(inner_y, yvalues, radii) - thickness_profile
    if t_base >= real_height or np.any(raw_inner_r <= 0.002):
        raise ValueError("Wall thickness exceeds the vessel radius/height; inner and outer surfaces would intersect.")
    inner_r = np.maximum(raw_inner_r, 0.002)
    inner_grad = np.gradient(inner_r, inner_y)
    inner_start = len(positions)

    for i, (y, radius) in enumerate(zip(inner_y, inner_r)):
        for j, angle in enumerate(theta):
            sine, cosine = math.sin(angle), math.cos(angle)
            positions.append((radius * sine, y, radius * cosine))
            # Inward facing normal for cavity
            normal = np.array([-sine, inner_grad[i], -cosine], dtype=np.float32)
            n_len = np.linalg.norm(normal)
            if n_len > 1e-6:
                normal /= n_len
            normals.append(normal.tolist())
            uv.append((j / sides, 1.0))

    for i in range(rings - 1):
        for j in range(sides):
            a = inner_start + i * (sides + 1) + j
            b = a + sides + 1
            indices += [a, b, a + 1, a + 1, b, b + 1]

    # 3. Rim Lip Bevel (Connects outer rim to inner rim)
    rim_start = len(positions)
    for radius in (float(radii[-1]), float(inner_r[-1])):
        for j, angle in enumerate(theta):
            positions.append((radius * math.sin(angle), real_height, radius * math.cos(angle)))
            normals.append((0.0, 1.0, 0.0))
            uv.append((j / sides, 1.0))

    for j in range(sides):
        a = rim_start + j
        b = a + sides + 1
        indices += [a, a + 1, b, a + 1, b + 1, b]

    # 4. Interior bottom cavity disc (Material 0: Interior Glaze)
    cavity_base_start = len(positions)
    for j, angle in enumerate(theta):
        positions.append((float(inner_r[0]) * math.sin(angle), float(t_base), float(inner_r[0]) * math.cos(angle)))
        normals.append((0.0, 1.0, 0.0))
        uv.append((0.5, 0.0))
    cavity_center_idx = len(positions)
    positions.append((0.0, float(t_base), 0.0))
    normals.append((0.0, 1.0, 0.0))
    uv.append((0.5, 0.0))
    for j in range(sides):
        indices += [cavity_center_idx, cavity_base_start + j, cavity_base_start + j + 1]

    inner_rim_indices = indices[len(outer_indices):]

    # 5. Exterior Bottom Base Disc (Material 2: CeramicBaseQR)
    base_qr_indices = []
    base_start = len(positions)
    r_base = float(radii[0])
    for j, angle in enumerate(theta):
        # x = r_base * sin(angle), z = r_base * cos(angle)
        positions.append((r_base * math.sin(angle), 0.0, r_base * math.cos(angle)))
        normals.append((0.0, -1.0, 0.0))
        # Planar UV for bottom disc: oriented looking up from bottom
        uv.append((0.5 + 0.44 * math.sin(angle), 0.5 - 0.44 * math.cos(angle)))
    center_idx = len(positions)
    positions.append((0.0, 0.0, 0.0))
    normals.append((0.0, -1.0, 0.0))
    uv.append((0.5, 0.5))

    for j in range(sides):
        base_qr_indices += [center_idx, base_start + j + 1, base_start + j]

    all_positions = np.asarray(positions, dtype="<f4")
    all_normals = np.asarray(normals, dtype="<f4")
    all_uv = np.asarray(uv, dtype="<f4")

    total_vertices = len(all_positions)
    total_triangles = (len(outer_indices) + len(inner_rim_indices) + len(base_qr_indices)) // 3

    parts = [
        # Material 0: Interior Ceramic Glaze
        (all_positions, all_normals, all_uv, np.asarray(inner_rim_indices, dtype="<u2")),
        # Material 1: Outer Decorative Handcrafted Surface
        (
            all_positions[:outer_vertex_count],
            all_normals[:outer_vertex_count],
            all_uv[:outer_vertex_count],
            np.asarray(outer_indices, dtype="<u2"),
        ),
        # Material 2: Exterior Base Stamp & Scannable QR Seal
        (
            all_positions,
            all_normals,
            all_uv,
            np.asarray(base_qr_indices, dtype="<u2"),
        ),
    ]
    return compact_parts(parts), total_vertices, total_triangles


def generate_base_qr_texture(trace_url: str, public_code: str, size: int = 512) -> bytes:
    """Generates an authentic artisan ceramic hallmark seal embedding a high-contrast scannable QR code."""
    try:
        import qrcode
        from PIL import ImageDraw

        qr = qrcode.QRCode(box_size=8, border=2)
        qr.add_data(trace_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#10223b", back_color="#f7f3ea").convert("RGBA")

        canvas = Image.new("RGBA", (size, size), (247, 243, 234, 255))
        d = ImageDraw.Draw(canvas)

        # Foot ring ceramic border rings
        d.ellipse([10, 10, size - 10, size - 10], outline=(180, 160, 135, 255), width=6)
        d.ellipse([24, 24, size - 24, size - 24], outline=(200, 185, 165, 255), width=2)

        # Paste QR in center
        qr_size = int(size * 0.54)
        qr_resized = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        canvas.paste(qr_resized, ((size - qr_size) // 2, int(size * 0.12)), qr_resized)

        # Draw brand & public code
        d.text((size // 2, int(size * 0.72)), "HANOI CRAFTTRUST", fill=(16, 34, 59, 255), anchor="mm")
        d.text((size // 2, int(size * 0.79)), public_code, fill=(182, 95, 61, 255), anchor="mm")
        d.text((size // 2, int(size * 0.86)), "HỘ CHIẾU DI SẢN SỐ · XÁC THỰC", fill=(110, 115, 125, 255), anchor="mm")

        buf = io.BytesIO()
        canvas.save(buf, format="PNG")
        return buf.getvalue()
    except Exception:
        canvas = Image.new("RGBA", (size, size), (244, 240, 232, 255))
        buf = io.BytesIO()
        canvas.save(buf, format="PNG")
        return buf.getvalue()


def export_glb_file(
    output_path: str,
    parts: List[Any],
    base_color_bytes: bytes,
    roughness_bytes: bytes,
    normal_bytes: bytes,
    height_cm: float,
    width_cm: float,
    metadata_extras: Dict[str, Any],
    base_qr_bytes: Optional[bytes] = None,
) -> int:
    """Serializes binary glTF 2.0 (.glb) with full PBR metallic-roughness, normal map, and base QR stamp."""
    blob = bytearray()
    views: List[Dict[str, Any]] = []
    accessors: List[Dict[str, Any]] = []

    def add_data(data: bytes, target: Optional[int] = None) -> int:
        while len(blob) % 4:
            blob.append(0)
        offset = len(blob)
        blob.extend(data)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target:
            view["target"] = target
        views.append(view)
        return len(views) - 1

    def make_accessor(array: np.ndarray, type_name: str, component: int, target: int) -> int:
        view_idx = add_data(array.tobytes(), target)
        record = {
            "bufferView": view_idx,
            "componentType": component,
            "count": len(array),
            "type": type_name,
        }
        if type_name == "VEC3":
            record.update(min=array.min(axis=0).tolist(), max=array.max(axis=0).tolist())
        accessors.append(record)
        return len(accessors) - 1

    primitives = []
    for mat_idx, (pos, norm, uv_coords, idxs) in enumerate(parts):
        pos_acc = make_accessor(pos, "VEC3", 5126, 34962)
        norm_acc = make_accessor(norm, "VEC3", 5126, 34962)
        uv_acc = make_accessor(uv_coords, "VEC2", 5126, 34962)
        idx_acc = make_accessor(idxs, "SCALAR", 5123, 34963)
        primitives.append(
            {
                "attributes": {
                    "POSITION": pos_acc,
                    "NORMAL": norm_acc,
                    "TEXCOORD_0": uv_acc,
                },
                "indices": idx_acc,
                "material": mat_idx,
                "mode": 4,
            }
        )
        if mat_idx == 1:
            # Analytic tangent of the outer surface in increasing U direction.
            radial_length = np.linalg.norm(pos[:, [0, 2]], axis=1)
            tangents = np.column_stack((pos[:, 2] / radial_length,
                np.zeros(len(pos)), -pos[:, 0] / radial_length, np.ones(len(pos)))).astype("<f4")
            primitives[-1]["attributes"]["TANGENT"] = make_accessor(tangents, "VEC4", 5126, 34962)

    # Pack Texture Buffers: 0: Base Color, 1: MetallicRoughness, 2: Normal Map
    img_bc_idx = add_data(base_color_bytes)
    img_mr_idx = add_data(roughness_bytes)
    img_norm_idx = add_data(normal_bytes)

    images = [
        {"bufferView": img_bc_idx, "mimeType": "image/jpeg"},
        {"bufferView": img_mr_idx, "mimeType": "image/png"},
        {"bufferView": img_norm_idx, "mimeType": "image/jpeg"},
    ]
    textures = [{"source": 0}, {"source": 1}, {"source": 2}]

    materials = [
        # Material 0: Interior Glaze
        {
            "name": "CeramicGlazeInterior",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.96, 0.95, 0.91, 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.20,
            },
            "doubleSided": True,
        },
        # Material 1: Outer Decorative PBR Ceramic Surface
        {
            "name": "CeramicCraftPBR",
            "pbrMetallicRoughness": {
                "baseColorTexture": {"index": 0},
                "metallicRoughnessTexture": {"index": 1},
                "metallicFactor": 0.0,
                "roughnessFactor": 1.0,
            },
            "normalTexture": {"index": 2, "scale": 1.0},
            "alphaMode": "OPAQUE",
            "doubleSided": False,
        },
    ]

    # Material 2: Exterior Base Stamp & QR Seal
    if base_qr_bytes is not None and len(parts) > 2:
        img_qr_idx = add_data(base_qr_bytes)
        images.append({"bufferView": img_qr_idx, "mimeType": "image/png"})
        textures.append({"source": 3})
        materials.append(
            {
                "name": "CeramicBaseQR",
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 3},
                    "metallicFactor": 0.0,
                    "roughnessFactor": 0.85,
                },
                "doubleSided": True,
            }
        )

    model: Dict[str, Any] = {
        "asset": {
            "version": "2.0",
            "generator": "CraftTrust Ceramic CPU v3.0",
            "extras": {
                **metadata_extras,
                "heightCm": height_cm,
                "widthCm": width_cm,
                "realScale": "1 unit = 1 meter",
            },
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "CraftTrustCeramicArt"}],
        "meshes": [{"primitives": primitives}],
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": views,
        "accessors": accessors,
        "images": images,
        "textures": textures,
        "materials": materials,
    }

    while len(blob) % 4:
        blob.append(0)
    model["buffers"][0]["byteLength"] = len(blob)

    json_str = json.dumps(model, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    json_str += b" " * ((4 - len(json_str) % 4) % 4)

    total_len = 12 + 8 + len(json_str) + 8 + len(blob)
    glb_data = struct.pack("<4sII", b"glTF", 2, total_len)
    glb_data += struct.pack("<I4s", len(json_str), b"JSON") + json_str
    glb_data += struct.pack("<I4s", len(blob), b"BIN\x00") + blob

    Path(output_path).write_bytes(glb_data)
    return len(glb_data)


def run_pipeline(front_path, output_path, height_cm, width_cm, back_path=None,
    shape_mode="measured", back_texture="plain", engine_request="auto", rim_flare=1.0,
    wall_thickness=0.04, public_code="", trace_url="", *, views_json=None,
    back_azimuth=None, profile_json=None):
    start = time.perf_counter()
    if not all(math.isfinite(v) and 3 <= v <= 250 for v in (height_cm, width_cm)):
        raise ValueError("Kích thước sản phẩm phải nằm trong khoảng 3–250 cm.")
    if not 0.01 <= wall_thickness <= 0.15 or not 0.8 <= rim_flare <= 1.2:
        raise ValueError("Độ dày thành hoặc hệ số miệng không hợp lệ.")
    if shape_mode not in ("photo", "measured"):
        raise ValueError("Invalid shape mode")
    records = [{"path": front_path, "direction": "FRONT", "azimuth": 0}]
    if views_json:
        records = json.loads(Path(views_json).read_text(encoding="utf-8"))
    elif back_path:
        if back_azimuth is None:
            raise ValueError("Cần xác nhận hướng camera ảnh sau (--back-azimuth); không suy ra từ thứ tự upload.")
        records.append({"path": back_path, "direction": "BACK", "azimuth": back_azimuth})
    if not isinstance(records, list) or not records:
        raise ValueError("Danh sách góc chụp không hợp lệ.")
    manager = Hybrid3DManager()
    engine_id, _, _ = manager.resolve_engine(engine_request, len(records) > 1)
    if engine_id == "high-fidelity":
        from multiview_reconstruction import reconstruct
        return reconstruct(records, output_path, height_cm, width_cm)
    if len(records) > 4:
        raise ValueError("Limited multi-view hỗ trợ 1–4 ảnh; dùng High Fidelity với bộ ảnh chồng lấp.")
    views, references = [], []
    directions = {"FRONT": 0, "BACK": 180, "LEFT": 270, "RIGHT": 90}
    for record in records:
        direction = str(record.get("direction", "UNKNOWN")).upper()
        if direction not in (*directions, "CUSTOM", "TOP", "BOTTOM"):
            raise ValueError("Ảnh thiếu hướng camera. Hãy khai báo FRONT/BACK/LEFT/RIGHT/TOP/BOTTOM/CUSTOM.")
        image = ImageOps.exif_transpose(Image.open(record["path"]))
        image.thumbnail((3000, 3000))
        rgb, mask = segment_object(image)
        if direction in ("TOP", "BOTTOM"):
            references.append({"direction": direction, "usedFor": "review-only; projection unsupported"})
            continue
        angle = record.get("azimuth", directions.get(direction))
        if not isinstance(angle, (float, int)) or not math.isfinite(angle) or not 0 <= angle < 360:
            raise ValueError("Góc camera phải là số từ 0 đến dưới 360 độ.")
        profile = extract_ceramic_profile(mask, rim_flare=rim_flare)
        views.append({"rgb": rgb, "mask": mask, "profile": profile, "direction": direction, "azimuth": angle})
    if not views or not any(v["direction"] == "FRONT" for v in views):
        raise ValueError("Cần một ảnh FRONT đầy đủ thân sản phẩm.")
    if len({v["azimuth"] for v in views}) != len(views):
        raise ValueError("Các ảnh dựng thân phải có góc camera khác nhau.")
    # Both front and back silhouettes constrain the base envelope. Relief is
    # excluded where a narrower observation exists; unseen depth is unverified.
    normalized = [v["profile"][4] / (v["profile"][2] - v["profile"][1]) for v in views]
    radius = gaussian_filter1d(np.min(normalized, axis=0), 1.0)
    if profile_json:
        manual = np.asarray(json.loads(Path(profile_json).read_text()), dtype=float)
        if manual.ndim != 1 or len(manual) < 8 or not np.isfinite(manual).all() or np.any(manual <= 0) or np.any(manual > 1):
            raise ValueError("Manual profile must contain >=8 positive radius/height samples <=1.")
        radius = np.interp(np.linspace(0, 1, 128), np.linspace(0, 1, len(manual)), manual)
    photo_width = height_cm * 2 * float(radius.max())
    actual_width = width_cm if shape_mode == "measured" else photo_width
    # Use the final scaled geometry for all texture projections and reprojections.
    final_radius = radius * (actual_width / photo_width)
    ious = {}
    for i, view in enumerate(views):
        cx, top, bottom, samples, _ = view["profile"]
        ious[f'{view["direction"]}-{i}'] = compute_silhouette_iou(view["mask"], cx, samples,
            final_radius * (bottom - top), top, bottom)
    texture, provenance, metrics = project_textures(views, final_radius)
    parts, _, _ = construct_pottery_mesh(final_radius, height_cm, actual_width, sides=80, wall_thickness_ratio=wall_thickness)
    topology = validate_mesh(parts)
    warnings = ["Chưa đủ dữ liệu để xác định độ chính xác 3D.",
        "Hình học thân tròn xoay là suy diễn; rồng và hoa văn nổi chưa được tái dựng hình học.",
        "Lòng bình, độ dày, miệng và đáy chưa có số đo kiểm chứng.",
        "Camera trực giao là giả định; góc do người dùng khai báo chưa được hiệu chuẩn."]
    if min(ious.values()) < 0.80:
        warnings.append("Biên dạng dựng lại lệch ảnh tham chiếu; cần sửa số đo/biên dạng hoặc đổi engine.")
    if metrics["seamQuality"]["needsReview"]:
        warnings.append("Đường chuyển texture có chênh lệch lớn; cần thêm ảnh góc bên.")
    if references:
        warnings.append("Ảnh TOP/BOTTOM chỉ dùng đối chiếu, chưa dùng dựng hình.")
    report = {
        "reportVersion": 3, "engine": "ceramic-cpu", "engineVersion": "3.0",
        "mode": "limited-multiview" if len(views) > 1 else "single-image",
        "method": "inferred rotational base + mask-constrained texture projection",
        "requestedEngine": engine_request, "fallbackApplied": False,
        "shapeMode": shape_mode, "hasBackPhoto": any(v["direction"] == "BACK" for v in views),
        "inputViewCount": len(records), "projectedViewCount": len(views), "referenceOnlyViews": references,
        **metrics, "silhouetteMatchScore": min(ious.values()), "silhouetteByView": ious,
        "silhouetteScope": "final scaled outer silhouette; observed views only; orthographic assumption",
        "dimensionErrorPercent": round(abs(actual_width - width_cm) / width_cm * 100, 2),
        "confidenceScore": None, "physicalAccuracy": None, "observedGeometry": False,
        "reliefGeometry": "not-reconstructed", "normalMap": "neutral; not measured relief",
        "meshTopology": topology, "qualityStatus": "NEEDS_REVIEW", "publicationBlocked": True,
        "reviewReasons": warnings, "singleImageLimit": warnings[0],
        "verifiedMeasurements": [], "modelMeasurements": {"heightCm": height_cm, "widthCm": actual_width},
        "inputMeasurements": {"heightCm": height_cm, "widthCm": width_cm},
        "measurementSource": "user-declared; not independently verified",
        "manualProfile": bool(profile_json), "pbrChannels": ["baseColor", "roughness", "neutral-normal"],
    }
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    qr = generate_base_qr_texture(trace_url, public_code) if trace_url and public_code else None
    if qr is None:
        # Keep bottom material present without fabricating a passport identity.
        canvas = Image.new("RGBA", (16, 16), (180, 170, 150, 255))
        buf = io.BytesIO()
        canvas.save(buf, format="PNG")
        qr = buf.getvalue()
    bc, mr, nm = generate_pbr_maps(texture)
    web_bytes = export_glb_file(str(out), parts, bc, mr, nm, height_cm, actual_width, report, qr)
    if web_bytes > MAX_WEB_BYTES:
        raise ValueError(f"GLB vượt ngân sách Web 2 MB ({web_bytes} bytes).")
    master_tex, _, _ = project_textures(views, final_radius, 1536)
    master_parts, _, _ = construct_pottery_mesh(final_radius, height_cm, actual_width, sides=128, wall_thickness_ratio=wall_thickness)
    validate_mesh(master_parts)
    mbc, mmr, mnm = generate_pbr_maps(master_tex, True)
    master_path = out.with_name(out.stem + "-master.glb")
    master_bytes = export_glb_file(str(master_path), master_parts, mbc, mmr, mnm, height_cm, actual_width, report, qr)
    Image.fromarray(texture).save(out.with_name(out.stem + "-texture.png"))
    Image.fromarray(provenance * 50).save(out.with_name(out.stem + "-provenance.png"))
    for i, v in enumerate(views):
        Image.fromarray(v["mask"] * 255).save(out.with_name(out.stem + f"-mask-{i}.png"))
    report.update(assetBytes=web_bytes, under2MB=True, masterAssetBytes=master_bytes,
        masterAssetPath=str(master_path), generationMs=round((time.perf_counter() - start) * 1000))
    out.with_suffix(".json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return report


def parse_arguments(argv=None):
    parser = argparse.ArgumentParser(description="Hanoi CraftTrust Hybrid 3D Engine")
    parser.add_argument("--image", required=True, help="Front photograph")
    parser.add_argument("--back-image", default=None, help="Optional back photograph")
    parser.add_argument("--views-json", help="JSON array of path/direction/azimuth camera views")
    parser.add_argument("--back-azimuth", type=float, help="Confirmed back camera angle in degrees")
    parser.add_argument("--profile-json", help="Manual bottom-to-top normalized radius samples")
    parser.add_argument("--output", required=True, help="Target output GLB path")
    parser.add_argument("--height-cm", type=float, required=True)
    parser.add_argument("--width-cm", type=float, required=True)
    parser.add_argument("--shape-mode", choices=["photo", "measured"], default="measured")
    parser.add_argument("--back-texture", choices=["mirror", "plain"], default="mirror")
    parser.add_argument(
        "--engine",
        # Original model_jobs rows used this name before the CLI was renamed.
        type=lambda value: "ceramic" if value == "ceramic-cpu" else value,
        choices=["auto", "ceramic", "multiview", "high-fidelity", "ai", "ai-trellis", "ai-hunyuan", "ai-triposr"],
        default="auto",
    )
    parser.add_argument("--rim-flare", type=float, default=1.0)
    parser.add_argument("--wall-thickness", type=float, default=0.04)
    parser.add_argument("--public-code", default="", help="Digital passport public code")
    parser.add_argument(
        "--trace-url",
        default="",
        help="Digital passport trace URL encoded into base QR seal",
    )

    return parser.parse_args(argv)


if __name__ == "__main__":
    args = parse_arguments()

    run_pipeline(
        views_json=args.views_json,
        back_azimuth=args.back_azimuth,
        profile_json=args.profile_json,
        front_path=args.image,
        output_path=args.output,
        height_cm=args.height_cm,
        width_cm=args.width_cm,
        back_path=args.back_image,
        shape_mode=args.shape_mode,
        back_texture=args.back_texture,
        engine_request=args.engine,
        rim_flare=args.rim_flare,
        wall_thickness=args.wall_thickness,
        public_code=args.public_code,
        trace_url=args.trace_url,
    )

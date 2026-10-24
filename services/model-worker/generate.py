"""CPU ceramic reconstruction from a seller photograph.

This is a geometric silhouette reconstruction for approximately rotational pottery.
The unseen back can repeat the visible surface by reflection; it is inferred,
not a recovered photograph or multi-view photogrammetry.
"""

import argparse
import io
import json
import math
import struct
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
from scipy.interpolate import UnivariateSpline
from scipy.ndimage import distance_transform_edt, gaussian_filter1d, grey_closing, median_filter

MAX_BYTES = 2_000_000


def segment(image):
    if image.mode == "P" and "transparency" in image.info:
        image = image.convert("RGBA")
    rgb = np.array(image.convert("RGB"))
    height, width = rgb.shape[:2]
    if image.mode == "RGBA":
        alpha = np.array(image.getchannel("A"))
        mask = (alpha > 96).astype(np.uint8) if alpha.min() < 220 else None
    else:
        mask = None
    if mask is None:
        scale = min(1.0, 700 / max(height, width))
        small = cv2.resize(rgb, (max(32, int(width * scale)), max(32, int(height * scale))))
        sh, sw = small.shape[:2]

        def padding(arr):
            uniform = np.max(np.abs(arr.astype(float) - arr[0, 0].astype(float)), axis=(1, 2)) < 8
            count = int(np.argmax(~uniform)) if (~uniform).any() else 0
            if count < len(arr) * 0.025 or count >= len(arr) * 0.3:
                return 0
            changed = (
                np.max(
                    np.abs(arr[min(count + 2, len(arr) - 1)].astype(float) - arr[0, 0].astype(float)),
                    axis=1,
                )
                > 12
            )
            return count if changed.mean() > 0.75 else 0

        x0 = padding(small.transpose(1, 0, 2))
        x1 = sw - padding(small[:, ::-1].transpose(1, 0, 2))
        y0 = padding(small)
        y1 = sh - padding(small[::-1])
        crop = small[y0:y1, x0:x1].copy()
        ch, cw = crop.shape[:2]
        labels = np.zeros((ch, cw), np.uint8)
        inset_x = max(1, int(cw * (0.008 if x0 or x1 < sw else 0.025)))
        inset_y = max(1, int(ch * 0.025))
        rect = (inset_x, inset_y, cw - 2 * inset_x, ch - 2 * inset_y)
        cv2.setRNGSeed(0)
        cv2.grabCut(
            crop,
            labels,
            rect,
            np.zeros((1, 65), np.float64),
            np.zeros((1, 65), np.float64),
            6,
            cv2.GC_INIT_WITH_RECT,
        )
        mask = np.zeros((sh, sw), np.uint8)
        mask[y0:y1, x0:x1] = np.where((labels == 2) | (labels == 0), 0, 1).astype(np.uint8)
        mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if count < 2:
        raise ValueError("Không tách được vật thể. Hãy thử ảnh nền trơn hoặc PNG đã tách nền.")
    center = width / 2
    candidates = [
        i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] > width * height * 0.015
    ]
    if not candidates:
        raise ValueError("Vật thể quá nhỏ trong ảnh. Hãy chụp gần hơn.")
    best = max(
        candidates,
        key=lambda i: stats[i, cv2.CC_STAT_AREA]
        - abs((stats[i, 0] + stats[i, 2] / 2) - center) * height * 0.13,
    )
    mask = (labels == best).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    return rgb, mask


def profile_from_mask(mask):
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
    keep = region.copy()
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
        raise ValueError("Biên dáng không liên tục. Hãy dùng ảnh chụp thẳng hoặc PNG tách nền.")
    radius = np.interp(ys, ys[good], radius[good])
    window = max(3, int(len(ys) * 0.018) | 1)
    radius = grey_closing(median_filter(radius, size=3), size=window)
    base_rows = max(2, int(len(ys) * 0.022))
    radius[-base_rows:] = np.maximum(radius[-base_rows:], radius[-base_rows])
    samples = np.linspace(bottom, top, 128)
    radii = np.interp(samples, ys, radius)
    radii = gaussian_filter1d(radii, 1.3, mode="nearest")
    if np.mean(~symmetric) > 0.1:
        body_end = int(len(radii) * 0.75)
        ix = np.arange(body_end)
        weights = np.ones(body_end)
        weights[[0, -1]] = 8
        fitted = UnivariateSpline(
            ix,
            radii[:body_end],
            w=weights,
            s=body_end * (max(radii) * 0.018) ** 2,
        )(ix)
        radii[:body_end] = np.maximum(fitted, max(radii) * 0.025)
    radii[0] = max(radii[0], radii[1])
    radii[-1] = max(radii[-1], radii[-2])
    return np.interp(samples, ys, tracked), top, bottom, samples, radii


def decoration_texture(rgb, mask, cx, samples, radii, top, bottom, size=768, back_texture="mirror"):
    yy = np.linspace(bottom, top, size).astype(np.float32)
    u = np.linspace(0, 1, size).astype(np.float32)
    theta = (u * 2 - 1) * np.pi
    sample_radius = np.interp(yy, samples[::-1], radii[::-1])
    centers = np.full(size, cx) if np.ndim(cx) == 0 else np.interp(yy, samples[::-1], cx[::-1])
    mx = (
        centers[:, None]
        + np.sin(theta)[None, :] * np.maximum(1, sample_radius[:, None] - 1.5)
    ).astype(np.float32)
    my = np.broadcast_to(yy[:, None], mx.shape).copy()
    source_y = np.arange(rgb.shape[0])
    source_center = (
        np.full(len(source_y), cx)
        if np.ndim(cx) == 0
        else np.interp(source_y, samples[::-1], cx[::-1])
    )
    source_radius = np.interp(source_y, samples[::-1], radii[::-1])
    foreground = (
        np.abs(np.arange(rgb.shape[1])[None, :] - source_center[:, None]) <= source_radius[:, None]
    ) & (source_y[:, None] >= top) & (source_y[:, None] <= bottom)
    nearest = distance_transform_edt(~foreground, return_distances=False, return_indices=True)
    filled = rgb[nearest[0], nearest[1]]
    sampled = cv2.remap(filled, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    output = io.BytesIO()
    if back_texture == "mirror":
        Image.fromarray(sampled).save(output, format="JPEG", quality=95, subsampling=0)
        return output.getvalue(), size * size

    # For plain back: blend smoothly to the natural ceramic glaze color on the back without alpha masking
    glaze_color = np.array([247, 245, 235], dtype=np.float32)
    abs_theta = np.abs(theta)  # shape (size,)
    t_start = np.pi * 0.38
    t_end = np.pi * 0.55
    weight = np.clip((t_end - abs_theta) / (t_end - t_start), 0.0, 1.0)
    weight = weight[None, :, None]
    blended = (
        sampled.astype(np.float32) * weight
        + glaze_color[None, None, :] * (1.0 - weight)
    ).clip(0, 255).astype(np.uint8)
    Image.fromarray(blended).save(output, format="JPEG", quality=95, subsampling=0)
    return output.getvalue(), size * size


def construct_mesh(radii_px, height_cm, width_cm):
    rings, sides = len(radii_px), 80
    real_height = height_cm / 100
    max_radius = width_cm / 200
    radii = radii_px / max(radii_px) * max_radius
    yvalues = np.linspace(0, real_height, rings)
    gradients = np.gradient(radii, yvalues)
    theta = np.linspace(-math.pi, math.pi, sides + 1)
    positions, normals, uv, indices = [], [], [], []
    for i, (y, radius) in enumerate(zip(yvalues, radii)):
        for j, angle in enumerate(theta):
            sine, cosine = math.sin(angle), math.cos(angle)
            positions.append((radius * sine, y, radius * cosine))
            normal = np.array([sine, -gradients[i], cosine])
            normal /= np.linalg.norm(normal)
            normals.append(normal.tolist())
            uv.append((j / sides, i / (rings - 1)))
    for i in range(rings - 1):
        for j in range(sides):
            a = i * (sides + 1) + j
            b = a + sides + 1
            indices += [a, a + 1, b, a + 1, b + 1, b]
    outer_count = len(positions)
    outer_indices = indices.copy()
    thickness = min(max_radius * 0.045, real_height * 0.025, float(radii.min()) * 0.25)
    inner_y = np.linspace(thickness, real_height, rings)
    inner_r = np.maximum(np.interp(inner_y, yvalues, radii) - thickness, thickness)
    inner_gradient = np.gradient(inner_r, inner_y)
    inner_start = len(positions)
    for i, (y, radius) in enumerate(zip(inner_y, inner_r)):
        for j, angle in enumerate(theta):
            sine, cosine = math.sin(angle), math.cos(angle)
            positions.append((radius * sine, y, radius * cosine))
            normal = np.array([-sine, inner_gradient[i], -cosine])
            normal /= np.linalg.norm(normal)
            normals.append(normal.tolist())
            uv.append((j / sides, 1.0))
    for i in range(rings - 1):
        for j in range(sides):
            a = inner_start + i * (sides + 1) + j
            b = a + sides + 1
            indices += [a, b, a + 1, a + 1, b, b + 1]
    rim = len(positions)
    for radius in (float(radii[-1]), float(inner_r[-1])):
        for j, angle in enumerate(theta):
            positions.append((radius * math.sin(angle), real_height, radius * math.cos(angle)))
            normals.append((0, 1, 0))
            uv.append((j / sides, 1.0))
    for j in range(sides):
        a = rim + j
        b = a + sides + 1
        indices += [a, a + 1, b, a + 1, b + 1, b]
    for y, radius, direction in (
        (0, float(radii[0]), -1),
        (thickness, float(inner_r[0]), 1),
    ):
        start = len(positions)
        for j, angle in enumerate(theta):
            positions.append((radius * math.sin(angle), y, radius * math.cos(angle)))
            normals.append((0, direction, 0))
            uv.append((0.5, 0))
        center = len(positions)
        positions.append((0, y, 0))
        normals.append((0, direction, 0))
        uv.append((0.5, 0))
        for j in range(sides):
            indices += (
                [center, start + j + 1, start + j]
                if direction < 0
                else [center, start + j, start + j + 1]
            )
    inner_rim_base_indices = indices[len(outer_indices):]
    base_positions = np.asarray(positions, dtype="<f4")
    base_normals = np.asarray(normals, dtype="<f4")
    base_uv = np.asarray(uv, dtype="<f4")
    return [
        (base_positions, base_normals, base_uv, np.asarray(inner_rim_base_indices, dtype="<u2")),
        (
            base_positions[:outer_count],
            base_normals[:outer_count],
            base_uv[:outer_count],
            np.asarray(outer_indices, dtype="<u2"),
        ),
    ]


def write_glb(path, parts, texture, height_cm, width_cm, back_texture="mirror"):
    blob, views, accessors = bytearray(), [], []

    def add_data(data, target=None):
        while len(blob) % 4:
            blob.append(0)
        offset = len(blob)
        blob.extend(data)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target:
            view["target"] = target
        views.append(view)
        return len(views) - 1

    def accessor(array, type_name, component, target):
        view = add_data(array.tobytes(), target)
        record = {
            "bufferView": view,
            "componentType": component,
            "count": len(array),
            "type": type_name,
        }
        if type_name == "VEC3":
            record.update(min=array.min(axis=0).tolist(), max=array.max(axis=0).tolist())
        accessors.append(record)
        return len(accessors) - 1

    primitives = []
    for material, (positions, normals, uv, indices) in enumerate(parts):
        position_accessor = accessor(positions, "VEC3", 5126, 34962)
        normal_accessor = accessor(normals, "VEC3", 5126, 34962)
        texture_accessor = accessor(uv, "VEC2", 5126, 34962)
        index_accessor = accessor(indices, "SCALAR", 5123, 34963)
        primitives.append(
            {
                "attributes": {
                    "POSITION": position_accessor,
                    "NORMAL": normal_accessor,
                    "TEXCOORD_0": texture_accessor,
                },
                "indices": index_accessor,
                "material": material,
                "mode": 4,
            }
        )
    image_view = add_data(texture)
    model = {
        "asset": {
            "version": "2.0",
            "generator": "CraftTrust ceramic-cpu 2.0",
            "extras": {
                "method": "rotational silhouette reconstruction",
                "unseenBack": f"{back_texture} (inferred)",
                "heightCm": height_cm,
                "widthCm": width_cm,
            },
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "SellerGeneratedCeramic"}],
        "meshes": [{"primitives": primitives}],
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": views,
        "accessors": accessors,
        "images": [
            {
                "bufferView": image_view,
                "mimeType": "image/jpeg" if texture[:2] == b"\xff\xd8" else "image/png",
            }
        ],
        "textures": [{"source": 0}],
        "materials": [
            {
                "name": "CeramicGlaze",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [0.97, 0.96, 0.92, 1],
                    "metallicFactor": 0,
                    "roughnessFactor": 0.25,
                },
                "doubleSided": True,
            },
            {
                "name": "PaintedPattern",
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 0},
                    "metallicFactor": 0,
                    "roughnessFactor": 0.45,
                },
                "alphaMode": "OPAQUE",
                "doubleSided": False,
            },
        ],
    }
    while len(blob) % 4:
        blob.append(0)
    model["buffers"][0]["byteLength"] = len(blob)
    encoded_model = json.dumps(model, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    encoded_model += b" " * ((4 - len(encoded_model) % 4) % 4)
    data = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(encoded_model) + 8 + len(blob))
    data += struct.pack("<I4s", len(encoded_model), b"JSON") + encoded_model
    data += struct.pack("<I4s", len(blob), b"BIN\x00") + blob
    Path(path).write_bytes(data)
    return len(data)


def run(source, output, height_cm, width_cm, shape_mode="photo", back_texture="mirror"):
    start = time.perf_counter()
    if shape_mode not in ("photo", "measured") or back_texture not in ("mirror", "plain"):
        raise ValueError("Chế độ dựng hình hoặc mặt sau không hợp lệ.")
    if not all(math.isfinite(value) and 3 <= value <= 250 for value in (height_cm, width_cm)):
        raise ValueError("Kích thước phải nằm trong khoảng 3–250 cm.")
    image = Image.open(source)
    image.verify()
    image = ImageOps.exif_transpose(Image.open(source))
    if max(image.size) > 3000:
        image.thumbnail((3000, 3000))
    rgb, mask = segment(image)
    cx, top, bottom, samples, radii = profile_from_mask(mask)
    photo_width_cm = height_cm * (2 * float(max(radii))) / (bottom - top)
    actual_width = photo_width_cm if shape_mode == "photo" else width_cm
    mesh = construct_mesh(radii, height_cm, actual_width)
    for texture_size in (768, 640, 512, 384):
        texture, paint_pixels = decoration_texture(
            rgb,
            mask,
            cx,
            samples,
            radii,
            top,
            bottom,
            size=texture_size,
            back_texture=back_texture,
        )
        asset_bytes = write_glb(output, mesh, texture, height_cm, actual_width, back_texture)
        if asset_bytes < MAX_BYTES:
            break
    report = {
        "engine": "ceramic-cpu",
        "engineVersion": 2,
        "method": "silhouette of rotationally symmetric pottery",
        "shapeMode": shape_mode,
        "backTexture": back_texture,
        "singleImageLimit": (
            "Back pattern is reflected from the visible front, not observed. Interior and wall thickness are inferred."
            if back_texture == "mirror"
            else "Back is an inferred plain glaze. Interior and wall thickness are inferred."
        ),
        "texturePaintPixels": paint_pixels,
        "assetBytes": asset_bytes,
        "under2MB": asset_bytes < MAX_BYTES,
        "textureSize": texture_size,
        "photoAspectRatio": photo_width_cm / height_cm,
        "generationMs": round((time.perf_counter() - start) * 1000),
        "triangles": sum(len(part[3]) // 3 for part in mesh),
        "modelMeasurements": {"heightCm": height_cm, "widthCm": actual_width},
        "inputMeasurements": {"heightCm": height_cm, "widthCm": width_cm},
        "warning": "Review outline and decoration before publishing. Use plain background or a transparent PNG for best results.",
    }
    Path(output).with_suffix(".json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False))
    if asset_bytes >= MAX_BYTES:
        raise ValueError(f"Model exceeds 2 MB: {asset_bytes} bytes")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--height-cm", type=float, required=True)
    parser.add_argument("--width-cm", type=float, required=True)
    parser.add_argument("--shape-mode", choices=["photo", "measured"], default="photo")
    parser.add_argument("--back-texture", choices=["mirror", "plain"], default="mirror")
    arguments = parser.parse_args()
    run(
        arguments.image,
        arguments.output,
        arguments.height_cm,
        arguments.width_cm,
        arguments.shape_mode,
        arguments.back_texture,
    )

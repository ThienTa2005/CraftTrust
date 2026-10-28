from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import cv2
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt
from scipy.spatial import ConvexHull, QhullError
import trimesh


CARDINAL_ANGLES = {
    "front": 0.0,
    "right": 90.0,
    "back": 180.0,
    "left": 270.0,
}


def _load_scene(source: Path | str | bytes | trimesh.Scene) -> trimesh.Scene:
    if isinstance(source, trimesh.Scene):
        return source
    return trimesh.load(
        trimesh.util.wrap_as_stream(source) if isinstance(source, bytes) else Path(source),
        file_type="glb",
        force="scene",
        process=False,
    )


def _texture_image(value: Any) -> Image.Image | None:
    if isinstance(value, Image.Image):
        return value
    wrapped = getattr(value, "_image", None)
    return wrapped if isinstance(wrapped, Image.Image) else None


def _base_color_factor(material: Any) -> np.ndarray:
    if material is None:
        return np.array([1.0, 1.0, 1.0], dtype=np.float64)
    raw_factor = getattr(material, "baseColorFactor", None)
    if raw_factor is None:
        return np.array([1.0, 1.0, 1.0], dtype=np.float64)
    try:
        factor = np.asarray(raw_factor, dtype=np.float64).reshape(-1)
        if len(factor) >= 3:
            factor = factor[:3]
        else:
            padded = np.ones(3, dtype=np.float64)
            padded[: len(factor)] = factor
            factor = padded
        if factor.max(initial=0.0) > 1.0:
            factor /= 255.0
        return factor
    except Exception:
        return np.array([1.0, 1.0, 1.0], dtype=np.float64)


def _vertex_colors(mesh: trimesh.Trimesh) -> np.ndarray:
    material = getattr(mesh.visual, "material", None)
    uv = getattr(mesh.visual, "uv", None)
    texture = _texture_image(getattr(material, "baseColorTexture", None)) if material else None
    if texture is not None and uv is not None and len(uv) == len(mesh.vertices):
        image = np.asarray(texture.convert("RGB"))
        height, width = image.shape[:2]
        coordinates = np.asarray(uv, dtype=np.float64)
        u = np.mod(coordinates[:, 0], 1.0)
        v = np.mod(coordinates[:, 1], 1.0)
        x = np.clip(np.rint(u * (width - 1)).astype(np.int64), 0, width - 1)
        y = np.clip(np.rint((1.0 - v) * (height - 1)).astype(np.int64), 0, height - 1)
        colors = image[y, x].astype(np.float64)
        colors *= _base_color_factor(material)
        return np.clip(colors, 0, 255).astype(np.uint8)
    color = np.asarray(getattr(material, "main_color", [180, 180, 180, 255]))[:3]
    return np.tile(color.astype(np.uint8), (len(mesh.vertices), 1))


def _face_texture_colors(mesh: trimesh.Trimesh) -> np.ndarray:
    material = getattr(mesh.visual, "material", None)
    uv = getattr(mesh.visual, "uv", None)
    texture = _texture_image(getattr(material, "baseColorTexture", None)) if material else None
    if texture is not None and uv is not None and len(uv) == len(mesh.vertices):
        image = np.asarray(texture.convert("RGB"))
        height, width = image.shape[:2]
        centroid_uv = np.asarray(uv, dtype=np.float64)[np.asarray(mesh.faces)].mean(axis=1)
        u = np.mod(centroid_uv[:, 0], 1.0)
        v = np.mod(centroid_uv[:, 1], 1.0)
        x = np.clip(np.rint(u * (width - 1)).astype(np.int64), 0, width - 1)
        y = np.clip(np.rint((1.0 - v) * (height - 1)).astype(np.int64), 0, height - 1)
        colors = image[y, x].astype(np.float64)
        colors *= _base_color_factor(material)
        return np.clip(colors, 0, 255).astype(np.uint8)
    color = np.asarray(getattr(material, "main_color", [180, 180, 180, 255]))[:3]
    return np.tile(color.astype(np.uint8), (len(mesh.faces), 1))


def _scene_arrays(scene: trimesh.Scene) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    vertices: list[np.ndarray] = []
    normals: list[np.ndarray] = []
    colors: list[np.ndarray] = []
    for node_name in scene.graph.nodes_geometry:
        transform, geometry_name = scene.graph[node_name]
        mesh = scene.geometry[geometry_name]
        vertices.append(trimesh.transform_points(np.asarray(mesh.vertices), transform))
        normal_transform = np.linalg.inv(transform[:3, :3]).T
        node_normals = np.asarray(mesh.vertex_normals) @ normal_transform.T
        node_normals /= np.maximum(np.linalg.norm(node_normals, axis=1, keepdims=True), 1e-12)
        normals.append(node_normals)
        colors.append(_vertex_colors(mesh))
    if not vertices:
        for mesh in scene.geometry.values():
            vertices.append(np.asarray(mesh.vertices))
            normals.append(np.asarray(mesh.vertex_normals))
            colors.append(_vertex_colors(mesh))
    return np.vstack(vertices), np.vstack(normals), np.vstack(colors)


def _rotation_y(angle_degrees: float) -> np.ndarray:
    angle = np.radians(angle_degrees)
    cosine, sine = np.cos(angle), np.sin(angle)
    return np.array(
        [[cosine, 0.0, sine], [0.0, 1.0, 0.0], [-sine, 0.0, cosine]],
        dtype=np.float64,
    )


def render_scene_cpu(
    source: Path | str | bytes | trimesh.Scene,
    angle_degrees: float = 0.0,
    resolution: int = 512,
    frame_bounds: tuple[float, float, float, float] | None = None,
) -> tuple[Image.Image, tuple[float, float, float, float]]:
    """Deterministic orthographic CPU render using UV-colored, z-buffered point splats."""
    scene = _load_scene(source)
    vertices, normals, colors = _scene_arrays(scene)
    rotation = _rotation_y(angle_degrees)
    vertices = vertices @ rotation.T
    normals = normals @ rotation.T

    if frame_bounds is None:
        x_min, x_max = float(vertices[:, 0].min()), float(vertices[:, 0].max())
        y_min, y_max = float(vertices[:, 1].min()), float(vertices[:, 1].max())
        width = max(x_max - x_min, 1e-12)
        height = max(y_max - y_min, 1e-12)
        margin = 0.06 * max(width, height)
        frame_bounds = (x_min - margin, x_max + margin, y_min - margin, y_max + margin)
    x_min, x_max, y_min, y_max = frame_bounds
    frame_width = max(x_max - x_min, 1e-12)
    frame_height = max(y_max - y_min, 1e-12)

    px = np.rint((vertices[:, 0] - x_min) / frame_width * (resolution - 1)).astype(np.int64)
    py = np.rint((y_max - vertices[:, 1]) / frame_height * (resolution - 1)).astype(np.int64)
    inside = (px >= 0) & (px < resolution) & (py >= 0) & (py < resolution)
    px, py = px[inside], py[inside]
    depth = vertices[inside, 2]
    colors = colors[inside].astype(np.float64)
    normals = normals[inside]

    light = np.array([0.25, 0.45, 1.0], dtype=np.float64)
    light /= np.linalg.norm(light)
    brightness = 0.72 + 0.28 * np.clip(normals @ light, 0.0, 1.0)
    lit_colors = np.clip(colors * brightness[:, None], 0, 255).astype(np.uint8)

    flat_pixels = py * resolution + px
    order = np.lexsort((-depth, flat_pixels))
    ordered_pixels = flat_pixels[order]
    _, first = np.unique(ordered_pixels, return_index=True)
    chosen = order[first]

    seed = np.zeros((resolution, resolution), dtype=bool)
    seed[py[chosen], px[chosen]] = True
    seed_rgb = np.zeros((resolution, resolution, 3), dtype=np.uint8)
    seed_rgb[py[chosen], px[chosen]] = lit_colors[chosen]

    mask_image = Image.new("L", (resolution, resolution), 0)
    try:
        hull = ConvexHull(np.column_stack((px, py)))
        polygon = [tuple(point) for point in np.column_stack((px, py))[hull.vertices]]
        ImageDraw.Draw(mask_image).polygon(polygon, fill=255)
    except QhullError:
        mask_image = Image.fromarray(seed.astype(np.uint8) * 255, mode="L")
    mask = np.asarray(mask_image) > 0

    if np.any(seed):
        _, nearest = distance_transform_edt(~seed, return_indices=True)
        filled = seed_rgb[nearest[0], nearest[1]]
    else:
        filled = seed_rgb
    rgba = np.zeros((resolution, resolution, 4), dtype=np.uint8)
    rgba[mask, :3] = filled[mask]
    rgba[mask, 3] = 255
    return Image.fromarray(rgba, mode="RGBA"), frame_bounds


def render_scene_triangles_cpu(
    source: Path | str | bytes | trimesh.Scene,
    angle_degrees: float = 0.0,
    resolution: int = 640,
    frame_bounds: tuple[float, float, float, float] | None = None,
) -> tuple[Image.Image, tuple[float, float, float, float]]:
    """Higher-fidelity deterministic CPU render for human comparison artifacts."""
    scene = _load_scene(source)
    rotation = _rotation_y(angle_degrees)
    vertices_parts: list[np.ndarray] = []
    face_color_parts: list[np.ndarray] = []
    faces_parts: list[np.ndarray] = []
    vertex_offset = 0
    for node_name in scene.graph.nodes_geometry:
        transform, geometry_name = scene.graph[node_name]
        mesh = scene.geometry[geometry_name]
        node_vertices = trimesh.transform_points(np.asarray(mesh.vertices), transform) @ rotation.T
        vertices_parts.append(node_vertices)
        face_color_parts.append(_face_texture_colors(mesh))
        faces_parts.append(np.asarray(mesh.faces) + vertex_offset)
        vertex_offset += len(node_vertices)
    if not vertices_parts:
        for mesh in scene.geometry.values():
            node_vertices = np.asarray(mesh.vertices) @ rotation.T
            vertices_parts.append(node_vertices)
            face_color_parts.append(_face_texture_colors(mesh))
            faces_parts.append(np.asarray(mesh.faces) + vertex_offset)
            vertex_offset += len(node_vertices)
    vertices = np.vstack(vertices_parts)
    base_face_colors = np.vstack(face_color_parts).astype(np.float64)
    faces = np.vstack(faces_parts)

    if frame_bounds is None:
        x_min, x_max = float(vertices[:, 0].min()), float(vertices[:, 0].max())
        y_min, y_max = float(vertices[:, 1].min()), float(vertices[:, 1].max())
        margin = 0.06 * max(x_max - x_min, y_max - y_min)
        frame_bounds = (x_min - margin, x_max + margin, y_min - margin, y_max + margin)
    x_min, x_max, y_min, y_max = frame_bounds
    frame_width = max(x_max - x_min, 1e-12)
    frame_height = max(y_max - y_min, 1e-12)
    px = (vertices[:, 0] - x_min) / frame_width * (resolution - 1)
    py = (y_max - vertices[:, 1]) / frame_height * (resolution - 1)

    v0, v1, v2 = vertices[faces[:, 0]], vertices[faces[:, 1]], vertices[faces[:, 2]]
    face_normals = np.cross(v1 - v0, v2 - v0)
    face_normals /= np.maximum(np.linalg.norm(face_normals, axis=1, keepdims=True), 1e-12)
    visible = face_normals[:, 2] > 0.0
    visible_faces = faces[visible]
    visible_normals = face_normals[visible]
    light = np.array([0.25, 0.45, 1.0], dtype=np.float64)
    light /= np.linalg.norm(light)
    brightness = 0.72 + 0.28 * np.clip(visible_normals @ light, 0.0, 1.0)
    face_colors = np.clip(
        base_face_colors[visible] * brightness[:, None],
        0,
        255,
    ).astype(np.uint8)
    depth = vertices[visible_faces, 2].mean(axis=1)
    order = np.argsort(depth)
    triangles = np.rint(
        np.stack(
            (
                np.column_stack((px[visible_faces[:, 0]], py[visible_faces[:, 0]])),
                np.column_stack((px[visible_faces[:, 1]], py[visible_faces[:, 1]])),
                np.column_stack((px[visible_faces[:, 2]], py[visible_faces[:, 2]])),
            ),
            axis=1,
        )
    ).astype(np.int32)

    canvas = np.full((resolution, resolution, 3), 242, dtype=np.uint8)
    for triangle, color in zip(triangles[order], face_colors[order]):
        cv2.fillConvexPoly(
            canvas,
            triangle,
            (int(color[0]), int(color[1]), int(color[2])),
            lineType=cv2.LINE_AA,
        )
    return Image.fromarray(canvas, mode="RGB"), frame_bounds


def compare_scene_renders(
    reference: Path | str | bytes | trimesh.Scene,
    candidate: Path | str | bytes | trimesh.Scene,
    resolution: int = 256,
    cached_reference_renders: dict[str, tuple[Image.Image, Any]] | None = None,
) -> dict[str, Any]:
    views: dict[str, Any] = {}
    for name, angle in CARDINAL_ANGLES.items():
        if cached_reference_renders is not None and name in cached_reference_renders:
            reference_image, bounds = cached_reference_renders[name]
        else:
            reference_image, bounds = render_scene_cpu(reference, angle, resolution)
            if cached_reference_renders is not None:
                cached_reference_renders[name] = (reference_image, bounds)
        candidate_image, _ = render_scene_cpu(candidate, angle, resolution, frame_bounds=bounds)
        reference_pixels = np.asarray(reference_image)
        candidate_pixels = np.asarray(candidate_image)
        reference_mask = reference_pixels[:, :, 3] > 0
        candidate_mask = candidate_pixels[:, :, 3] > 0
        intersection = reference_mask & candidate_mask
        union = reference_mask | candidate_mask
        mask_iou = float(np.count_nonzero(intersection) / max(1, np.count_nonzero(union)))
        if np.any(intersection):
            color_delta = np.abs(
                reference_pixels[intersection, :3].astype(np.int16)
                - candidate_pixels[intersection, :3].astype(np.int16)
            )
            mean_color_delta = float(np.mean(color_delta))
            p95_color_delta = float(np.percentile(color_delta, 95))
        else:
            mean_color_delta = 255.0
            p95_color_delta = 255.0
        views[name] = {
            "maskIoU": round(mask_iou, 6),
            "meanColorDelta": round(mean_color_delta, 4),
            "p95ColorDelta": round(p95_color_delta, 4),
        }
    min_iou = min(view["maskIoU"] for view in views.values())
    mean_color_delta = float(np.mean([view["meanColorDelta"] for view in views.values()]))
    passed = bool(min_iou >= 0.97 and mean_color_delta <= 18.0)
    return {
        "views": views,
        "minMaskIoU": round(min_iou, 6),
        "meanColorDelta": round(mean_color_delta, 4),
        "passed": passed,
        "thresholds": {"minMaskIoU": 0.97, "meanColorDeltaMax": 18.0},
    }


def save_cardinal_renders(
    source: Path | str | bytes | trimesh.Scene,
    output_dir: Path,
    resolution: int = 768,
) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, str] = {}
    for name, angle in CARDINAL_ANGLES.items():
        image, _ = render_scene_triangles_cpu(source, angle, resolution)
        target = output_dir / f"preview_{name}.png"
        image.save(target)
        results[name] = str(target)
    return results

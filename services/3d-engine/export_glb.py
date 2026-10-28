from __future__ import annotations

from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
import trimesh
import trimesh.transformations as tf

from software_render import render_scene_triangles_cpu, save_cardinal_renders


def _has_visible_content(png: bytes) -> bool:
    """Reject renderer success responses that contain only a blank canvas."""
    try:
        pixels = np.asarray(Image.open(BytesIO(png)).convert("RGB"), dtype=np.int16)
    except Exception:
        return False
    border = np.concatenate((pixels[0], pixels[-1], pixels[:, 0], pixels[:, -1]), axis=0)
    background = np.median(border, axis=0)
    distance = np.max(np.abs(pixels - background), axis=2)
    return bool(np.count_nonzero(distance > 8) >= pixels.shape[0] * pixels.shape[1] * 0.01)


def render_preview(glb_path: Path, preview_path: Path) -> bool:
    """Render a real mesh preview when the EGL/pyglet backend is available."""
    try:
        scene = trimesh.load(glb_path, force="scene", process=False)
        png = scene.save_image(resolution=(768, 768), visible=False)
        if png and _has_visible_content(png):
            preview_path.write_bytes(png)
            return preview_path.stat().st_size > 1000
    except Exception:
        pass
    try:
        image, _ = render_scene_triangles_cpu(glb_path, angle_degrees=0.0, resolution=768)
        image.save(preview_path)
        return _has_visible_content(preview_path.read_bytes())
    except Exception:
        return False


def render_cardinal_previews(glb_path: Path, output_dir: Path) -> dict[str, str]:
    """Render 4 cardinal views (front: 0°, right: 90°, back: 180°, left: 270°) of the 3D model."""
    output_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, str] = {}
    cardinal_angles = {
        "front": 0.0,
        "right": 90.0,
        "back": 180.0,
        "left": 270.0,
    }

    try:
        base_scene = trimesh.load(glb_path, force="scene", process=False)
    except Exception:
        return results

    for name, angle in cardinal_angles.items():
        try:
            scene_copy = base_scene.copy()
            if angle > 0.0:
                rot = tf.rotation_matrix(np.radians(angle), [0, 1, 0])
                scene_copy.apply_transform(rot)
            png = scene_copy.save_image(resolution=(768, 768), visible=False)
            if png and len(png) > 1000 and _has_visible_content(png):
                target = output_dir / f"preview_{name}.png"
                target.write_bytes(png)
                results[name] = str(target)
                if name == "front":
                    # Backward compatibility for single preview.png
                    (output_dir / "preview.png").write_bytes(png)
        except Exception:
            continue

    if len(results) < len(cardinal_angles):
        try:
            results = save_cardinal_renders(glb_path, output_dir, resolution=768)
            front = Path(results["front"])
            (output_dir / "preview.png").write_bytes(front.read_bytes())
        except Exception:
            pass

    return results

from __future__ import annotations

from pathlib import Path

import numpy as np
import trimesh
import trimesh.transformations as tf


def render_preview(glb_path: Path, preview_path: Path) -> bool:
    """Render a real mesh preview when the EGL/pyglet backend is available."""
    try:
        scene = trimesh.load(glb_path, force="scene", process=False)
        png = scene.save_image(resolution=(768, 768), visible=False)
        if not png:
            return False
        preview_path.write_bytes(png)
        return preview_path.stat().st_size > 1000
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
            if png and len(png) > 1000:
                target = output_dir / f"preview_{name}.png"
                target.write_bytes(png)
                results[name] = str(target)
                if name == "front":
                    # Backward compatibility for single preview.png
                    (output_dir / "preview.png").write_bytes(png)
        except Exception:
            continue

    return results

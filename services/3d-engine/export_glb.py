from __future__ import annotations

from pathlib import Path

import trimesh


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

from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image
import numpy as np
import pytest
import trimesh
from trimesh.exchange import gltf

ENGINE_DIR = Path(__file__).resolve().parent.parent
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

from optimize_glb import export_dual_glb, optimize_glb_for_web
from quality_check import inspect_glb


def test_optimize_glb_reduces_faces_and_preserves_uv_texture(tmp_path: Path):
    """Synthetic textured mesh decimation to 500 faces preserves UVs and texture."""
    sphere = trimesh.creation.icosphere(subdivisions=4)  # ~1280 faces
    uv = np.random.rand(len(sphere.vertices), 2)
    img = Image.new("RGBA", (128, 128), color=(100, 150, 200, 255))
    material = trimesh.visual.material.PBRMaterial(baseColorTexture=img)
    sphere.visual = trimesh.visual.TextureVisuals(uv=uv, material=material)

    scene = trimesh.Scene(sphere)
    master_bytes = gltf.export_glb(scene, extension_webp=True)

    master_path = tmp_path / "master_synth.glb"
    master_path.write_bytes(master_bytes)

    web_path = tmp_path / "web_synth.glb"
    web_bytes, metrics = optimize_glb_for_web(master_path, web_path, target_faces=300)

    assert metrics["master_face_count"] > 1000
    assert metrics["web_face_count"] <= 350
    assert metrics["web_has_uvs"] is True
    assert metrics["web_has_texture"] is True
    assert web_path.is_file()

    # Re-inspect web file
    inspection = inspect_glb(web_path)
    assert inspection["glbValid"] is True
    assert inspection["hasTexture"] is True
    assert inspection["hasUvs"] is True


def test_export_dual_glb_on_real_output(tmp_path: Path):
    """Test dual export workflow on real output artifact."""
    real_glb = Path(__file__).resolve().parent.parent.parent.parent / "test_results" / "output_test.glb"
    if not real_glb.is_file():
        pytest.skip("Real output_test.glb not available in test_results.")

    output_dir = tmp_path / "export_test"
    metrics = export_dual_glb(real_glb, output_dir, target_faces=200000, max_texture_dim=2048)

    assert Path(metrics["master_glb_path"]).is_file()
    assert Path(metrics["web_glb_path"]).is_file()
    assert metrics["master_file_size"] > 30 * 1024 * 1024
    assert metrics["web_file_size"] < 15 * 1024 * 1024
    assert metrics["size_reduction_percent"] > 50.0
    assert metrics["face_reduction_percent"] > 60.0
    assert metrics["web_has_texture"] is True
    assert metrics["web_has_uvs"] is True
    assert metrics["web_ready"] is True

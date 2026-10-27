from __future__ import annotations

import io
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

from quality_check import inspect_glb, validate_glb


def _create_sample_texture(format_name: str = "PNG") -> Image.Image:
    img = Image.new("RGBA", (64, 64), color=(200, 100, 50, 255))
    return img


def test_inspector_on_real_output_glb():
    """Verify inspection on real Pixal3D output artifact with embedded WebP textures."""
    real_glb = Path(__file__).resolve().parent.parent.parent.parent / "test_results" / "output_test.glb"
    if not real_glb.is_file():
        pytest.skip("Real output_test.glb not available in test_results.")

    result = inspect_glb(real_glb)
    assert result["glbValid"] is True
    assert result["hasUvs"] is True
    assert result["hasMaterial"] is True
    assert result["hasTexture"] is True
    assert "baseColorTexture" in result["textureSlots"]
    assert "WEBP" in result["embeddedTextureFormats"]
    assert "image/webp" in result["textureMimeTypes"]
    assert result["vertexCount"] > 100000
    assert result["faceCount"] > 100000


def test_inspector_embedded_webp_synthetic():
    """GLB with embedded WebP texture exported via EXT_texture_webp."""
    box = trimesh.creation.box()
    uv = np.array([
        [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0],
        [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0],
    ][:len(box.vertices)])

    tex = _create_sample_texture("WEBP")
    material = trimesh.visual.material.PBRMaterial(baseColorTexture=tex)
    box.visual = trimesh.visual.TextureVisuals(uv=uv, material=material)

    scene = trimesh.Scene(box)
    glb_data = gltf.export_glb(scene, extension_webp=True)

    result = inspect_glb(glb_data)
    assert result["glbValid"] is True
    assert result["hasUvs"] is True
    assert result["hasMaterial"] is True
    assert result["hasTexture"] is True
    assert "baseColorTexture" in result["textureSlots"]
    assert "WEBP" in result["embeddedTextureFormats"]
    assert "image/webp" in result["textureMimeTypes"]


def test_inspector_base_color_texture_png():
    """GLB with standard PNG baseColorTexture."""
    box = trimesh.creation.box()
    uv = np.random.rand(len(box.vertices), 2)
    tex = _create_sample_texture("PNG")
    material = trimesh.visual.material.PBRMaterial(baseColorTexture=tex)
    box.visual = trimesh.visual.TextureVisuals(uv=uv, material=material)

    scene = trimesh.Scene(box)
    glb_data = gltf.export_glb(scene)

    result = inspect_glb(glb_data)
    assert result["glbValid"] is True
    assert result["hasUvs"] is True
    assert result["hasMaterial"] is True
    assert result["hasTexture"] is True
    assert "baseColorTexture" in result["textureSlots"]
    assert "image/png" in result["textureMimeTypes"]


def test_inspector_uv_without_texture():
    """GLB with UV coordinates but no texture images or texture slots."""
    import struct
    import json
    box = trimesh.creation.box()
    uv = np.random.rand(len(box.vertices), 2)
    box.visual = trimesh.visual.TextureVisuals(uv=uv)
    scene = trimesh.Scene(box)
    raw = gltf.export_glb(scene)

    chunk0_len, _ = struct.unpack_from("<II", raw, 12)
    chunk0 = json.loads(raw[20 : 20 + chunk0_len].decode("utf-8"))
    chunk1 = raw[28 + chunk0_len :]

    # Strip texture images and slots
    chunk0.pop("images", None)
    chunk0.pop("textures", None)
    for mat in chunk0.get("materials", []):
        if "pbrMetallicRoughness" in mat:
            mat["pbrMetallicRoughness"].pop("baseColorTexture", None)
            mat["pbrMetallicRoughness"].pop("metallicRoughnessTexture", None)

    new_json_bytes = json.dumps(chunk0).encode("utf-8")
    pad = (4 - (len(new_json_bytes) % 4)) % 4
    new_json_bytes += b" " * pad
    new_chunk0_len = len(new_json_bytes)

    total_len = 12 + 8 + new_chunk0_len + 8 + len(chunk1)
    new_header = struct.pack("<4sII", b"glTF", 2, total_len)
    new_c0_header = struct.pack("<II", new_chunk0_len, 0x4E4F534A)
    new_c1_header = struct.pack("<II", len(chunk1), 0x004E4942)

    uv_only_glb = new_header + new_c0_header + new_json_bytes + new_c1_header + chunk1

    result = inspect_glb(uv_only_glb)
    assert result["hasUvs"] is True
    assert result["hasTexture"] is False
    assert result["textureSlots"] == []
    assert result["textureImageCount"] == 0


def test_inspector_material_without_texture_image():
    """GLB with PBR material (color factor) and UVs, but without any texture image map."""
    box = trimesh.creation.box()
    uv = np.random.rand(len(box.vertices), 2)
    # Material with only baseColorFactor, no image map
    material = trimesh.visual.material.PBRMaterial(baseColorFactor=[0.8, 0.2, 0.2, 1.0])
    box.visual = trimesh.visual.TextureVisuals(uv=uv, material=material)

    scene = trimesh.Scene(box)
    glb_data = gltf.export_glb(scene)

    result = inspect_glb(glb_data)
    assert result["hasUvs"] is True
    assert result["hasMaterial"] is True
    assert result["hasTexture"] is False
    assert result["textureImageCount"] == 0
    assert result["textureSlots"] == []
    assert any("UNTEXTURED" in adv for adv in result["advisories"])


def test_inspector_invalid_header_raises():
    """Corrupted header must raise ValueError."""
    with pytest.raises(ValueError, match="not a valid GLB binary"):
        inspect_glb(b"INVALID_HEADER_DATA_1234567890")

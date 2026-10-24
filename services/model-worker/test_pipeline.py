"""Comprehensive Unit and Integration Test for Hanoi CraftTrust 3D Pipeline."""

import json
import os
import struct
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from generate import run_pipeline
from ai_adapter import Hybrid3DManager


def create_synthetic_ceramic_photos():
    """Generates a realistic synthetic ceramic vase with decorative patterns for front and back testing."""
    h, w = 600, 400
    # Front photo
    front = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_front = ImageDraw.Draw(front)

    # Draw vase profile: base, belly, neck, flared lip
    points_front = [
        (140, 520),  # base left
        (120, 380),  # belly left
        (150, 220),  # shoulder left
        (170, 140),  # neck left
        (160, 90),   # lip left
        (240, 90),   # lip right
        (230, 140),  # neck right
        (250, 220),  # shoulder right
        (280, 380),  # belly right
        (260, 520),  # base right
    ]
    draw_front.polygon(points_front, fill=(240, 238, 230, 255))
    # Draw blue lotus decoration on front
    draw_front.ellipse([160, 280, 240, 380], fill=(28, 64, 140, 255))
    draw_front.ellipse([180, 300, 220, 360], fill=(240, 238, 230, 255))

    # Back photo (different pattern: bamboo scroll)
    back = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_back = ImageDraw.Draw(back)
    draw_back.polygon(points_front, fill=(240, 238, 230, 255))
    draw_back.rectangle([190, 250, 210, 420], fill=(28, 64, 140, 255))
    draw_back.rectangle([170, 320, 230, 335], fill=(28, 64, 140, 255))

    return front, back


def validate_glb_structure(glb_path: str):
    """Parses glTF binary file to verify valid 2.0 structure, JSON header, and PBR textures."""
    data = Path(glb_path).read_bytes()
    assert len(data) >= 20, "GLB file too small"
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF", f"Invalid magic header: {magic}"
    assert version == 2, f"Expected glTF 2.0, got version {version}"
    assert length == len(data), f"Length mismatch: header={length}, actual={len(data)}"

    # Read JSON chunk
    chunk_len, chunk_type = struct.unpack_from("<I4s", data, 12)
    assert chunk_type == b"JSON", f"Expected JSON chunk, got {chunk_type}"
    json_bytes = data[20 : 20 + chunk_len]
    gltf_json = json.loads(json_bytes.decode("utf-8").strip())

    # Verify PBR materials
    materials = gltf_json.get("materials", [])
    assert len(materials) >= 2, f"Expected at least 2 materials (interior + PBR outer), got {len(materials)}"

    outer_mat = next((m for m in materials if m.get("name") == "CeramicCraftPBR"), None)
    assert outer_mat is not None, "Missing CeramicCraftPBR material"
    pbr = outer_mat.get("pbrMetallicRoughness", {})
    assert "baseColorTexture" in pbr, "Missing baseColorTexture in PBR material"
    assert "metallicRoughnessTexture" in pbr, "Missing metallicRoughnessTexture in PBR material"
    assert "normalTexture" in outer_mat, "Missing normalTexture in PBR material"

    # Verify extras
    extras = gltf_json.get("asset", {}).get("extras", {})
    assert "silhouetteMatchScore" in extras, "Missing silhouetteMatchScore in glTF extras"
    assert "dimensionErrorPercent" in extras, "Missing dimensionErrorPercent in glTF extras"

    return gltf_json


def main():
    print("=== Testing Hanoi CraftTrust 3D Pipeline ===")

    # 1. Test AI Adapter Manager
    print("[1/4] Testing Hybrid3DManager...")
    mgr = Hybrid3DManager()
    hw = mgr.detect_hardware()
    print(f"      Hardware detected: {hw}")
    caps = mgr.list_engine_capabilities()
    assert len(caps) >= 3, "Catalog must list ceramic, multiview, and AI engines"
    resolved_engine, reason, conf = mgr.resolve_engine("ai", False)
    assert resolved_engine == "ceramic", f"Expected ceramic fallback, got {resolved_engine}"
    print(f"      Resolved engine fallback: {resolved_engine} (confidence: {conf})")

    # 2. Test Single-View Reconstruction Pipeline
    print("[2/4] Testing Single-View Pipeline...")
    with tempfile.TemporaryDirectory() as tmp_dir:
        front_img, back_img = create_synthetic_ceramic_photos()
        front_path = os.path.join(tmp_dir, "front.png")
        back_path = os.path.join(tmp_dir, "back.png")
        out_glb = os.path.join(tmp_dir, "model.glb")

        front_img.save(front_path)
        back_img.save(back_path)

        report_single = run_pipeline(
            front_path=front_path,
            output_path=out_glb,
            height_cm=28.0,
            width_cm=16.0,
            back_path=None,
            shape_mode="measured",
            back_texture="mirror",
            engine_request="auto",
        )

        assert os.path.exists(out_glb), "GLB output file was not created"
        assert report_single["assetBytes"] < 2_000_000, "Web GLB must be < 2MB"
        assert report_single["speculativeRegionPercent"] == 50.0, "Single view must flag 50% speculative region"
        assert report_single["silhouetteMatchScore"] > 0.80, f"Low IoU: {report_single['silhouetteMatchScore']}"
        validate_glb_structure(out_glb)
        print(f"      Single-view OK: {report_single['assetBytes']} bytes, IoU={report_single['silhouetteMatchScore']}")

        # 3. Test Multi-View Reconstruction Pipeline
        print("[3/4] Testing Multi-View Pipeline (Front + Back)...")
        out_multi = os.path.join(tmp_dir, "model_multi.glb")
        report_multi = run_pipeline(
            front_path=front_path,
            output_path=out_multi,
            height_cm=28.0,
            width_cm=16.0,
            back_path=back_path,
            shape_mode="measured",
            back_texture="mirror",
            engine_request="auto",
        )

        assert report_multi["hasBackPhoto"] is True, "Must register back photo"
        assert report_multi["speculativeRegionPercent"] == 0.0, "Multi-view speculative region must be 0%"
        assert report_multi["confidenceScore"] > report_single["confidenceScore"], "Multi-view must have higher confidence"
        validate_glb_structure(out_multi)
        print(f"      Multi-view OK: {report_multi['assetBytes']} bytes, Confidence={report_multi['confidenceScore']}")

        # 4. Test Master High-Res GLB
        print("[4/4] Validating Master High-Res GLB...")
        master_glb = os.path.join(tmp_dir, "model_multi-master.glb")
        assert os.path.exists(master_glb), "Master GLB file was not created"
        master_json = validate_glb_structure(master_glb)
        print(f"      Master GLB OK: {os.path.getsize(master_glb)} bytes")

    print("\n>>> ALL 3D PIPELINE TESTS PASSED SUCCESSFULLY! <<<")


if __name__ == "__main__":
    main()

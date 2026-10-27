from __future__ import annotations

import sys
import time
from pathlib import Path

import numpy as np
import pytest
import trimesh
from PIL import Image

sys.path.insert(0, str(Path(__file__).parents[1]))

from multiview import camera_to_world, write_transforms
from preprocess import validate_image
from quality_check import validate_glb
from security import sign_message, verify_message


def test_hmac_rejects_tampering_and_expiry():
    timestamp = str(int(time.time()))
    nonce = "11111111-1111-4111-8111-111111111111"
    body = '{"jobId":"22222222-2222-4222-8222-222222222222"}'
    signature = sign_message("secret", timestamp, nonce, body)
    assert verify_message("secret", timestamp, nonce, body, signature)
    assert not verify_message("secret", timestamp, nonce, body + " ", signature)
    assert not verify_message("secret", str(int(timestamp) - 301), nonce, body, signature)


def test_cardinal_camera_preset_and_front_order(tmp_path: Path):
    front = tmp_path / "front.png"
    right = tmp_path / "right.png"
    front.write_bytes(b"front")
    right.write_bytes(b"right")
    records = [
        {"path": right, "ordinal": 0, "direction": "RIGHT", "azimuth": 90},
        {"path": front, "ordinal": 1, "direction": "FRONT", "azimuth": 0},
    ]
    transforms = write_transforms(records, tmp_path)
    assert transforms.exists()
    assert records[1]["path"].name.startswith("view00_azim000")
    assert camera_to_world(0)[1][3] == pytest.approx(-3.1192)
    with pytest.raises(ValueError):
        write_transforms([
            {"path": tmp_path / "a.png", "ordinal": 0, "direction": "FRONT", "azimuth": 0},
            {"path": tmp_path / "b.png", "ordinal": 1, "direction": "CUSTOM", "azimuth": 45},
        ], tmp_path)


def test_real_image_and_glb_validation(tmp_path: Path):
    pixels = np.indices((512, 512)).sum(axis=0) % 2 * 255
    image = Image.fromarray(pixels.astype(np.uint8), mode="L").convert("RGB")
    image_path = tmp_path / "source.png"
    image.save(image_path)
    evidence = validate_image(image_path, "image/png", image_path.stat().st_size)
    assert evidence.width == 512
    glb_path = tmp_path / "box.glb"
    trimesh.creation.icosphere(subdivisions=2).export(glb_path)
    report = validate_glb(glb_path)
    assert report["glbValid"] is True
    assert report["faceCount"] >= 100

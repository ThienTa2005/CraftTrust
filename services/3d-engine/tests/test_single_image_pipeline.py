from __future__ import annotations

import ast
import json
import struct
import sys
from pathlib import Path

import numpy as np
import pytest
import trimesh
from PIL import Image

sys.path.insert(0, str(Path(__file__).parents[1]))

from test_single_image import (
    inspect_glb_artifacts,
    validate_local_input,
)


def create_test_image(
    path: Path,
    width: int = 512,
    height: int = 512,
    *,
    sharp: bool = True,
    fmt: str = "PNG",
) -> Path:
    if sharp:
        # High frequency pattern with high Laplacian variance (>18)
        pixels = np.indices((height, width)).sum(axis=0) % 2 * 255
    else:
        # Flat solid color (Laplacian variance == 0)
        pixels = np.full((height, width), 128, dtype=np.uint8)
    img = Image.fromarray(pixels.astype(np.uint8), mode="L").convert("RGB")
    img.save(path, format=fmt)
    return path


def test_validate_local_input_accepts_valid_image(tmp_path: Path):
    img_path = create_test_image(tmp_path / "valid.png", sharp=True, fmt="PNG")
    path, data, evidence = validate_local_input(img_path)
    assert path == img_path.resolve()
    assert len(data) == img_path.stat().st_size
    assert evidence["width"] == 512
    assert evidence["height"] == 512
    assert evidence["sharpness"] >= 18.0
    assert evidence["format"] == "PNG"


def test_validate_local_input_rejects_missing_file():
    with pytest.raises(FileNotFoundError, match="Source image file does not exist"):
        validate_local_input("non_existent_image_12345.png")


def test_validate_local_input_rejects_invalid_extension(tmp_path: Path):
    invalid_file = tmp_path / "test.gif"
    invalid_file.write_bytes(b"GIF89a" + b"\x00" * 200)
    with pytest.raises(ValueError, match="Unsupported image extension"):
        validate_local_input(invalid_file)


def test_validate_local_input_rejects_tiny_file(tmp_path: Path):
    tiny_file = tmp_path / "tiny.png"
    tiny_file.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50)
    with pytest.raises(ValueError, match="out of bounds"):
        validate_local_input(tiny_file)


def test_validate_local_input_rejects_oversized_file(tmp_path: Path, monkeypatch):
    import os

    oversized = tmp_path / "large.png"
    oversized.write_bytes(b"\x00" * 300)
    original_stat = Path.stat

    def fake_stat(self, *args, **kwargs):
        res = original_stat(self, *args, **kwargs)
        if self == oversized:
            return os.stat_result(
                (
                    res.st_mode,
                    res.st_ino,
                    res.st_dev,
                    res.st_nlink,
                    res.st_uid,
                    res.st_gid,
                    8_000_000,
                    res.st_atime,
                    res.st_mtime,
                    res.st_ctime,
                )
            )
        return res

    monkeypatch.setattr(Path, "stat", fake_stat)
    with pytest.raises(ValueError, match="out of bounds"):
        validate_local_input(oversized)


def test_validate_local_input_rejects_blurry_image(tmp_path: Path):
    blurry_file = create_test_image(tmp_path / "blurry.jpg", sharp=False, fmt="JPEG")
    with pytest.raises(ValueError, match="too blurred"):
        validate_local_input(blurry_file)


def test_inspect_glb_artifacts_validates_structure_and_reports_advisory(tmp_path: Path):
    glb_path = tmp_path / "model.glb"
    mesh = trimesh.creation.icosphere(subdivisions=2)
    mesh.export(glb_path)

    report = inspect_glb_artifacts(glb_path)
    assert report["glbValid"] is True
    assert report["assetBytes"] == glb_path.stat().st_size
    assert report["geometryCount"] == 1
    assert report["vertexCount"] >= 40
    assert report["faceCount"] >= 80
    assert "qualityAdvisory" in report
    assert report["qualityAdvisory"]["isWatertight"] is True
    assert report["qualityAdvisory"]["faceDensityCategory"] in ("low", "medium", "high")
    assert report["qualityAdvisory"]["fileSizeMb"] >= 0


def test_inspect_glb_artifacts_rejects_corrupted_header(tmp_path: Path):
    corrupt = tmp_path / "corrupt.glb"
    corrupt.write_bytes(b"NOT_A_GLB_FILE" + b"\x00" * 100)
    with pytest.raises(ValueError, match="missing 'glTF' header"):
        inspect_glb_artifacts(corrupt)


def test_inspect_glb_artifacts_rejects_length_mismatch(tmp_path: Path):
    mismatch = tmp_path / "mismatch.glb"
    header = b"glTF" + struct.pack("<II", 2, 500)
    mismatch.write_bytes(header + b"\x00" * 50)
    with pytest.raises(ValueError, match="does not match actual byte size"):
        inspect_glb_artifacts(mismatch)


def test_isolated_app_contract_and_single_bounded_container():
    script_path = Path(__file__).parents[1] / "test_single_image.py"
    source = script_path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename="test_single_image.py")

    # Assert app name is distinct from production
    assert 'APP_NAME = "crafttrust-pixal3d-test"' in source
    assert 'app = modal.App(APP_NAME)' in source

    # Assert no production storage or secrets are used
    assert "CraftTrustStorage" not in source
    assert "engine_secret" not in source
    assert "CRAFTTRUST_CALLBACK_URL" not in source
    assert "CallbackClient" not in source

    # Locate run_single_inference_test function
    fn = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name == "run_single_inference_test"
        ),
        None,
    )
    assert fn is not None, "run_single_inference_test function not found"

    # Inspect @app.function decorator
    dec_call = next(
        (
            dec
            for dec in fn.decorator_list
            if isinstance(dec, ast.Call)
            and isinstance(dec.func, ast.Attribute)
            and dec.func.attr == "function"
        ),
        None,
    )
    assert dec_call is not None, "@app.function decorator missing"

    kw_map = {kw.arg: kw.value for kw in dec_call.keywords if kw.arg is not None}
    assert isinstance(kw_map["gpu"], ast.Constant) and kw_map["gpu"].value == "L40S"
    assert isinstance(kw_map["min_containers"], ast.Constant) and kw_map["min_containers"].value == 0
    assert isinstance(kw_map["max_containers"], ast.Constant) and kw_map["max_containers"].value == 1
    assert isinstance(kw_map["retries"], ast.Constant) and kw_map["retries"].value == 0
    assert isinstance(kw_map["single_use_containers"], ast.Constant) and kw_map["single_use_containers"].value is True
    assert isinstance(kw_map["timeout"], ast.Constant) and kw_map["timeout"].value == 900

    # Assert dedicated test volume is mounted and committed
    assert "test_output_volume" in source
    assert 'crafttrust-pixal3d-test-outputs' in source
    assert "test_output_volume.commit()" in source


def test_postprocessing_dependencies_regression_guardrail():
    """Ensure GLB postprocessing libraries are importable and expose required methods."""
    import fast_simplification
    assert hasattr(fast_simplification, "simplify"), "Missing fast_simplification.simplify"
    assert hasattr(fast_simplification, "replay_simplification"), "Missing fast_simplification.replay_simplification"

    import optimize_glb
    assert hasattr(optimize_glb, "export_dual_glb")
    assert hasattr(optimize_glb, "optimize_glb_for_web")

    import export_glb
    assert hasattr(export_glb, "render_cardinal_previews")
    assert hasattr(export_glb, "render_preview")

    import quality_check
    assert hasattr(quality_check, "inspect_glb")

    import multiview
    assert hasattr(multiview, "write_transforms")
    assert hasattr(multiview, "compute_view_coverage_advisory")


def test_test_env_cpu_preflight_is_cpu_only():
    """Verify test_env_cpu_preflight exists in test_single_image.py and has no GPU allocated."""
    script_path = Path(__file__).parents[1] / "test_single_image.py"
    source = script_path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename="test_single_image.py")

    fn = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name == "test_env_cpu_preflight"
        ),
        None,
    )
    assert fn is not None, "test_env_cpu_preflight function not found"

    dec_call = next(
        (
            dec
            for dec in fn.decorator_list
            if isinstance(dec, ast.Call)
            and isinstance(dec.func, ast.Attribute)
            and dec.func.attr == "function"
        ),
        None,
    )
    assert dec_call is not None, "@app.function decorator missing on test_env_cpu_preflight"
    kw_map = {kw.arg: kw.value for kw in dec_call.keywords if kw.arg is not None}
    assert "gpu" not in kw_map, "test_env_cpu_preflight must be CPU-only and not define gpu="



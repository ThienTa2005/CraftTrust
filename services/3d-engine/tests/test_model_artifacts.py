from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[1]))
from model_artifacts import (
    resolve_moge_checkpoint,
    validate_pixal3d_snapshot,
    validate_transformers_snapshot,
)


def test_moge_resolves_model_file_not_snapshot_directory(tmp_path: Path):
    checkpoint = tmp_path / "model.pt"
    checkpoint.write_bytes(b"checkpoint")
    assert resolve_moge_checkpoint(tmp_path) == checkpoint
    checkpoint.unlink()
    with pytest.raises(RuntimeError, match="MOGE_CHECKPOINT_MISSING"):
        resolve_moge_checkpoint(tmp_path)


def test_transformers_snapshot_requires_config_weights_and_remote_code(tmp_path: Path):
    (tmp_path / "model.safetensors").write_bytes(b"weights")
    (tmp_path / "custom_model.py").write_text("class Model: pass\n", encoding="utf-8")
    (tmp_path / "config.json").write_text(json.dumps({
        "auto_map": {"AutoModelForImageSegmentation": "custom_model.Model"},
    }), encoding="utf-8")
    assert validate_transformers_snapshot(
        tmp_path, "BIREFNET", require_remote_code=True
    ) == tmp_path


def test_pixal_snapshot_requires_both_configs_and_local_model_paths(tmp_path: Path):
    (tmp_path / "weights.safetensors").write_bytes(b"weights")
    (tmp_path / "shape_model").mkdir()
    config = {"args": {"models": {"shape": "shape_model"}}}
    for filename in ("pipeline.json", "pipeline_mv.json"):
        (tmp_path / filename).write_text(json.dumps(config), encoding="utf-8")
    assert validate_pixal3d_snapshot(tmp_path) == tmp_path
    (tmp_path / "shape_model").rmdir()
    with pytest.raises(RuntimeError, match="PIXAL3D_MODEL_MISSING"):
        validate_pixal3d_snapshot(tmp_path)

"""Fail-closed validation for pinned model snapshots.

These checks run after ``snapshot_download`` and before any pipeline/model import.
They prevent upstream loaders from silently falling back to an unpinned Hub ID.
"""
from __future__ import annotations

import json
from pathlib import Path


WEIGHT_SUFFIXES = {".bin", ".pt", ".pth", ".safetensors"}


def _snapshot_root(path: Path, label: str) -> Path:
    root = Path(path)
    if not root.is_dir():
        raise RuntimeError(f"{label}_SNAPSHOT_MISSING: {root}")
    return root


def _require_weight(root: Path, label: str) -> None:
    if not any(path.is_file() and path.suffix in WEIGHT_SUFFIXES for path in root.rglob("*")):
        raise RuntimeError(f"{label}_WEIGHTS_MISSING: {root}")


def validate_transformers_snapshot(
    path: Path,
    label: str,
    *,
    require_remote_code: bool = False,
) -> Path:
    root = _snapshot_root(path, label)
    config_path = root / "config.json"
    if not config_path.is_file():
        raise RuntimeError(f"{label}_CONFIG_MISSING: {config_path}")
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"{label}_CONFIG_INVALID: {config_path}") from exc
    if require_remote_code:
        auto_map = config.get("auto_map")
        if not isinstance(auto_map, dict) or not auto_map:
            raise RuntimeError(f"{label}_REMOTE_CODE_MAP_MISSING: {config_path}")
        for reference in auto_map.values():
            references = reference if isinstance(reference, list) else [reference]
            for item in references:
                if not isinstance(item, str) or "." not in item:
                    raise RuntimeError(f"{label}_REMOTE_CODE_MAP_INVALID: {reference!r}")
                module_file = root / f"{item.rsplit('.', 1)[0]}.py"
                if not module_file.is_file():
                    raise RuntimeError(f"{label}_REMOTE_CODE_MISSING: {module_file}")
    _require_weight(root, label)
    return root


def resolve_moge_checkpoint(path: Path) -> Path:
    root = _snapshot_root(path, "MOGE")
    checkpoint = root / "model.pt"
    if not checkpoint.is_file():
        raise RuntimeError(f"MOGE_CHECKPOINT_MISSING: {checkpoint}")
    return checkpoint


def validate_pixal3d_snapshot(path: Path) -> Path:
    root = _snapshot_root(path, "PIXAL3D")
    for config_name in ("pipeline.json", "pipeline_mv.json"):
        config_path = root / config_name
        if not config_path.is_file():
            raise RuntimeError(f"PIXAL3D_CONFIG_MISSING: {config_path}")
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
            models = config["args"]["models"]
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError) as exc:
            raise RuntimeError(f"PIXAL3D_CONFIG_INVALID: {config_path}") from exc
        if not isinstance(models, dict) or not models:
            raise RuntimeError(f"PIXAL3D_MODELS_EMPTY: {config_path}")
        for model_name, relative in models.items():
            if not isinstance(relative, str):
                raise RuntimeError(f"PIXAL3D_MODEL_PATH_INVALID: {model_name}={relative!r}")
            relative_path = Path(relative)
            if relative_path.is_absolute() or ".." in relative_path.parts:
                raise RuntimeError(f"PIXAL3D_MODEL_PATH_UNSAFE: {model_name}={relative}")
            if not (root / relative_path).exists():
                raise RuntimeError(f"PIXAL3D_MODEL_MISSING: {model_name}={root / relative_path}")
    _require_weight(root, "PIXAL3D")
    return root

"""Fail-closed validation for pinned model snapshots.

These checks run after ``snapshot_download`` and before any pipeline/model import.
They validate the exact loader contract without reading multi-gigabyte tensor data.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Mapping


WEIGHT_SUFFIXES = {".bin", ".pt", ".pth", ".safetensors"}

# Hugging Face tree metadata at revision
# b0cb2e1b794cab9aa0ac38a95d794a4d9337437f. Values are byte sizes.
PIXAL3D_EXPECTED_SIZES = {
    "pipeline.json": 4_068,
    "pipeline_mv.json": 6_036,
    "ckpts/ss_dec_conv3d_16l8_fp16.json": 245,
    "ckpts/ss_dec_conv3d_16l8_fp16.safetensors": 147_591_972,
    "ckpts/ss_flow_img_dit_1_3B_64_bf16.json": 503,
    "ckpts/ss_flow_img_dit_1_3B_64_bf16.safetensors": 5_359_822_584,
    "ckpts/ss_flow_img_dit_1_3B_64_bf16_mv.json": 503,
    "ckpts/ss_flow_img_dit_1_3B_64_bf16_mv.safetensors": 5_359_822_584,
    "ckpts/shape_dec_next_dc_f16c32_fp16.json": 678,
    "ckpts/shape_dec_next_dc_f16c32_fp16.safetensors": 948_490_494,
    "ckpts/slat_flow_img2shape_dit_1_3B_512_bf16.json": 535,
    "ckpts/slat_flow_img2shape_dit_1_3B_512_bf16.safetensors": 5_546_764_048,
    "ckpts/slat_flow_img2shape_dit_1_3B_512_bf16_mv.json": 535,
    "ckpts/slat_flow_img2shape_dit_1_3B_512_bf16_mv.safetensors": 5_546_764_048,
    "ckpts/slat_flow_img2shape_dit_1_3B_1024_bf16.json": 535,
    "ckpts/slat_flow_img2shape_dit_1_3B_1024_bf16.safetensors": 5_546_764_048,
    "ckpts/slat_flow_img2shape_dit_1_3B_1024_bf16_mv.json": 535,
    "ckpts/slat_flow_img2shape_dit_1_3B_1024_bf16_mv.safetensors": 5_546_764_048,
    "ckpts/tex_dec_next_dc_f16c32_fp16.json": 705,
    "ckpts/tex_dec_next_dc_f16c32_fp16.safetensors": 948_458_812,
    "ckpts/slat_flow_imgshape2tex_dit_1_3B_1024_bf16.json": 535,
    "ckpts/slat_flow_imgshape2tex_dit_1_3B_1024_bf16.safetensors": 5_546_960_656,
    "ckpts/slat_flow_imgshape2tex_dit_1_3B_1024_bf16_mv.json": 535,
    "ckpts/slat_flow_imgshape2tex_dit_1_3B_1024_bf16_mv.safetensors": 5_546_960_656,
}

# Git LFS SHA-256 OIDs returned by the Hugging Face tree API for the exact
# Pixal3D revision above. Cached snapshots normally symlink to blobs named by
# this digest, so verification is metadata-only; a regular-file cache falls
# back to streaming SHA-256 without loading the checkpoint into RAM.
PIXAL3D_EXPECTED_SHA256 = {
    "ckpts/ss_dec_conv3d_16l8_fp16.safetensors":
        "1c76d4a40519aa2d711cc263a8404105231ac26db31d946bed48b84fee79009a",
    "ckpts/ss_flow_img_dit_1_3B_64_bf16.safetensors":
        "6d0147bb347eb61fa81c304cc68c7fd69d447e91870357a549b47e1d0fd77242",
    "ckpts/ss_flow_img_dit_1_3B_64_bf16_mv.safetensors":
        "e7ce63050e317cff70ed2c6dfcc549e668cd948c47347f31985fd4996b4ce5a6",
    "ckpts/shape_dec_next_dc_f16c32_fp16.safetensors":
        "e3b718d3e43e4f8780e9a24ac6fff231811a67e3b058e336e10fe654c911d581",
    "ckpts/slat_flow_img2shape_dit_1_3B_512_bf16.safetensors":
        "63569838c1da93f010e2fa805b202ecf802cc758830230abac202a81b70e5b45",
    "ckpts/slat_flow_img2shape_dit_1_3B_512_bf16_mv.safetensors":
        "043a0d7fc7ee81792fcb22f836c91f5aaf69f4fda15e25c38488db13dd7b77ec",
    "ckpts/slat_flow_img2shape_dit_1_3B_1024_bf16.safetensors":
        "3e6d1df0e62bc5bc863320d1d63d6b996235eef4abb8b851e878c88f316369f1",
    "ckpts/slat_flow_img2shape_dit_1_3B_1024_bf16_mv.safetensors":
        "37b75c8f0f089a7e3e825dec035ac83b9c989efd14d0c8ada6a620d2be561c71",
    "ckpts/tex_dec_next_dc_f16c32_fp16.safetensors":
        "97ea69addea2ecd9312910f5f548234665eef51c088386180b7cd5b258645e3c",
    "ckpts/slat_flow_imgshape2tex_dit_1_3B_1024_bf16.safetensors":
        "65df179ad02f9e92bc18335d7861fadd95f268e6249217352468dd83cb79d1d0",
    "ckpts/slat_flow_imgshape2tex_dit_1_3B_1024_bf16_mv.safetensors":
        "887fed6155fea44afbdab7130858984765d04a5b809b0993db0d3f0195060d86",
}

MOGE_EXPECTED_SIZE = 1_305_030_700
DINOV3_EXPECTED_SIZES = {
    "config.json": 745,
    "model.safetensors": 1_212_559_808,
}
BIREFNET_EXPECTED_SIZES = {
    "config.json": 405,
    "BiRefNet_config.py": 298,
    "birefnet.py": 91_896,
    "model.safetensors": 444_473_596,
}


def _snapshot_root(path: Path, label: str) -> Path:
    root = Path(path)
    if not root.is_dir():
        raise RuntimeError(f"{label}_SNAPSHOT_MISSING: {root}")
    return root


def _artifact_file(
    path: Path,
    label: str,
    *,
    expected_size: int | None = None,
    expected_sha256: str | None = None,
) -> tuple[Path, int]:
    is_symlink = path.is_symlink()
    if is_symlink:
        try:
            resolved = path.resolve(strict=True)
        except OSError:
            raise RuntimeError(f"{label}_BROKEN_SYMLINK: {path}") from None
    else:
        resolved = path
    if not resolved.is_file():
        raise RuntimeError(f"{label}_MISSING: {path}")
    try:
        size = resolved.stat().st_size
    except OSError:
        raise RuntimeError(f"{label}_UNREADABLE: {path}") from None
    if size <= 0:
        raise RuntimeError(f"{label}_EMPTY: {path}")
    if expected_size is not None and size != expected_size:
        raise RuntimeError(
            f"{label}_SIZE_MISMATCH: {path} expected={expected_size} actual={size}"
        )
    if expected_sha256 is not None:
        expected_sha256 = expected_sha256.lower()
        if is_symlink and resolved.name.lower() == expected_sha256:
            return resolved, size
        digest = hashlib.sha256()
        try:
            with resolved.open("rb") as stream:
                for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b""):
                    digest.update(chunk)
        except OSError:
            raise RuntimeError(f"{label}_UNREADABLE: {path}") from None
        actual_sha256 = digest.hexdigest()
        if actual_sha256 != expected_sha256:
            raise RuntimeError(
                f"{label}_CHECKSUM_MISMATCH: {path} "
                f"expected={expected_sha256} actual={actual_sha256}"
            )
    return resolved, size


def _json_file(path: Path, label: str, *, expected_size: int | None = None):
    resolved, _ = _artifact_file(path, label, expected_size=expected_size)
    try:
        return json.loads(resolved.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        raise RuntimeError(f"{label}_INVALID_JSON: {path}") from None


def _validate_safetensors(
    path: Path,
    label: str,
    *,
    expected_size: int | None = None,
    expected_sha256: str | None = None,
) -> None:
    resolved, _ = _artifact_file(
        path,
        label,
        expected_size=expected_size,
        expected_sha256=expected_sha256,
    )
    try:
        from importlib.metadata import version

        from packaging.version import Version
        from safetensors import SafetensorError, safe_open
    except ImportError:
        raise RuntimeError(f"{label}_SAFETENSORS_LIBRARY_MISSING") from None
    installed_version = version("safetensors")
    if Version(installed_version) < Version("0.7.0"):
        raise RuntimeError(
            f"{label}_SAFETENSORS_VERSION_UNSUPPORTED: "
            f"installed={installed_version} required>=0.7.0"
        )
    try:
        # safe_open memory-maps the file and validates the canonical Rust
        # format parser without materializing tensor payloads on CPU or GPU.
        with safe_open(str(resolved), framework="numpy", device="cpu") as archive:
            keys = list(archive.keys())
            archive.metadata()
            for key in keys:
                archive.get_slice(key).get_shape()
    except (SafetensorError, OSError, RuntimeError, ValueError):
        raise RuntimeError(f"{label}_INVALID_SAFETENSORS: {path}") from None
    if not keys:
        raise RuntimeError(f"{label}_INVALID_SAFETENSORS: {path}")


def _require_weights(
    root: Path,
    label: str,
    *,
    expected_sizes: Mapping[str, int] | None = None,
) -> None:
    if expected_sizes:
        weights = [root / relative for relative in expected_sizes if Path(relative).suffix in WEIGHT_SUFFIXES]
    else:
        weights = [path for path in root.rglob("*") if path.suffix in WEIGHT_SUFFIXES]
    if not weights:
        raise RuntimeError(f"{label}_WEIGHTS_MISSING: {root}")
    for weight in weights:
        relative = weight.relative_to(root).as_posix()
        expected_size = expected_sizes.get(relative) if expected_sizes else None
        if weight.suffix == ".safetensors":
            _validate_safetensors(weight, f"{label}_WEIGHT", expected_size=expected_size)
        else:
            _artifact_file(weight, f"{label}_WEIGHT", expected_size=expected_size)


def validate_transformers_snapshot(
    path: Path,
    label: str,
    *,
    require_remote_code: bool = False,
    expected_sizes: Mapping[str, int] | None = None,
) -> Path:
    root = _snapshot_root(path, label)
    config_path = root / "config.json"
    config = _json_file(
        config_path,
        f"{label}_CONFIG",
        expected_size=expected_sizes.get("config.json") if expected_sizes else None,
    )
    if not isinstance(config, dict):
        raise RuntimeError(f"{label}_CONFIG_INVALID: {config_path}")
    if require_remote_code:
        auto_map = config.get("auto_map")
        if not isinstance(auto_map, dict) or not auto_map:
            raise RuntimeError(f"{label}_REMOTE_CODE_MAP_MISSING: {config_path}")
        for reference in auto_map.values():
            references = reference if isinstance(reference, list) else [reference]
            for item in references:
                if not isinstance(item, str) or "." not in item:
                    raise RuntimeError(f"{label}_REMOTE_CODE_MAP_INVALID: {reference!r}")
                relative = f"{item.rsplit('.', 1)[0]}.py"
                _artifact_file(
                    root / relative,
                    f"{label}_REMOTE_CODE",
                    expected_size=expected_sizes.get(relative) if expected_sizes else None,
                )
    if expected_sizes:
        for relative, expected_size in expected_sizes.items():
            if Path(relative).suffix not in WEIGHT_SUFFIXES and relative != "config.json":
                _artifact_file(
                    root / relative,
                    f"{label}_ARTIFACT",
                    expected_size=expected_size,
                )
    _require_weights(root, label, expected_sizes=expected_sizes)
    return root


def resolve_moge_checkpoint(path: Path, *, expected_size: int = MOGE_EXPECTED_SIZE) -> Path:
    root = _snapshot_root(path, "MOGE")
    checkpoint = root / "model.pt"
    _artifact_file(checkpoint, "MOGE_CHECKPOINT", expected_size=expected_size)
    return checkpoint


def validate_pixal3d_snapshot(
    path: Path,
    *,
    expected_sizes: Mapping[str, int] = PIXAL3D_EXPECTED_SIZES,
    expected_sha256: Mapping[str, str] = PIXAL3D_EXPECTED_SHA256,
) -> Path:
    root = _snapshot_root(path, "PIXAL3D")
    referenced_artifacts: set[str] = set()
    for config_name in ("pipeline.json", "pipeline_mv.json"):
        config_path = root / config_name
        config = _json_file(
            config_path,
            "PIXAL3D_PIPELINE_CONFIG",
            expected_size=expected_sizes.get(config_name),
        )
        try:
            models = config["args"]["models"]
        except (KeyError, TypeError):
            raise RuntimeError(f"PIXAL3D_CONFIG_INVALID: {config_path}") from None
        if not isinstance(models, dict) or not models:
            raise RuntimeError(f"PIXAL3D_MODELS_EMPTY: {config_path}")
        for model_name, relative in models.items():
            if not isinstance(relative, str):
                raise RuntimeError(f"PIXAL3D_MODEL_PATH_INVALID: {model_name}={relative!r}")
            relative_path = Path(relative)
            if relative_path.is_absolute() or ".." in relative_path.parts or relative_path.suffix:
                raise RuntimeError(f"PIXAL3D_MODEL_PATH_UNSAFE: {model_name}={relative}")
            for suffix, kind in ((".json", "CONFIG"), (".safetensors", "WEIGHTS")):
                artifact_relative = f"{relative}{suffix}"
                if artifact_relative in referenced_artifacts:
                    continue
                expected_size = expected_sizes.get(artifact_relative)
                if expected_size is None:
                    raise RuntimeError(
                        f"PIXAL3D_PINNED_MANIFEST_MISSING: {model_name}={artifact_relative}"
                    )
                artifact = root / artifact_relative
                label = f"PIXAL3D_CHECKPOINT_{kind}"
                if suffix == ".json":
                    checkpoint_config = _json_file(
                        artifact,
                        label,
                        expected_size=expected_size,
                    )
                    if (
                        not isinstance(checkpoint_config, dict)
                        or not isinstance(checkpoint_config.get("name"), str)
                        or not isinstance(checkpoint_config.get("args"), dict)
                    ):
                        raise RuntimeError(f"{label}_INVALID: {artifact}")
                else:
                    checksum = expected_sha256.get(artifact_relative)
                    if checksum is None:
                        raise RuntimeError(
                            f"PIXAL3D_PINNED_CHECKSUM_MISSING: "
                            f"{model_name}={artifact_relative}"
                        )
                    _validate_safetensors(
                        artifact,
                        label,
                        expected_size=expected_size,
                        expected_sha256=checksum,
                    )
                referenced_artifacts.add(artifact_relative)

    expected_checkpoints = set(expected_sizes) - {"pipeline.json", "pipeline_mv.json"}
    if referenced_artifacts != expected_checkpoints:
        missing = sorted(expected_checkpoints - referenced_artifacts)
        unexpected = sorted(referenced_artifacts - expected_checkpoints)
        raise RuntimeError(
            f"PIXAL3D_PINNED_MANIFEST_DRIFT: missing={missing} unexpected={unexpected}"
        )
    expected_weights = {
        relative for relative in expected_checkpoints if relative.endswith(".safetensors")
    }
    if set(expected_sha256) != expected_weights:
        missing = sorted(expected_weights - set(expected_sha256))
        unexpected = sorted(set(expected_sha256) - expected_weights)
        raise RuntimeError(
            f"PIXAL3D_PINNED_CHECKSUM_DRIFT: missing={missing} unexpected={unexpected}"
        )
    return root

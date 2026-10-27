from __future__ import annotations

import hashlib
import json
import struct
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[1]))
from model_artifacts import (  # noqa: E402
    _validate_safetensors,
    resolve_moge_checkpoint,
    validate_pixal3d_snapshot,
    validate_transformers_snapshot,
)


DTYPE_BYTES = {"F32": 4, "BF16": 2, "C64": 8}


def write_safetensors(
    path: Path,
    *,
    tensors: dict[str, tuple[str, list[int]]] | None = None,
    metadata: dict[str, str] | None = None,
) -> None:
    tensors = tensors or {"weight": ("F32", [1])}
    header: dict[str, object] = {}
    if metadata is not None:
        header["__metadata__"] = metadata
    offset = 0
    for name, (dtype, shape) in tensors.items():
        elements = 1
        for dimension in shape:
            elements *= dimension
        end = offset + elements * DTYPE_BYTES[dtype]
        header[name] = {
            "dtype": dtype,
            "shape": shape,
            "data_offsets": [offset, end],
        }
        offset = end
    encoded = json.dumps(header, separators=(",", ":")).encode("utf-8")
    encoded += b" " * ((8 - len(encoded) % 8) % 8)
    with path.open("wb") as stream:
        stream.write(struct.pack("<Q", len(encoded)))
        stream.write(encoded)
        stream.truncate(8 + len(encoded) + offset)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def create_pixal_snapshot(root: Path) -> tuple[dict[str, int], dict[str, str]]:
    checkpoints = root / "ckpts"
    checkpoints.mkdir()
    basename = "ckpts/test_checkpoint"
    checkpoint_config = root / f"{basename}.json"
    checkpoint_config.write_text(
        json.dumps({"name": "FakeModel", "args": {}}),
        encoding="utf-8",
    )
    write_safetensors(root / f"{basename}.safetensors")
    pipeline = {"args": {"models": {"shape": basename}}}
    for filename in ("pipeline.json", "pipeline_mv.json"):
        (root / filename).write_text(json.dumps(pipeline), encoding="utf-8")
    sizes = {
        path.relative_to(root).as_posix(): path.stat().st_size
        for path in root.rglob("*")
        if path.is_file()
    }
    checksums = {
        path.relative_to(root).as_posix(): sha256(path)
        for path in root.rglob("*.safetensors")
    }
    return sizes, checksums


def test_moge_resolves_exact_model_file_and_size(tmp_path: Path):
    checkpoint = tmp_path / "model.pt"
    checkpoint.write_bytes(b"checkpoint")
    assert resolve_moge_checkpoint(tmp_path, expected_size=len(b"checkpoint")) == checkpoint
    checkpoint.unlink()
    with pytest.raises(RuntimeError, match="MOGE_CHECKPOINT_MISSING"):
        resolve_moge_checkpoint(tmp_path, expected_size=len(b"checkpoint"))


def test_transformers_snapshot_requires_config_weights_and_remote_code(tmp_path: Path):
    write_safetensors(tmp_path / "model.safetensors")
    (tmp_path / "custom_model.py").write_text("class Model: pass\n", encoding="utf-8")
    (tmp_path / "config.json").write_text(
        json.dumps({"auto_map": {"AutoModelForImageSegmentation": "custom_model.Model"}}),
        encoding="utf-8",
    )
    assert validate_transformers_snapshot(
        tmp_path, "BIREFNET", require_remote_code=True
    ) == tmp_path


def test_pixal_snapshot_accepts_checkpoint_basename_pair(tmp_path: Path):
    manifest, checksums = create_pixal_snapshot(tmp_path)
    assert validate_pixal3d_snapshot(
        tmp_path, expected_sizes=manifest, expected_sha256=checksums
    ) == tmp_path


def test_pixal_snapshot_rejects_missing_checkpoint_json(tmp_path: Path):
    manifest, checksums = create_pixal_snapshot(tmp_path)
    (tmp_path / "ckpts/test_checkpoint.json").unlink()
    with pytest.raises(RuntimeError, match="PIXAL3D_CHECKPOINT_CONFIG_MISSING"):
        validate_pixal3d_snapshot(
            tmp_path, expected_sizes=manifest, expected_sha256=checksums
        )


def test_pixal_snapshot_rejects_missing_checkpoint_safetensors(tmp_path: Path):
    manifest, checksums = create_pixal_snapshot(tmp_path)
    (tmp_path / "ckpts/test_checkpoint.safetensors").unlink()
    with pytest.raises(RuntimeError, match="PIXAL3D_CHECKPOINT_WEIGHTS_MISSING"):
        validate_pixal3d_snapshot(
            tmp_path, expected_sizes=manifest, expected_sha256=checksums
        )


def test_pixal_snapshot_rejects_broken_symlink(tmp_path: Path, monkeypatch):
    manifest, checksums = create_pixal_snapshot(tmp_path)
    broken = tmp_path / "ckpts/test_checkpoint.safetensors"
    original_is_symlink = Path.is_symlink
    original_resolve = Path.resolve

    def fake_is_symlink(path: Path) -> bool:
        return path == broken or original_is_symlink(path)

    def fake_resolve(path: Path, strict: bool = False) -> Path:
        if path == broken and strict:
            raise FileNotFoundError(path)
        return original_resolve(path, strict=strict)

    monkeypatch.setattr(Path, "is_symlink", fake_is_symlink)
    monkeypatch.setattr(Path, "resolve", fake_resolve)
    with pytest.raises(RuntimeError, match="PIXAL3D_CHECKPOINT_WEIGHTS_BROKEN_SYMLINK"):
        validate_pixal3d_snapshot(
            tmp_path, expected_sizes=manifest, expected_sha256=checksums
        )


def test_pixal_snapshot_rejects_invalid_checkpoint_config(tmp_path: Path):
    manifest, checksums = create_pixal_snapshot(tmp_path)
    config = tmp_path / "ckpts/test_checkpoint.json"
    config.write_text("{}", encoding="utf-8")
    manifest["ckpts/test_checkpoint.json"] = config.stat().st_size
    with pytest.raises(RuntimeError, match="PIXAL3D_CHECKPOINT_CONFIG_INVALID"):
        validate_pixal3d_snapshot(
            tmp_path, expected_sizes=manifest, expected_sha256=checksums
        )


def test_pixal_snapshot_rejects_truncated_safetensors(tmp_path: Path):
    manifest, checksums = create_pixal_snapshot(tmp_path)
    weights = tmp_path / "ckpts/test_checkpoint.safetensors"
    weights.write_bytes(weights.read_bytes()[:-1])
    manifest["ckpts/test_checkpoint.safetensors"] = weights.stat().st_size
    checksums["ckpts/test_checkpoint.safetensors"] = sha256(weights)
    with pytest.raises(RuntimeError, match="PIXAL3D_CHECKPOINT_WEIGHTS_INVALID_SAFETENSORS"):
        validate_pixal3d_snapshot(
            tmp_path, expected_sizes=manifest, expected_sha256=checksums
        )


def test_safetensors_accepts_large_bf16_c64_metadata_padding_and_offsets(
    tmp_path: Path,
):
    checkpoint = tmp_path / "mixed-large.safetensors"
    write_safetensors(
        checkpoint,
        tensors={
            "rope_phases": ("C64", [4096, 64]),
            "bf16_weights": ("BF16", [4096, 4096]),
        },
        metadata={"format": "pt", "source": "unit-test"},
    )
    _validate_safetensors(
        checkpoint,
        "TEST_WEIGHTS",
        expected_size=checkpoint.stat().st_size,
        expected_sha256=sha256(checkpoint),
    )


def test_safetensors_rejects_corrupt_header(tmp_path: Path):
    checkpoint = tmp_path / "corrupt-header.safetensors"
    write_safetensors(checkpoint)
    with checkpoint.open("r+b") as stream:
        stream.seek(8)
        stream.write(b"[")
    with pytest.raises(RuntimeError, match="TEST_WEIGHTS_INVALID_SAFETENSORS"):
        _validate_safetensors(
            checkpoint,
            "TEST_WEIGHTS",
            expected_size=checkpoint.stat().st_size,
            expected_sha256=sha256(checkpoint),
        )


def test_safetensors_rejects_invalid_offsets(tmp_path: Path):
    checkpoint = tmp_path / "invalid-offsets.safetensors"
    header = json.dumps(
        {"weight": {"dtype": "BF16", "shape": [2], "data_offsets": [0, 3]}},
        separators=(",", ":"),
    ).encode("utf-8")
    header += b" " * ((8 - len(header) % 8) % 8)
    checkpoint.write_bytes(struct.pack("<Q", len(header)) + header + b"\0" * 3)
    with pytest.raises(RuntimeError, match="TEST_WEIGHTS_INVALID_SAFETENSORS"):
        _validate_safetensors(
            checkpoint,
            "TEST_WEIGHTS",
            expected_size=checkpoint.stat().st_size,
            expected_sha256=sha256(checkpoint),
        )


def test_safetensors_rejects_non_string_metadata(tmp_path: Path):
    checkpoint = tmp_path / "invalid-metadata.safetensors"
    write_safetensors(checkpoint, metadata={"epoch": 1})  # type: ignore[dict-item]
    with pytest.raises(RuntimeError, match="TEST_WEIGHTS_INVALID_SAFETENSORS"):
        _validate_safetensors(
            checkpoint,
            "TEST_WEIGHTS",
            expected_size=checkpoint.stat().st_size,
            expected_sha256=sha256(checkpoint),
        )


def test_safetensors_rejects_wrong_expected_size(tmp_path: Path):
    checkpoint = tmp_path / "wrong-size.safetensors"
    write_safetensors(checkpoint)
    with pytest.raises(RuntimeError, match="TEST_WEIGHTS_SIZE_MISMATCH"):
        _validate_safetensors(
            checkpoint,
            "TEST_WEIGHTS",
            expected_size=checkpoint.stat().st_size + 1,
            expected_sha256=sha256(checkpoint),
        )


def test_safetensors_rejects_wrong_checksum(tmp_path: Path):
    checkpoint = tmp_path / "wrong-checksum.safetensors"
    write_safetensors(checkpoint)
    with pytest.raises(RuntimeError, match="TEST_WEIGHTS_CHECKSUM_MISMATCH"):
        _validate_safetensors(
            checkpoint,
            "TEST_WEIGHTS",
            expected_size=checkpoint.stat().st_size,
            expected_sha256="0" * 64,
        )


def test_safetensors_rejects_missing_library(tmp_path: Path, monkeypatch):
    checkpoint = tmp_path / "valid.safetensors"
    write_safetensors(checkpoint)
    monkeypatch.setitem(sys.modules, "safetensors", None)
    with pytest.raises(RuntimeError, match="TEST_WEIGHTS_SAFETENSORS_LIBRARY_MISSING"):
        _validate_safetensors(
            checkpoint,
            "TEST_WEIGHTS",
            expected_size=checkpoint.stat().st_size,
            expected_sha256=sha256(checkpoint),
        )


def test_safetensors_rejects_unsupported_version(tmp_path: Path, monkeypatch):
    checkpoint = tmp_path / "valid.safetensors"
    write_safetensors(checkpoint)
    import importlib.metadata

    original_version = importlib.metadata.version

    def fake_version(package_name: str) -> str:
        if package_name == "safetensors":
            return "0.6.0"
        return original_version(package_name)

    monkeypatch.setattr(importlib.metadata, "version", fake_version)
    with pytest.raises(RuntimeError, match="TEST_WEIGHTS_SAFETENSORS_VERSION_UNSUPPORTED"):
        _validate_safetensors(
            checkpoint,
            "TEST_WEIGHTS",
            expected_size=checkpoint.stat().st_size,
            expected_sha256=sha256(checkpoint),
        )

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
import sys

import pytest
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

sys.path.insert(0, str(Path(__file__).parents[1]))
import image_dependency_audit as audit


SATISFYING_VERSIONS = {
    "click": "8.3.1",
    "numpy": "2.2.6",
    "opencv-python-headless": "4.12.0.88",
    "scipy": "1.15.3",
    "pillow": "12.0.0",
    "matplotlib": "3.10.7",
    "trimesh": "4.10.1",
    "huggingface-hub": "0.36.0",
    "requests": "2.32.5",
    "tqdm": "4.67.1",
    "torch": "2.6.0+cu124",
    "torchvision": "0.21.0+cu124",
    "utils3d-moge": "1.7",
    "pipeline": "1.0.0",
    "flex-gemm": "1.0.0",
}


def _fake_version(name: str) -> str:
    canonical = canonicalize_name(name)
    if canonical in audit.INTENTIONALLY_OMITTED_MOGE_DISTRIBUTIONS:
        raise audit.metadata.PackageNotFoundError(name)
    return SATISFYING_VERSIONS[canonical]


def test_moge_requirement_policy_is_exact_and_transparent(monkeypatch):
    monkeypatch.setattr(audit.metadata, "requires", lambda name: list(audit.EXPECTED_MOGE_REQUIREMENTS))
    monkeypatch.setattr(audit.metadata, "version", _fake_version)
    resolutions = audit.verify_moge_requirements()
    assert any("gradio: intentionally omitted" in item for item in resolutions)
    assert any("starlette: intentionally omitted" in item for item in resolutions)
    assert any("trimesh: explicit Pixal3D 4.10.1 override" in item for item in resolutions)
    assert any("flex-gemm: source overridden" in item for item in resolutions)


def test_moge_requirement_drift_fails(monkeypatch):
    requirements = list(audit.EXPECTED_MOGE_REQUIREMENTS) + ["unexpected-package>=1"]
    monkeypatch.setattr(audit.metadata, "requires", lambda name: requirements)
    with pytest.raises(RuntimeError, match="Requires-Dist drifted"):
        audit.verify_moge_requirements()


def test_pip_check_requires_all_documented_conflicts_and_rejects_new_ones(monkeypatch):
    expected = [
        "moge 3.0.0 requires gradio, which is not installed.",
        "moge 3.0.0 requires starlette, which is not installed.",
        "moge 3.0.0 has requirement trimesh>=4.11, but you have trimesh 4.10.1.",
    ]
    monkeypatch.setattr(audit.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(
        stdout="\n".join(expected), stderr="", returncode=1,
    ))
    assert audit.verify_pip_check() == expected

    monkeypatch.setattr(audit.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(
        stdout="\n".join(expected + ["rogue 1.0 requires missing, which is not installed."]),
        stderr="", returncode=1,
    ))
    with pytest.raises(RuntimeError, match="Unexpected pip check result"):
        audit.verify_pip_check()

    monkeypatch.setattr(audit.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(
        stdout="\n".join(expected[:-1]), stderr="", returncode=1,
    ))
    with pytest.raises(RuntimeError, match="were not reported"):
        audit.verify_pip_check()

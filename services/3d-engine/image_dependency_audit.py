"""CPU-only verification for the immutable Modal GPU image.

This module deliberately inspects package metadata and module locations without
importing CUDA/Triton extensions. GPU imports belong to ``gpu_smoke_test``.
"""
from __future__ import annotations

import importlib.metadata as metadata
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name


EXPECTED_VERSIONS: dict[str, set[str]] = {
    "torch": {"2.6.0", "2.6.0+cu124"},
    "torchvision": {"0.21.0", "0.21.0+cu124"},
    "triton": {"3.2.0"},
    "nvdiffrast": {"0.4.0"},
    "nvdiffrec_render": {"0.0.0"},
    "cumesh": {"0.0.1"},
    "flex_gemm": {"1.0.0"},
    "o_voxel": {"0.0.1"},
    "natten": {"0.21.0"},
    "moge": {"3.0.0"},
    "utils3d_moge": {"1.7"},
    "pipeline": {"1.0.0"},
    "utils3d": {"0.0.2"},
    "diffusers": {"0.37.1"},
    "transformers": {"4.57.3"},
    "safetensors": {"0.7.0"},
    "huggingface-hub": {"0.36.0"},
    "trimesh": {"4.10.1"},
    "click": {"8.3.1"},
    "packaging": {"25.0"},
    "numpy": {"2.2.6"},
    "opencv-python-headless": {"4.12.0.88"},
    "scipy": {"1.15.3"},
    "pillow": {"12.0.0"},
    "matplotlib": {"3.10.7"},
    "requests": {"2.32.5"},
    "tqdm": {"4.67.1"},
    "fast-simplification": {"0.2.0"},
}

MODULES = (
    "torch",
    "torchvision",
    "triton",
    "nvdiffrast",
    "nvdiffrec_render",
    "cumesh",
    "flex_gemm",
    "o_voxel",
    "natten",
    "moge",
    "utils3d_moge",
    "utils3d",
    "diffusers",
    "transformers",
    "safetensors",
    "huggingface_hub",
    "fast_simplification",
)

EXPECTED_GIT_REVISIONS = {
    "moge": "74fbce054ebed49800de42d0ad0e83495065719a",
    "utils3d_moge": "62f09d58509485564e24d5d9f6aac9ee9ebc0c37",
    "pipeline": "1c511390d90226c00c101f34b84df26a0f8789b4",
}

EXPECTED_CHECKOUTS = {
    "/opt/TRELLIS.2": "75fbf0183001ed9876c8dbb35de6b68552ee08bd",
    "/opt/Pixal3D": "f7cf38429b0bd264f1995f0f8743a88b1c728b94",
    "/opt/NAF": "37f2dfc180f2de53d98bd601109c0da0dd6b0f43",
    "/tmp/nvdiffrast": "253ac4fcea7de5f396371124af597e6cc957bfae",
    "/tmp/nvdiffrec": "b296927cc7fd01c2ac1087c8065c4d7248f72da4",
    "/tmp/CuMesh": "12289e1062f0603f2f0d0771b02e1395d247f26f",
    "/tmp/FlexGEMM": "6dd94a859c26ee8246888502eada3dd8ad85532e",
}

EXPECTED_FILE_HASHES = {
    "/opt/NAF/naf_release.pth": "c096c1ab2217a5c3ac136365f721685e2201379cb69d509cfb0261183847c98f",
}

EXPECTED_MOGE_REQUIREMENTS = {
    "click>=8.3.1",
    "numpy>=2",
    "opencv-python-headless",
    "scipy>=1.8",
    "pillow",
    "matplotlib",
    "trimesh>=4.11",
    "huggingface-hub",
    "requests",
    "tqdm",
    "torch>=2.4",
    "torchvision>=0.19",
    "utils3d_moge @ git+https://github.com/EasternJournalist/utils3d-moge.git@62f09d58509485564e24d5d9f6aac9ee9ebc0c37",
    "pipeline @ git+https://github.com/EasternJournalist/pipeline.git@1c511390d90226c00c101f34b84df26a0f8789b4",
    "flex-gemm @ git+https://github.com/JeffreyXiang/FlexGEMM.git@b2fadb29d41846c7981ade6801ffc689fae119cf",
    "gradio>=6.0",
    "starlette",
}
INTENTIONALLY_OMITTED_MOGE_DISTRIBUTIONS = {"gradio", "starlette"}

# MoGe 3 metadata describes the complete MoGe 3 CLI/application while this
# image intentionally uses only moge.model.v2 for Pixal3D. Pixal3D itself pins
# trimesh 4.10.1. These exact upstream metadata conflicts are reported, never
# hidden by editing dist-info. Any other pip-check error fails the build.
EXPECTED_PIP_CHECK = {
    "moge-gradio-omitted": re.compile(
        r"^moge 3\.0\.0 requires gradio, which is not installed\.$", re.I
    ),
    "moge-starlette-omitted": re.compile(
        r"^moge 3\.0\.0 requires starlette, which is not installed\.$", re.I
    ),
    "moge-trimesh-pixal-pin": re.compile(
        r"^moge 3\.0\.0 has requirement trimesh>=4\.11, but you have trimesh 4\.10\.1\.$",
        re.I,
    ),
}


def _version(distribution: str) -> str:
    try:
        return metadata.version(distribution)
    except metadata.PackageNotFoundError as exc:
        raise RuntimeError(f"Missing distribution: {distribution}") from exc


def verify_versions() -> None:
    for distribution, expected in EXPECTED_VERSIONS.items():
        actual = _version(distribution)
        if actual not in expected:
            raise RuntimeError(
                f"Unexpected {distribution} version: {actual}; expected one of {sorted(expected)}"
            )


def _requirement_key(raw: str) -> tuple[str, str, str, str]:
    requirement = Requirement(raw)
    return (
        canonicalize_name(requirement.name),
        str(requirement.specifier),
        requirement.url or "",
        str(requirement.marker) if requirement.marker else "",
    )


def verify_moge_requirements() -> list[str]:
    raw_requirements = metadata.requires("moge") or []
    actual_core = {
        _requirement_key(raw)
        for raw in raw_requirements
        if "extra ==" not in (_requirement_key(raw)[3])
    }
    expected_core = {_requirement_key(raw) for raw in EXPECTED_MOGE_REQUIREMENTS}
    if actual_core != expected_core:
        missing = sorted(expected_core - actual_core)
        unexpected = sorted(actual_core - expected_core)
        raise RuntimeError(
            f"MoGe Requires-Dist drifted; missing={missing!r}; unexpected={unexpected!r}"
        )

    resolutions: list[str] = []
    for raw in sorted(EXPECTED_MOGE_REQUIREMENTS):
        requirement = Requirement(raw)
        name = canonicalize_name(requirement.name)
        if name in INTENTIONALLY_OMITTED_MOGE_DISTRIBUTIONS:
            try:
                installed = metadata.version(name)
            except metadata.PackageNotFoundError:
                resolutions.append(f"{name}: intentionally omitted (MoGe CLI/UI only)")
            else:
                raise RuntimeError(f"Unexpected {name} installation: {installed}")
            continue
        installed = _version(name)
        if name == "trimesh":
            if installed != "4.10.1" or requirement.specifier.contains(installed):
                raise RuntimeError(
                    f"MoGe/Pixal3D trimesh override changed: installed={installed}, requirement={raw}"
                )
            resolutions.append("trimesh: explicit Pixal3D 4.10.1 override of MoGe >=4.11")
            continue
        if name == "flex-gemm":
            expected_url = (
                "git+https://github.com/JeffreyXiang/FlexGEMM.git@"
                "b2fadb29d41846c7981ade6801ffc689fae119cf"
            )
            if requirement.url != expected_url or installed != "1.0.0":
                raise RuntimeError(f"Unexpected MoGe FlexGEMM requirement: {raw}; installed={installed}")
            resolutions.append(
                "flex-gemm: source overridden by pinned Pixal3D checkout 6dd94a8; GPU validation required"
            )
            continue
        if requirement.specifier and not requirement.specifier.contains(installed, prereleases=True):
            raise RuntimeError(f"Unsatisfied MoGe requirement: {raw}; installed={installed}")
        resolutions.append(f"{name}: satisfied by installed {installed}")
    return resolutions


def verify_module_discovery() -> None:
    for module in MODULES:
        if importlib.util.find_spec(module) is None:
            raise RuntimeError(f"Module is not discoverable without import: {module}")
    expected_files = (
        Path("/opt/Pixal3D/inference.py"),
        Path("/opt/Pixal3D/inference_mv.py"),
        Path("/opt/Pixal3D/pixal3d/pipelines/__init__.py"),
        Path("/opt/TRELLIS.2/o-voxel/pyproject.toml"),
    )
    missing = [str(path) for path in expected_files if not path.is_file()]
    if missing:
        raise RuntimeError(f"Missing pinned source files: {missing}")


def verify_direct_urls() -> None:
    for distribution, revision in EXPECTED_GIT_REVISIONS.items():
        raw = metadata.distribution(distribution).read_text("direct_url.json")
        if not raw:
            raise RuntimeError(f"Missing PEP 610 provenance for {distribution}")
        direct_url = json.loads(raw)
        vcs = direct_url.get("vcs_info", {})
        if vcs.get("commit_id") != revision or vcs.get("requested_revision") != revision:
            raise RuntimeError(
                f"Unexpected source revision for {distribution}: {vcs!r}; expected {revision}"
            )


def verify_git_checkouts() -> None:
    for repository, expected in EXPECTED_CHECKOUTS.items():
        result = subprocess.run(
            ["git", "-C", repository, "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
        actual = result.stdout.strip()
        if actual != expected:
            raise RuntimeError(f"Unexpected checkout at {repository}: {actual}; expected {expected}")


def verify_file_hashes() -> None:
    import hashlib

    for filename, expected in EXPECTED_FILE_HASHES.items():
        path = Path(filename)
        if not path.is_file():
            raise RuntimeError(f"Missing pinned artifact: {filename}")
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected:
            raise RuntimeError(f"Unexpected SHA-256 for {filename}: {actual}; expected {expected}")


def verify_pip_check() -> list[str]:
    result = subprocess.run(
        [sys.executable, "-m", "pip", "check"],
        check=False,
        capture_output=True,
        text=True,
    )
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    matched: set[str] = set()
    unexpected = []
    for line in lines:
        keys = [key for key, pattern in EXPECTED_PIP_CHECK.items() if pattern.fullmatch(line)]
        if len(keys) != 1:
            unexpected.append(line)
        else:
            matched.add(keys[0])
    if result.stderr.strip():
        unexpected.extend(line.strip() for line in result.stderr.splitlines() if line.strip())
    if unexpected:
        raise RuntimeError(f"Unexpected pip check result: {unexpected}")
    missing = set(EXPECTED_PIP_CHECK) - matched
    if missing:
        raise RuntimeError(f"Expected documented pip check conflicts were not reported: {sorted(missing)}")
    if result.returncode == 0:
        raise RuntimeError("pip check returned success despite expected documented conflicts")
    return lines


def verify_glb_postprocessing_modules() -> None:
    import fast_simplification
    if not hasattr(fast_simplification, "simplify"):
        raise RuntimeError("fast_simplification is missing 'simplify'")
    if not hasattr(fast_simplification, "replay_simplification"):
        raise RuntimeError("fast_simplification is missing 'replay_simplification'")


def main() -> None:
    verify_versions()
    resolutions = verify_moge_requirements()
    verify_module_discovery()
    verify_glb_postprocessing_modules()
    verify_direct_urls()
    verify_git_checkouts()
    verify_file_hashes()
    exceptions = verify_pip_check()
    for resolution in resolutions:
        print(f"MOGE REQUIREMENT POLICY: {resolution}")
    for line in exceptions:
        print(f"PIP CHECK VERIFIED UPSTREAM EXCEPTION: {line}")
    print(
        "=== MODAL PIXAL3D CPU-SAFE IMAGE VERIFICATION: "
        "SUCCESS_WITH_DOCUMENTED_MOGE_METADATA_EXCEPTIONS ==="
    )
    print("CUDA/Triton modules were discovered from metadata only and were not imported.")


if __name__ == "__main__":
    main()

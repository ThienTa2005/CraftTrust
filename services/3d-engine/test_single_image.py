"""Isolated Image-to-3D test script for CraftTrust Pixal3D on Modal L40S.

This script tests single-view Pixal3D inference on a real product image
without touching production flows, cron jobs, database, or Supabase storage.
"""
from __future__ import annotations

import json
import os
import struct
import sys
import tempfile
import time
import uuid
from pathlib import Path

import modal

ENGINE_DIR = Path(__file__).parent
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

from modal_app import (
    MODEL_CACHE,
    _download_pinned_model_snapshots,
    gpu_image,
    model_volume,
)

APP_NAME = "crafttrust-pixal3d-test"
app = modal.App(APP_NAME)

TEST_OUTPUT_MOUNT = "/test_outputs"
test_output_volume = modal.Volume.from_name(
    "crafttrust-pixal3d-test-outputs", create_if_missing=True
)


def validate_local_input(image_path: str | Path) -> tuple[Path, bytes, dict]:
    """Validate an input image locally before any cloud/GPU resource is touched."""
    path = Path(image_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Source image file does not exist: {path}")

    ext = path.suffix.lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp"}
    if ext not in allowed_exts:
        raise ValueError(
            f"Unsupported image extension '{ext}'. Must be one of: {', '.join(sorted(allowed_exts))}"
        )

    size = path.stat().st_size
    if size < 200 or size > 7_000_000:
        raise ValueError(
            f"Image size ({size} bytes) is out of bounds (allowed: 200 B to 7 MB)."
        )

    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    mime = mime_map[ext]

    from preprocess import validate_image

    evidence = validate_image(path, mime, size)
    return path, path.read_bytes(), evidence.as_dict()


def inspect_glb_artifacts(glb_path: Path) -> dict:
    """Validate structural GLB integrity and collect comprehensive quality metrics."""
    from quality_check import inspect_glb

    res = inspect_glb(glb_path)
    res["assetBytes"] = res["fileSizeBytes"]
    res["hasUvCoordinates"] = res["hasUvs"]
    res["hasEmbeddedTexture"] = res["hasTexture"]
    return res


@app.function(
    image=gpu_image,
    timeout=120,
    cpu=2,
    memory=4096,
    min_containers=0,
    max_containers=1,
    retries=0,
)
def test_env_cpu_preflight() -> dict:
    """CPU-only verification on the exact Modal image (0 GPU cost, fails fast before inference)."""
    import importlib.metadata as metadata

    import fast_simplification
    if not hasattr(fast_simplification, "simplify"):
        raise AttributeError("fast_simplification missing 'simplify'")
    if not hasattr(fast_simplification, "replay_simplification"):
        raise AttributeError("fast_simplification missing 'replay_simplification'")

    from optimize_glb import export_dual_glb, optimize_glb_for_web
    from export_glb import render_cardinal_previews, render_preview
    from quality_check import inspect_glb
    from multiview import write_transforms, compute_view_coverage_advisory
    from preprocess import validate_image

    return {
        "status": "PASS",
        "fastSimplificationVersion": metadata.version("fast-simplification"),
        "hasSimplify": hasattr(fast_simplification, "simplify"),
        "hasReplaySimplification": hasattr(fast_simplification, "replay_simplification"),
        "optimizeGlbLoaded": True,
        "exportDualGlbLoaded": True,
        "exportGlbLoaded": True,
        "qualityCheckLoaded": True,
        "multiviewLoaded": True,
        "preprocessLoaded": True,
        "gpuAllocated": False,
        "inferenceRun": False,
    }


@app.function(
    image=gpu_image,
    gpu="L40S",
    volumes={
        MODEL_CACHE: model_volume,
        TEST_OUTPUT_MOUNT: test_output_volume,
    },
    timeout=900,
    cpu=2,
    memory=32768,
    min_containers=0,
    max_containers=1,
    retries=0,
    single_use_containers=True,
)
def run_single_inference_test(
    image_bytes: bytes = b"",
    image_filename: str = "",
    resolution: int = 1024,
    multi_images: list[dict] | None = None,
) -> dict:
    """Isolated GPU worker: runs 1 to 4 image inference without external side effects."""
    from export_glb import render_cardinal_previews, render_preview
    from huggingface_hub import snapshot_download
    from multiview import (
        auto_assign_cardinal_roles,
        compute_view_coverage_advisory,
        resolve_generation_mode,
        write_transforms,
    )
    from optimize_glb import export_dual_glb
    from pixal3d_runner import Pixal3DRunner
    from preprocess import validate_image

    run_id = f"test_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    output_dir = Path(TEST_OUTPUT_MOUNT) / run_id
    output_dir.mkdir(parents=True, exist_ok=True)

    stage_timings: dict[str, int] = {}
    total_started = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix="crafttrust-test-") as temp_dir:
        work_dir = Path(temp_dir)
        records: list[dict] = []
        image_evidences: list[dict] = []

        # 1. Image preparation & validation phase
        val_started = time.perf_counter()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }

        if multi_images and len(multi_images) > 0:
            for item in multi_images:
                fn = item["filename"]
                b = item["bytes"]
                p = work_dir / fn
                p.write_bytes(b)
                m = mime_map.get(p.suffix.lower(), "image/jpeg")
                ev = validate_image(p, m, len(b))
                image_evidences.append({"ordinal": item["ordinal"], **ev.as_dict()})
                records.append({
                    "path": p,
                    "ordinal": item["ordinal"],
                    "direction": item["direction"],
                    "azimuth": item.get("azimuth", 0.0),
                })
            coverage_advisory = compute_view_coverage_advisory(records)
            mode = resolve_generation_mode(records)
        else:
            input_path = work_dir / image_filename
            input_path.write_bytes(image_bytes)
            ext = input_path.suffix.lower()
            mime = mime_map.get(ext, "image/jpeg")
            ev = validate_image(input_path, mime, len(image_bytes))
            image_evidences.append({"ordinal": 0, **ev.as_dict()})
            records.append({
                "path": input_path,
                "ordinal": 0,
                "direction": "FRONT",
                "azimuth": 0.0,
            })
            coverage_advisory = compute_view_coverage_advisory(records)
            mode = "single"

        stage_timings["validationMs"] = round((time.perf_counter() - val_started) * 1000)

        # 2. Model initialization phase
        init_started = time.perf_counter()
        local_model, moge_checkpoint, local_dino, local_birefnet = (
            _download_pinned_model_snapshots(snapshot_download)
        )
        runner = Pixal3DRunner(
            Path("/opt/Pixal3D"),
            local_model,
            moge_checkpoint=moge_checkpoint,
            dino_path=local_dino,
            birefnet_path=local_birefnet,
            low_vram=True,
        )

        if mode in ("two_view", "multiview") and len(records) >= 2:
            runner.load_multi()
        else:
            runner.load_single()
        stage_timings["modelInitMs"] = round((time.perf_counter() - init_started) * 1000)

        # 3. Pixal3D Inference phase
        raw_glb = work_dir / "raw_output.glb"
        if mode in ("two_view", "multiview") and len(records) >= 2:
            write_transforms(records, work_dir)
            inf_metrics = runner.run_multi(work_dir, raw_glb, resolution=resolution)
        else:
            front = next((r for r in records if r["direction"] == "FRONT"), records[0])
            inf_metrics = runner.run_single(front["path"], raw_glb, resolution=resolution)

        stage_timings["inferenceMs"] = inf_metrics["gpuRuntimeMs"]
        peak_vram_bytes = inf_metrics["peakVramBytes"]
        gpu_type = inf_metrics["gpuType"]

        # 4. Dual Export: Master and Web GLB
        exp_started = time.perf_counter()
        dual_metrics = export_dual_glb(raw_glb, work_dir, target_faces=200000, max_texture_dim=2048)
        master_glb = Path(dual_metrics["master_glb_path"])
        web_glb = Path(dual_metrics["web_glb_path"])

        temp_preview = work_dir / "preview.png"
        preview_rendered = render_preview(web_glb, temp_preview)

        temp_previews_dir = work_dir / "previews"
        cardinal_previews = render_cardinal_previews(web_glb, temp_previews_dir)
        if len(cardinal_previews) > 0:
            preview_rendered = True

        stage_timings["exportMs"] = round((time.perf_counter() - exp_started) * 1000)

        # 5. GLB Inspection phase
        insp_started = time.perf_counter()
        inspection = inspect_glb_artifacts(web_glb)
        master_inspection = inspect_glb_artifacts(master_glb)
        stage_timings["inspectionMs"] = round((time.perf_counter() - insp_started) * 1000)

        stage_timings["totalGpuMs"] = round((time.perf_counter() - total_started) * 1000)
        gpu_seconds = stage_timings["totalGpuMs"] / 1000.0
        # Modal L40S rate: $1.95/hr
        estimated_cost_usd = round(gpu_seconds * (1.95 / 3600.0), 4)

        if mode in ("two_view", "multiview") and coverage_advisory.get("back_supported"):
            back_quality_note = (
                "Mặt sau được dựng trực tiếp từ ảnh thật 180°, khắc phục hoa văn mờ nhạt "
                "và sai lệch hình học so với chế độ đơn ảnh."
            )
        else:
            back_quality_note = (
                "Mặt sau được mô hình AI suy đoán toán học từ ảnh mặt trước (không có ảnh thật hỗ trợ)."
            )

        # 6. Commit outputs to dedicated test volume
        master_glb_data = master_glb.read_bytes()
        web_glb_data = web_glb.read_bytes()

        perm_master_glb = output_dir / "output_test.glb"
        perm_master_glb.write_bytes(master_glb_data)

        perm_web_glb = output_dir / "web.glb"
        perm_web_glb.write_bytes(web_glb_data)

        preview_data = b""
        if preview_rendered and temp_preview.is_file():
            preview_data = temp_preview.read_bytes()
            perm_preview = output_dir / "preview.png"
            perm_preview.write_bytes(preview_data)

        cardinal_previews_data: dict[str, bytes] = {}
        for c_name, c_path in cardinal_previews.items():
            p_bytes = Path(c_path).read_bytes()
            (output_dir / Path(c_path).name).write_bytes(p_bytes)
            cardinal_previews_data[c_name] = p_bytes

        used_images_log = [
            {
                "ordinal": r.get("ordinal", idx),
                "filename": Path(r["path"]).name,
                "direction": r.get("direction", "FRONT"),
                "azimuth": r.get("azimuth", 0.0),
            }
            for idx, r in enumerate(records)
        ]

        metrics = {
            "status": "PASS",
            "runId": run_id,
            "engine": "pixal3d",
            "mode": mode,
            "gpuType": gpu_type,
            "peakVramBytes": peak_vram_bytes,
            "peakVramMb": round(peak_vram_bytes / (1024 * 1024), 2),
            "resolution": resolution,
            "timings": stage_timings,
            "gpuSeconds": round(gpu_seconds, 2),
            "estimatedCostUsd": estimated_cost_usd,
            "backSurfaceQualityNote": back_quality_note,
            "inputImagesUsed": used_images_log,
            "imageEvidence": image_evidences,
            "viewCoverage": coverage_advisory,
            "dualExport": dual_metrics,
            "inspection": inspection,
            "masterInspection": master_inspection,
            "cardinalPreviews": list(cardinal_previews.keys()),
            "previewRendered": preview_rendered,
            "volumePath": f"{TEST_OUTPUT_MOUNT}/{run_id}",
        }

        metrics_file = output_dir / "metrics.json"
        metrics_file.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

        test_output_volume.commit()

        return {
            "metrics": metrics,
            "glbBytes": master_glb_data,
            "webGlbBytes": web_glb_data,
            "previewBytes": preview_data,
            "cardinalPreviewsBytes": cardinal_previews_data,
        }


@app.local_entrypoint()
def main(
    image_path: str = "",
    image_paths: str = "",
    roles: str = "",
    output_dir: str = "test_results",
    resolution: int = 1024,
    check_deps: bool = False,
):
    """Local operator entrypoint supporting 1 to 4 product images on isolated Modal L40S."""
    from multiview import auto_assign_cardinal_roles, CARDINAL

    if check_deps:
        print("=" * 60)
        print("CraftTrust Pixal3D — CPU-Only Dependency Verification (0 GPU Cost)")
        print("=" * 60)
        print("[*] Invoking CPU-only preflight on exact Modal GPU image...")
        preflight_res = test_env_cpu_preflight.remote()
        print(json.dumps(preflight_res, indent=2, sort_keys=True))
        print("=" * 60)
        print(f"Status: {preflight_res.get('status')} | fast-simplification: {preflight_res.get('fastSimplificationVersion')}")
        print("All GLB postprocessing dependencies verified successfully on Modal image.")
        print("=" * 60)
        return

    print("=" * 60)
    print("CraftTrust Pixal3D — 1 to 4 Image 3D Pipeline Test (Modal L40S)")
    print("=" * 60)

    # 1. Parse image inputs
    raw_paths: list[str] = []
    if image_paths.strip():
        raw_paths = [p.strip() for p in image_paths.replace(";", ",").split(",") if p.strip()]
    elif image_path.strip():
        raw_paths = [image_path.strip()]
    else:
        raise ValueError("Must provide either --image-path or --image-paths, or use --check-deps.")

    if not 1 <= len(raw_paths) <= 4:
        raise ValueError(f"Number of input images ({len(raw_paths)}) must be between 1 and 4.")

    if roles.strip():
        assigned_roles = [r.strip().upper() for r in roles.replace(";", ",").split(",") if r.strip()]
        if len(assigned_roles) != len(raw_paths):
            raise ValueError(
                f"Number of declared roles ({len(assigned_roles)}) does not match image count ({len(raw_paths)})."
            )
        for r in assigned_roles:
            if r not in CARDINAL:
                raise ValueError(f"Invalid cardinal role '{r}'. Allowed: {list(CARDINAL.keys())}")
    else:
        assigned_roles = auto_assign_cardinal_roles(len(raw_paths))

    print(f"[*] Input images: {len(raw_paths)} image(s) | Assigned roles: {assigned_roles}")

    validated_images: list[dict] = []
    for idx, p_str in enumerate(raw_paths):
        resolved_path, b, evidence = validate_local_input(p_str)
        role = assigned_roles[idx]
        azimuth = CARDINAL[role]
        print(
            f"    [{idx+1}/{len(raw_paths)}] {resolved_path.name} -> {role} ({azimuth}°) | "
            f"{evidence['width']}x{evidence['height']} | {evidence['format']} | {len(b)} bytes"
        )
        validated_images.append({
            "filename": resolved_path.name,
            "bytes": b,
            "direction": role,
            "azimuth": azimuth,
            "ordinal": idx,
        })

    if resolution not in (1024, 1536):
        print(f"[!] Warning: resolution {resolution} not in (1024, 1536). Defaulting to 1024.")
        resolution = 1024

    # 2. Prepare Local Output Directory
    out_dir = Path(output_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    # 2.5 CPU-only Preflight Guardrail (fail-fast before GPU allocation)
    print("\n[*] Running CPU-only dependency preflight on Modal image...")
    preflight_res = test_env_cpu_preflight.remote()
    if preflight_res.get("status") != "PASS":
        raise RuntimeError(f"Dependency preflight failed: {preflight_res}")
    print(f"[*] Preflight PASS: fast-simplification {preflight_res.get('fastSimplificationVersion')}, all post-processing dependencies loaded.")

    # 3. Invoke Isolated Remote GPU Function
    print(f"\n[*] Invoking isolated L40S GPU container ({len(validated_images)} image(s))...")
    if len(validated_images) == 1:
        remote_result = run_single_inference_test.remote(
            image_bytes=validated_images[0]["bytes"],
            image_filename=validated_images[0]["filename"],
            resolution=resolution,
        )
    else:
        remote_result = run_single_inference_test.remote(
            resolution=resolution,
            multi_images=validated_images,
        )

    metrics = remote_result["metrics"]
    glb_bytes = remote_result["glbBytes"]
    web_glb_bytes = remote_result.get("webGlbBytes", b"")
    preview_bytes = remote_result.get("previewBytes", b"")
    cardinal_previews_bytes = remote_result.get("cardinalPreviewsBytes", {})

    # 4. Save Local Files
    local_master_glb = out_dir / "master.glb"
    local_master_glb.write_bytes(glb_bytes)

    local_legacy_glb = out_dir / "output_test.glb"
    local_legacy_glb.write_bytes(glb_bytes)

    local_web_glb = out_dir / "web.glb"
    if web_glb_bytes:
        local_web_glb.write_bytes(web_glb_bytes)

    local_preview = out_dir / "preview.png"
    if preview_bytes:
        local_preview.write_bytes(preview_bytes)

    saved_cardinals: list[str] = []
    for c_name, c_data in cardinal_previews_bytes.items():
        c_path = out_dir / f"preview_{c_name}.png"
        c_path.write_bytes(c_data)
        saved_cardinals.append(c_path.name)

    local_metrics = out_dir / "metrics.json"
    local_metrics.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    # 5. Report Results
    print("\n" + "=" * 60)
    print("TEST COMPLETED SUCCESSFULLY: PASS")
    print("=" * 60)
    print(f"Run ID:            {metrics['runId']}")
    print(f"Mode:              {metrics.get('mode', 'single')}")
    print(f"GPU Type:          {metrics['gpuType']}")
    print(f"Peak VRAM:         {metrics['peakVramMb']} MB")
    print(f"GPU Runtime:       {metrics.get('gpuSeconds', 0)}s ({metrics['timings'].get('totalGpuMs', 0)} ms)")
    print(f"Estimated Cost:    ${metrics.get('estimatedCostUsd', 0):.4f} USD (Modal L40S @ $1.95/hr)")
    print(f"Back Quality Note: {metrics.get('backSurfaceQualityNote', 'N/A')}")

    print("\nInput Images Verified and Used:")
    for img in metrics.get("inputImagesUsed", []):
        print(f"  - [{img.get('ordinal', 0)}] {img.get('filename')} -> {img.get('direction')} ({img.get('azimuth')}°)")

    cov = metrics.get("viewCoverage", {})
    if cov:
        print("\nView Coverage & Speculation Advisory:")
        print(f"  - Cardinal Views Supported: {cov.get('supported_cardinal_count', 1)}/4 ({cov.get('supported_views', [])})")
        print(f"  - Cardinal Coverage Ratio:  {cov.get('cardinal_coverage_ratio', 0.25)}")
        print(f"  - Formula:                  {cov.get('coverage_formula', 'N/A')}")
        print(f"  - Limitations:              {cov.get('coverage_limitations', 'N/A')}")
        print(f"  - Pose Warning:             {cov.get('pose_estimation_warning', 'N/A')}")

    dual = metrics.get("dualExport", {})
    if dual:
        print("\nDual GLB Export Comparison:")
        print(f"  - Master GLB:    {round(dual['master_file_size']/(1024*1024), 2)} MB | {dual['master_face_count']:,} faces")
        print(f"  - Web GLB:       {round(dual['web_file_size']/(1024*1024), 2)} MB | {dual['web_face_count']:,} faces")
        print(f"  - File Reduction: {dual['size_reduction_percent']}%")
        print(f"  - Face Reduction: {dual['face_reduction_percent']}%")
        print(f"  - Web Viewer Ready: {dual['web_ready']}")

    print("\nWeb GLB Inspection:")
    insp = metrics["inspection"]
    print(f"  - GLB Valid:     {insp['glbValid']}")
    print(f"  - Vertices:      {insp['vertexCount']:,}")
    print(f"  - Faces:         {insp['faceCount']:,}")
    print(f"  - Watertight:    {insp['watertight']}")
    print(f"  - Has UVs:       {insp['hasUvs']}")
    print(f"  - Has Texture:   {insp['hasTexture']}")
    print(f"  - Texture Slots: {', '.join(insp['textureSlots'])}")
    print(f"  - Texture Formats: {', '.join(insp['embeddedTextureFormats'])}")

    print("\nArtifacts Saved Locally:")
    print(f"  [1] Master GLB:      {local_master_glb}")
    print(f"  [2] Web GLB:         {local_web_glb}")
    if saved_cardinals:
        print(f"  [3] 4 Cardinal PNGs: {', '.join(saved_cardinals)}")
    elif preview_bytes:
        print(f"  [3] Preview:         {local_preview}")
    print(f"  [4] Metrics:         {local_metrics}")
    print(f"\nModal Volume Path:     {metrics['volumePath']}")
    print("=" * 60)

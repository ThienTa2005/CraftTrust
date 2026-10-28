from __future__ import annotations

import json
import math
import os
import shutil
import tempfile
import threading
import time
import uuid
from pathlib import Path

import httpx

from export_glb import render_preview
from multiview import (
    compute_view_coverage_advisory,
    resolve_generation_mode,
    write_transforms,
)
from optimize_glb import export_dual_glb
from preprocess import validate_image
from quality_check import inspect_glb, validate_glb
from security import canonical_json, sign_message, validate_callback_url
from storage_client import CraftTrustStorage

PIXAL3D_COMMIT = "f7cf38429b0bd264f1995f0f8743a88b1c728b94"
CHECKPOINT_REVISION = "b0cb2e1b794cab9aa0ac38a95d794a4d9337437f"


class CallbackClient:
    def __init__(self, url: str, secret: str):
        self.url = validate_callback_url(url)
        self.secret = secret

    def send(self, payload: dict) -> None:
        body = canonical_json(payload)
        timestamp = str(int(time.time()))
        nonce = str(uuid.uuid4())
        signature = sign_message(self.secret, timestamp, nonce, body)
        headers = {
            "content-type": "application/json",
            "x-crafttrust-timestamp": timestamp,
            "x-crafttrust-nonce": nonce,
            "x-crafttrust-signature": signature,
        }
        last_error = None
        for delay in (0, 1, 2):
            if delay:
                time.sleep(delay)
            try:
                timestamp = str(int(time.time()))
                nonce = str(uuid.uuid4())
                headers.update({
                    "x-crafttrust-timestamp": timestamp,
                    "x-crafttrust-nonce": nonce,
                    "x-crafttrust-signature": sign_message(self.secret, timestamp, nonce, body),
                })
                response = httpx.post(self.url, headers=headers, content=body, timeout=30)
                response.raise_for_status()
                return
            except Exception as exc:
                last_error = exc
        raise RuntimeError("CraftTrust callback failed after safe idempotent retries.") from last_error


def _extension(mime: str) -> str:
    return {"image/png": ".png", "image/webp": ".webp", "image/jpeg": ".jpg"}[mime]


def _error_code(exc: Exception) -> str:
    if hasattr(exc, "code") and isinstance(getattr(exc, "code"), str):
        return getattr(exc, "code")
    message = str(exc).lower()
    if "cuda" in message and ("memory" in message or "oom" in message):
        return "GPU_OOM"
    if "checkpoint" in message or "pretrained" in message or "hugging" in message:
        return "MODEL_WEIGHTS_UNAVAILABLE"
    if "preview" in message or "thumbnail" in message:
        return "PREVIEW_RENDER_FAILED"
    if "optimiz" in message or "decimat" in message or "simplify" in message:
        return "GLB_OPTIMIZATION_FAILED"
    if "upload" in message or "storage" in message or "supabase" in message:
        return "STORAGE_UPLOAD_FAILED"
    if "validat" in message or "corrupt" in message:
        return "VALIDATION_FAILED"
    if "callback" in message:
        return "CALLBACK_FAILED"
    if "image" in message or "source" in message or "view" in message:
        return "INVALID_INPUT"
    if "glb" in message or "geometry" in message:
        return "INVALID_OUTPUT"
    if isinstance(exc, (NameError, AttributeError, TypeError, KeyError)):
        return "WORKER_INTERNAL_ERROR"
    return "PIXAL3D_INFERENCE_FAILED"


class JobHandler:
    def __init__(self, load_runner, worker_id: str):
        self.load_runner = load_runner
        self.worker_id = worker_id
        self.storage = CraftTrustStorage.from_environment()
        self.callback = CallbackClient(os.environ["CRAFTTRUST_CALLBACK_URL"], os.environ["MODAL_3D_SHARED_SECRET"])
        self.gpu_usd_per_second = float(os.environ["MODAL_GPU_USD_PER_SECOND"])
        if not math.isfinite(self.gpu_usd_per_second) or self.gpu_usd_per_second <= 0:
            raise RuntimeError("MODAL_GPU_USD_PER_SECOND must be a positive reviewed price.")

    def _advance(self, job_id: str, status: str, step: str, progress: int) -> None:
        self.storage.rpc("advance_pixal3d_job", {
            "p_job_id": job_id, "p_worker_id": self.worker_id, "p_status": status,
            "p_step": step, "p_progress": progress,
        })

    def _heartbeat(self, job_id: str, stopped: threading.Event) -> None:
        while not stopped.wait(30):
            try:
                self.storage.rpc("heartbeat_pixal3d_job", {
                    "p_job_id": job_id, "p_worker_id": self.worker_id,
                })
            except Exception:
                # The main completion/failure callback remains authoritative.
                pass

    def process(self, job_id: str) -> dict:
        total_started = time.perf_counter()
        claimed = self.storage.rpc("claim_pixal3d_job", {"p_job_id": job_id, "p_worker_id": self.worker_id})
        if not claimed:
            return {"accepted": False, "reason": "job-not-claimable"}
        job = claimed[0]
        gpu_runtime_ms = 0
        actual_cost = 0.0
        uploaded: list[str] = []
        heartbeat_stop = threading.Event()
        heartbeat = threading.Thread(target=self._heartbeat, args=(job_id, heartbeat_stop), daemon=True)
        heartbeat.start()
        try:
            sources = job["input_manifest"]
            mode = job.get("mode") or resolve_generation_mode(sources)
            if mode not in ("single", "two_view", "multiview"):
                raise ValueError(f"Unsupported generation mode: {mode}")

            with tempfile.TemporaryDirectory(prefix="crafttrust-pixal3d-") as temp:
                directory = Path(temp)
                records = []
                image_evidence = []
                for source in sources:
                    target = directory / f"source-{source['ordinal']}{_extension(source['mimeType'])}"
                    self.storage.download_source(source["storagePath"], target)
                    evidence = validate_image(target, source["mimeType"], source["byteSize"])
                    image_evidence.append({"ordinal": source["ordinal"], **evidence.as_dict()})
                    records.append({
                        "path": target, "ordinal": source["ordinal"],
                        "direction": source["direction"], "azimuth": source["azimuth"],
                    })
                if not records:
                    raise ValueError("No source images are attached to this job.")

                coverage_advisory = compute_view_coverage_advisory(records)
                self._advance(job_id, "preprocessing", "preprocessing", 15)
                if mode in ("two_view", "multiview") and len(records) >= 2:
                    write_transforms(records, directory)

                self._advance(job_id, "running", "pixal3d_inference", 25)
                raw_output = directory / "raw_model.glb"
                print(json.dumps({
                    "event": "inference_start", "jobId": job_id, "engine": "pixal3d",
                    "engineCommit": PIXAL3D_COMMIT, "checkpointRevision": CHECKPOINT_REVISION,
                    "inputImageCount": len(records), "mode": mode, "resolution": job["resolution"],
                    "coverage": coverage_advisory,
                }))
                load_started = time.perf_counter()
                runner = self.load_runner()
                cold_start_ms = round((time.perf_counter() - load_started) * 1000)

                if mode in ("two_view", "multiview") and len(records) >= 2:
                    metrics = runner.run_multi(directory, raw_output, int(job["resolution"]))
                else:
                    front = next((item for item in records if item["direction"] == "FRONT"), None)
                    if not front:
                        raise ValueError("Single-view Pixal3D requires a FRONT image.")
                    metrics = runner.run_single(front["path"], raw_output, int(job["resolution"]))

                gpu_runtime_ms = round((time.perf_counter() - total_started) * 1000)
                actual_cost = round(gpu_runtime_ms / 1000 * self.gpu_usd_per_second, 4)

                # Phase: raw_glb_validation
                if not raw_output.is_file() or raw_output.stat().st_size < 1000:
                    raise ValueError("PIXAL3D raw model GLB is missing or empty.")
                print(json.dumps({
                    "event": "phase_complete", "phase": "raw_glb_validation", "jobId": job_id,
                    "rawGlbBytes": raw_output.stat().st_size,
                }))

                # Phase: master_preservation (preserve and upload Master GLB immediately)
                master_glb = directory / "master.glb"
                shutil.copyfile(raw_output, master_glb)
                base = f"{job['seller_id']}/{job['product_id']}/{job_id}"
                master_model_path = f"{base}/pixal3d_master.glb"
                self.storage.upload_model(master_model_path, master_glb, "model/gltf-binary")
                uploaded.append(master_model_path)
                print(json.dumps({
                    "event": "phase_complete", "phase": "master_preservation", "jobId": job_id,
                    "masterGlbBytes": master_glb.stat().st_size, "masterStoragePath": master_model_path,
                }))

                # Phase: optimization (Export Web GLB with safe decimation and fallback)
                self._advance(job_id, "exporting", "exporting_glb", 80)
                print(json.dumps({"event": "phase_start", "phase": "optimization", "jobId": job_id}))
                web_glb = directory / "web.glb"
                try:
                    dual_metrics = export_dual_glb(master_glb, directory, target_faces=350000, max_texture_dim=4096)
                    web_glb = Path(dual_metrics["web_glb_path"])
                except Exception as opt_err:
                    print(json.dumps({
                        "event": "optimization_warning", "jobId": job_id,
                        "message": f"Web GLB optimization fallback to Master GLB: {opt_err}",
                    }))
                    shutil.copyfile(master_glb, web_glb)
                    fallback_inspection = inspect_glb(web_glb)
                    dual_metrics = {
                        "master_file_size": master_glb.stat().st_size,
                        "web_file_size": web_glb.stat().st_size,
                        "master_face_count": fallback_inspection["faceCount"],
                        "web_face_count": fallback_inspection["faceCount"],
                        "web_has_texture": fallback_inspection["hasTexture"],
                        "web_has_uvs": fallback_inspection["hasUvs"],
                        "web_has_normals": fallback_inspection["hasNormals"],
                        "web_ready": False,
                        "quality_rejection_reasons": ["OPTIMIZATION_FAILED_FALLBACK_IS_NOT_WEB_READY"],
                        "web_fallback_to_master": True,
                        "optimization_error": str(opt_err),
                        "master_glb_path": str(master_glb),
                        "web_glb_path": str(web_glb),
                    }
                print(json.dumps({
                    "event": "phase_complete", "phase": "optimization", "jobId": job_id,
                    "webGlbBytes": web_glb.stat().st_size,
                }))

                # Phase: preview
                print(json.dumps({"event": "phase_start", "phase": "preview", "jobId": job_id}))
                preview = directory / "preview.png"
                try:
                    preview_created = render_preview(web_glb, preview)
                except Exception:
                    preview_created = False
                print(json.dumps({
                    "event": "phase_complete", "phase": "preview", "jobId": job_id,
                    "previewCreated": preview_created,
                }))

                self._advance(job_id, "validating_output", "validating_output", 90)
                structural = inspect_glb(web_glb)
                total_runtime_ms = round((time.perf_counter() - total_started) * 1000)
                report = {
                    "reportVersion": 5, "engine": "pixal3d", "engineCommit": PIXAL3D_COMMIT,
                    "checkpoint": "TencentARC/Pixal3D", "checkpointRevision": CHECKPOINT_REVISION,
                    "mode": mode, "resolution": job["resolution"], "lowVram": True,
                    **metrics, **structural, "inputImages": image_evidence,
                    "viewCoverage": coverage_advisory,
                    "dualExport": dual_metrics,
                    "cameraEvidence": "official MoGe-2 estimate" if mode == "single" else "calibrated cardinal preset (FRONT/BACK/LEFT/RIGHT)",
                    "previewRendered": preview_created, "requiresHumanReview": True,
                    "physicalAccuracy": None,
                    "publicationBlocked": not bool(dual_metrics.get("web_ready")) or not preview_created,
                    "reviewWarnings": [
                        (
                            "Hidden surfaces are inferred and are not geometrically verified."
                            if coverage_advisory["speculative_regions_percent"] > 0
                            else "All 4 cardinal angles grounded in photographic evidence."
                        ),
                        "Admin must compare the model against every source image before publication.",
                    ],
                    "gpuRuntimeMs": gpu_runtime_ms, "totalRuntimeMs": total_runtime_ms,
                    "modelLoadMs": cold_start_ms,
                    "estimatedGpuCostUsd": actual_cost,
                    "providerBilledCostUsd": None,
                    "costExcludes": ["container startup before handler", "CPU", "RAM", "storage", "egress", "image build", "container shutdown"],
                }

                web_model_path = f"{base}/pixal3d_web.glb"
                legacy_model_path = f"{base}/pixal3d.glb"

                self.storage.upload_model(web_model_path, web_glb, "model/gltf-binary")
                self.storage.upload_model(legacy_model_path, web_glb, "model/gltf-binary")
                uploaded.extend([web_model_path, legacy_model_path])

                preview_path = None
                if preview_created:
                    preview_path = f"{base}/preview.png"
                    self.storage.upload_model(preview_path, preview, "image/png")
                    uploaded.append(preview_path)
                gpu_runtime_ms = round((time.perf_counter() - total_started) * 1000)
                actual_cost = round(gpu_runtime_ms / 1000 * self.gpu_usd_per_second, 6)
                report.update(gpuRuntimeMs=gpu_runtime_ms, totalRuntimeMs=gpu_runtime_ms, estimatedGpuCostUsd=actual_cost)
                payload = {
                    "outcome": "completed", "jobId": job_id, "workerId": self.worker_id,
                    "storagePath": legacy_model_path, "masterStoragePath": master_model_path,
                    "webStoragePath": web_model_path,
                    "previewPath": preview_path,
                    "fileSize": web_glb.stat().st_size, "masterFileSize": master_glb.stat().st_size,
                    "gpuRuntimeMs": gpu_runtime_ms,
                    "totalRuntimeMs": gpu_runtime_ms, "actualCostUsd": actual_cost,
                    "gpuType": metrics["gpuType"], "qualityReport": report,
                }
                # Journal before callback. Once GLB exists, callback/storage
                # transport failures must NEVER turn a valid result into failed.
                try:
                    journal = directory / "result.json"
                    journal.write_text(canonical_json(payload), encoding="utf-8")
                    self.storage.upload_model(f"{base}/result.json", journal, "application/json")
                    self.storage.rpc("record_pixal3d_result", {
                        "p_job_id": job_id, "p_worker_id": self.worker_id, "p_payload": payload,
                    })
                    self.callback.send(payload)
                except Exception:
                    return {"accepted": True, "status": "reconciliation_required", "jobId": job_id}
                print(json.dumps({
                    "event": "inference_end", "jobId": job_id, "status": "needs_review",
                    "engine": "pixal3d", "gpuType": metrics["gpuType"],
                    "gpuRuntimeMs": gpu_runtime_ms, "output": "pixal3d.glb",
                    "glbBytes": web_glb.stat().st_size,
                    "masterBytes": master_glb.stat().st_size,
                }))
                return {"accepted": True, "status": "needs_review", "assetBytes": web_glb.stat().st_size}
        except Exception as exc:
            # A lost callback response may follow a committed completion. Keep
            # private artifacts for reconciliation instead of deleting live data.
            gpu_runtime_ms = round((time.perf_counter() - total_started) * 1000)
            actual_cost = round(gpu_runtime_ms / 1000 * self.gpu_usd_per_second, 6)
            code = _error_code(exc)
            payload = {
                "outcome": "failed", "jobId": job_id, "workerId": self.worker_id,
                "errorCode": code, "error": f"Generation failed ({code}): {str(exc)[:500]}",
                "gpuRuntimeMs": gpu_runtime_ms, "actualCostUsd": actual_cost,
            }
            try:
                self.storage.rpc("record_pixal3d_result", {
                    "p_job_id": job_id, "p_worker_id": self.worker_id, "p_payload": payload,
                })
                self.callback.send(payload)
            except Exception:
                return {"accepted": True, "status": "reconciliation_required", "jobId": job_id}
            print(json.dumps({
                "event": "inference_end", "jobId": job_id, "status": "failed",
                "errorCode": payload["errorCode"], "errorDetail": str(exc),
                "gpuRuntimeMs": gpu_runtime_ms
            }))
            return {"accepted": True, "status": "failed", "errorCode": payload["errorCode"]}
        finally:
            heartbeat_stop.set()
            heartbeat.join(timeout=2)

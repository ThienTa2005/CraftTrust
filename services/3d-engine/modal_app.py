from __future__ import annotations

import json
import asyncio
import os
import time
import uuid
from pathlib import Path

import modal

APP_NAME = "crafttrust-pixal3d"
PIXAL3D_COMMIT = "f7cf38429b0bd264f1995f0f8743a88b1c728b94"
TRELLIS_COMMIT = "75fbf0183001ed9876c8dbb35de6b68552ee08bd"
CHECKPOINT_REVISION = "b0cb2e1b794cab9aa0ac38a95d794a4d9337437f"
MOGE_MODEL_REVISION = "39c4d5e957afe587e04eec59dc2bcc3be5ecd968"
DINO_MODEL_REVISION = "3c276edd87d6f6e569ff0c4400e086807d0f3881"
BIREFNET_MODEL_REVISION = "e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4"
NAF_COMMIT = "37f2dfc180f2de53d98bd601109c0da0dd6b0f43"
NAF_CHECKPOINT_SHA256 = "c096c1ab2217a5c3ac136365f721685e2201379cb69d509cfb0261183847c98f"
ENGINE_DIR = Path(__file__).parent
MODEL_CACHE = "/cache"
REQUIRED_SUPABASE_RPCS = (
    "begin_pixal3d_dispatch",
    "mark_pixal3d_dispatched",
    "record_pixal3d_result",
    "apply_pixal3d_result",
    "reap_stale_pixal3d_jobs",
    "settle_pixal3d_call",
)
REQUIRED_SUPABASE_TABLES = ("model_dispatch_outbox", "model_jobs")

app = modal.App(APP_NAME)
model_volume = modal.Volume.from_name("crafttrust-pixal3d-models", create_if_missing=True)
engine_secret = modal.Secret.from_name("crafttrust-3d")

web_image = (
    modal.Image.debian_slim(python_version="3.10")
    .pip_install("fastapi==0.118.0", "httpx==0.28.1")
    .env({"PYTHONPATH": "/opt/crafttrust-engine"})
    .add_local_dir(ENGINE_DIR, remote_path="/opt/crafttrust-engine", copy=True,
                   ignore=lambda path: path.suffix != ".py" or any(part.startswith(".") or part == "__pycache__" for part in path.parts))
)

TRELLIS_BUILD_COMMAND = (
    "bash -e -c '"
    f"git clone https://github.com/microsoft/TRELLIS.2.git /opt/TRELLIS.2 && "
    f"cd /opt/TRELLIS.2 && "
    f"git checkout {TRELLIS_COMMIT} && "
    f"test \"$(git rev-parse HEAD)\" = \"{TRELLIS_COMMIT}\" && "
    "git submodule init o-voxel/third_party/eigen && "
    "CLONED=0; "
    "for delay in 2 4 8; do "
    "  echo \"Attempting to update TRELLIS.2 Eigen submodule from GitLab (backoff ${delay}s)...\"; "
    "  if git submodule update o-voxel/third_party/eigen; then "
    "    CLONED=1; "
    "    echo \"Successfully updated TRELLIS.2 Eigen from GitLab.\"; "
    "    break; "
    "  fi; "
    "  echo \"GitLab request failed, waiting ${delay}s...\"; "
    "  if [ ! -d \"o-voxel/third_party/eigen/.git\" ] && [ ! -f \"o-voxel/third_party/eigen/.git\" ]; then rm -rf o-voxel/third_party/eigen; fi; "
    "  sleep $delay; "
    "done; "
    "if [ $CLONED -eq 0 ]; then "
    "  echo \"GitLab unavailable under load. Verifying commit 21e4582d1739107337a03460c81412981130373e on googlesource mirror...\"; "
    "  TRELLIS_EIGEN_COMMIT=\"21e4582d1739107337a03460c81412981130373e\"; "
    "  if git fetch --depth 1 https://eigen.googlesource.com/mirror \"$TRELLIS_EIGEN_COMMIT\"; then "
    "    echo \"Verified commit $TRELLIS_EIGEN_COMMIT on googlesource mirror. Configuring Git URL rewrite...\"; "
    "    git config --global url.\"https://eigen.googlesource.com/mirror\".insteadOf \"https://gitlab.com/libeigen/eigen\"; "
    "    git submodule update o-voxel/third_party/eigen; "
    "  else "
    "    echo \"ERROR: Could not verify commit $TRELLIS_EIGEN_COMMIT on mirror.\"; "
    "    exit 1; "
    "  fi; "
    "fi; "
    "ACTUAL_COMMIT=$(git -C o-voxel/third_party/eigen rev-parse HEAD); "
    "EXPECTED_COMMIT=\"21e4582d1739107337a03460c81412981130373e\"; "
    "if [ \"$ACTUAL_COMMIT\" != \"$EXPECTED_COMMIT\" ]; then "
    "  echo \"ERROR: TRELLIS.2 Eigen commit mismatch! Expected $EXPECTED_COMMIT, got $ACTUAL_COMMIT\"; "
    "  exit 1; "
    "fi; "
    "echo \"TRELLIS.2 Eigen submodule verified at commit $ACTUAL_COMMIT\"'"
)

CUMESH_BUILD_COMMAND = (
    "bash -e -c '"
    "git clone https://github.com/JeffreyXiang/CuMesh.git /tmp/CuMesh && "
    "cd /tmp/CuMesh && "
    "git checkout 12289e1062f0603f2f0d0771b02e1395d247f26f && "
    "test \"$(git rev-parse HEAD)\" = \"12289e1062f0603f2f0d0771b02e1395d247f26f\" && "
    "git submodule update --init third_party/cubvh && "
    "cd third_party/cubvh && "
    "git submodule init third_party/eigen && "
    "CLONED=0; "
    "for delay in 2 4 8; do "
    "  echo \"Attempting to update Eigen submodule from GitLab (backoff ${delay}s)...\"; "
    "  if git submodule update third_party/eigen; then "
    "    CLONED=1; "
    "    echo \"Successfully updated Eigen from GitLab.\"; "
    "    break; "
    "  fi; "
    "  echo \"GitLab request failed, waiting ${delay}s...\"; "
    "  if [ ! -d \"third_party/eigen/.git\" ] && [ ! -f \"third_party/eigen/.git\" ]; then rm -rf third_party/eigen; fi; "
    "  sleep $delay; "
    "done; "
    "if [ $CLONED -eq 0 ]; then "
    "  echo \"GitLab unavailable under load. Verifying commit e63d9f6ccb7f6f29f31241b87c542f3f0ab3112b on googlesource mirror...\"; "
    "  EIGEN_COMMIT=\"e63d9f6ccb7f6f29f31241b87c542f3f0ab3112b\"; "
    "  if git fetch --depth 1 https://eigen.googlesource.com/mirror \"$EIGEN_COMMIT\"; then "
    "    echo \"Verified commit $EIGEN_COMMIT on googlesource mirror. Configuring Git URL rewrite...\"; "
    "    git config --global url.\"https://eigen.googlesource.com/mirror\".insteadOf \"https://gitlab.com/libeigen/eigen\"; "
    "    git submodule update third_party/eigen; "
    "  else "
    "    echo \"ERROR: Could not verify commit $EIGEN_COMMIT on mirror.\"; "
    "    exit 1; "
    "  fi; "
    "fi; "
    "ACTUAL_COMMIT=$(git -C third_party/eigen rev-parse HEAD); "
    "EXPECTED_COMMIT=\"e63d9f6ccb7f6f29f31241b87c542f3f0ab3112b\"; "
    "if [ \"$ACTUAL_COMMIT\" != \"$EXPECTED_COMMIT\" ]; then "
    "  echo \"ERROR: Eigen commit mismatch! Expected $EXPECTED_COMMIT, got $ACTUAL_COMMIT\"; "
    "  exit 1; "
    "fi; "
    "echo \"Eigen submodule verified at commit $ACTUAL_COMMIT\"; "
    "cd /tmp/CuMesh && python -m pip install . --no-build-isolation --no-deps'"
)

VERIFY_IMAGE_COMMAND = "python /opt/crafttrust-build/image_dependency_audit.py"

gpu_image = (
    modal.Image.from_registry("nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.10")
    .apt_install("git", "build-essential", "ninja-build", "libjpeg-dev", "libgl1", "libglib2.0-0", "clang", "cmake")
    .env({
        "CC": "gcc",
        "CXX": "g++",
        "MAX_JOBS": "4",
        "CUDA_HOME": "/usr/local/cuda",
        "TORCH_CUDA_ARCH_LIST": "8.9",
        "ATTN_BACKEND": "sdpa",
        "PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
        "HF_HOME": f"{MODEL_CACHE}/huggingface",
        "TORCH_HOME": f"{MODEL_CACHE}/torch",
        "PYTHONPATH": "/opt/TRELLIS.2:/opt/Pixal3D:/opt/crafttrust-engine",
    })
    .run_commands(
        "ln -sf /usr/bin/gcc /usr/local/bin/clang && ln -sf /usr/bin/g++ /usr/local/bin/clang++",
        "python -m pip install --upgrade pip==25.2 setuptools==80.9.0 wheel==0.45.1",
        "python -m pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124",
        TRELLIS_BUILD_COMMAND,
        f"git clone https://github.com/TencentARC/Pixal3D.git /opt/Pixal3D && cd /opt/Pixal3D && git checkout {PIXAL3D_COMMIT} && test \"$(git rev-parse HEAD)\" = \"{PIXAL3D_COMMIT}\"",
        f"git clone https://github.com/valeoai/NAF.git /opt/NAF && cd /opt/NAF && git checkout {NAF_COMMIT} && test \"$(git rev-parse HEAD)\" = \"{NAF_COMMIT}\"",
        "python -c \"import hashlib, pathlib, urllib.request; p=pathlib.Path('/opt/NAF/naf_release.pth'); urllib.request.urlretrieve('https://github.com/valeoai/NAF/releases/download/model/naf_release.pth', p); actual=hashlib.sha256(p.read_bytes()).hexdigest(); assert actual == '" + NAF_CHECKPOINT_SHA256 + "', f'NAF checkpoint SHA-256 mismatch: {actual}'\"",
        "python -m pip install pillow==12.0.0 imageio==2.37.2 imageio-ffmpeg==0.6.0 tqdm==4.67.1 easydict==1.13 opencv-python-headless==4.12.0.88 trimesh==4.10.1 transformers==4.57.3 zstandard==0.25.0 kornia==0.8.2 timm==1.0.22 diffusers==0.37.1 accelerate==1.13.0 plyfile==1.1.3 ninja==1.13.0 huggingface-hub==0.36.0 httpx==0.28.1 pyglet==1.5.31 einops==0.8.1 lpips==0.1.4 pandas==2.3.3 tensorboard==2.20.0 numpy==2.2.6 scipy==1.15.3 requests==2.32.5 moderngl==5.12.0 matplotlib==3.10.7 click==8.3.1 filelock==3.20.0 packaging==25.0",
        (
            "bash -e -c '"
            "export GIT_TERMINAL_PROMPT=0; "
            "for attempt in 1 2 3 4; do "
            "  echo \"Attempt $attempt installing MoGe from GitHub...\"; "
            "  if python -m pip install git+https://github.com/microsoft/MoGe.git@74fbce054ebed49800de42d0ad0e83495065719a --no-deps; then "
            "    echo \"MoGe installed successfully.\"; "
            "    exit 0; "
            "  fi; "
            "  echo \"MoGe install failed on attempt $attempt, waiting 3s...\"; "
            "  sleep 3; "
            "done; "
            "exit 1'"
        ),
        (
            "bash -e -c '"
            "export GIT_TERMINAL_PROMPT=0; "
            "for attempt in 1 2 3 4; do "
            "  echo \"Attempt $attempt installing utils3d-moge and pipeline from GitHub...\"; "
            "  if python -m pip install git+https://github.com/EasternJournalist/utils3d-moge.git@62f09d58509485564e24d5d9f6aac9ee9ebc0c37 git+https://github.com/EasternJournalist/pipeline.git@1c511390d90226c00c101f34b84df26a0f8789b4 --no-deps; then "
            "    echo \"utils3d-moge and pipeline installed successfully.\"; "
            "    exit 0; "
            "  fi; "
            "  echo \"Install failed on attempt $attempt, waiting 3s...\"; "
            "  sleep 3; "
            "done; "
            "exit 1'"
        ),
        "git clone https://github.com/NVlabs/nvdiffrast.git /tmp/nvdiffrast && cd /tmp/nvdiffrast && git checkout 253ac4fcea7de5f396371124af597e6cc957bfae && test \"$(git rev-parse HEAD)\" = \"253ac4fcea7de5f396371124af597e6cc957bfae\" && python -m pip install . --no-build-isolation --no-deps",
        "git clone https://github.com/JeffreyXiang/nvdiffrec.git /tmp/nvdiffrec && cd /tmp/nvdiffrec && git checkout b296927cc7fd01c2ac1087c8065c4d7248f72da4 && test \"$(git rev-parse HEAD)\" = \"b296927cc7fd01c2ac1087c8065c4d7248f72da4\" && python -m pip install . --no-build-isolation --no-deps",
        CUMESH_BUILD_COMMAND,
        "git clone https://github.com/JeffreyXiang/FlexGEMM.git /tmp/FlexGEMM && cd /tmp/FlexGEMM && git checkout 6dd94a859c26ee8246888502eada3dd8ad85532e && test \"$(git rev-parse HEAD)\" = \"6dd94a859c26ee8246888502eada3dd8ad85532e\" && git submodule update --init --recursive && python -m pip install . --no-build-isolation --no-deps",
        "cd /opt/TRELLIS.2/o-voxel && python -m pip install . --no-build-isolation --no-deps",
        "NATTEN_CUDA_ARCH=8.9 NATTEN_N_WORKERS=4 python -m pip install natten==0.21.0 --no-build-isolation --no-deps",
        "python -m pip install https://github.com/LDYang694/Storages/releases/download/20260430/utils3d-0.0.2-py3-none-any.whl --no-deps",
    )
    .add_local_file(
        ENGINE_DIR / "image_dependency_audit.py",
        remote_path="/opt/crafttrust-build/image_dependency_audit.py",
        copy=True,
    )
    .run_commands(VERIFY_IMAGE_COMMAND)
    .add_local_dir(ENGINE_DIR, remote_path="/opt/crafttrust-engine", copy=True,
                   ignore=lambda path: path.suffix != ".py" or any(part.startswith(".") or part == "__pycache__" for part in path.parts))
)


def _download_pinned_model_snapshots(snapshot_download):
    from model_artifacts import (
        resolve_moge_checkpoint,
        validate_pixal3d_snapshot,
        validate_transformers_snapshot,
    )

    local_model = validate_pixal3d_snapshot(Path(snapshot_download(
        repo_id="TencentARC/Pixal3D",
        revision=CHECKPOINT_REVISION,
        cache_dir=f"{MODEL_CACHE}/huggingface",
    )))
    moge_checkpoint = resolve_moge_checkpoint(Path(snapshot_download(
        repo_id="Ruicheng/moge-2-vitl",
        revision=MOGE_MODEL_REVISION,
        cache_dir=f"{MODEL_CACHE}/huggingface",
    )))
    local_dino = validate_transformers_snapshot(Path(snapshot_download(
        repo_id="camenduru/dinov3-vitl16-pretrain-lvd1689m",
        revision=DINO_MODEL_REVISION,
        cache_dir=f"{MODEL_CACHE}/huggingface",
    )), "DINOV3")
    local_birefnet = validate_transformers_snapshot(Path(snapshot_download(
        repo_id="ZhengPeng7/BiRefNet",
        revision=BIREFNET_MODEL_REVISION,
        cache_dir=f"{MODEL_CACHE}/huggingface",
    )), "BIREFNET", require_remote_code=True)
    return local_model, moge_checkpoint, local_dino, local_birefnet


@app.cls(
    image=gpu_image,
    gpu="L40S",
    secrets=[engine_secret],
    volumes={MODEL_CACHE: model_volume},
    timeout=1200,
    cpu=2,
    memory=32768,
    scaledown_window=2,
    single_use_containers=True,
    min_containers=0,
    max_containers=1,
    retries=0,
)
@modal.concurrent(max_inputs=1)
class Pixal3DWorker:
    def load(self):
        started = time.perf_counter()
        from huggingface_hub import snapshot_download
        from pixal3d_runner import Pixal3DRunner

        local_model, moge_checkpoint, local_dino, local_birefnet = (
            _download_pinned_model_snapshots(snapshot_download)
        )
        model_volume.commit()
        self.runner = Pixal3DRunner(
            Path("/opt/Pixal3D"), local_model,
            moge_checkpoint=moge_checkpoint,
            dino_path=local_dino,
            birefnet_path=local_birefnet,
            low_vram=True,
        )
        self.runner.load_single()
        self.cold_start_ms = round((time.perf_counter() - started) * 1000)
        print(json.dumps({
            "event": "model_loaded", "engine": "pixal3d", "engineCommit": PIXAL3D_COMMIT,
            "checkpointRevision": CHECKPOINT_REVISION, "coldStartMs": self.cold_start_ms,
        }))

    @modal.method()
    def process(self, job_id: str, token: str):
        from job_handler import JobHandler

        def load_runner():
            self.load()
            return self.runner
        # Claim and start heartbeat BEFORE model loading; startup failures are
        # now associated with a job. Duplicate tokens never load the model.
        return JobHandler(load_runner, token).process(job_id)


@app.function(image=web_image, secrets=[engine_secret], timeout=60)
@modal.asgi_app()
def api():
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    from security import verify_message
    from storage_client import CraftTrustStorage

    web = FastAPI(title="CraftTrust Pixal3D Dispatcher")

    @web.get("/health")
    async def health():
        return {"ok": True, "engine": "pixal3d", "engineCommit": PIXAL3D_COMMIT}

    @web.post("/submit")
    async def submit(request: Request):
        raw_bytes = bytearray()
        async for chunk in request.stream():
            raw_bytes.extend(chunk)
            if len(raw_bytes) > 4096:
                return JSONResponse({"error": "payload too large"}, status_code=413)
        try:
            raw = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return JSONResponse({"error": "invalid encoding"}, status_code=400)
        secret = os.environ.get("MODAL_3D_SHARED_SECRET", "")
        timestamp = request.headers.get("x-crafttrust-timestamp", "")
        nonce = request.headers.get("x-crafttrust-nonce", "")
        signature = request.headers.get("x-crafttrust-signature", "")
        if not verify_message(secret, timestamp, nonce, raw, signature):
            return JSONResponse({"error": "invalid signature"}, status_code=401)
        try:
            body = json.loads(raw)
            job_id = str(uuid.UUID(body["jobId"]))
        except (ValueError, KeyError, TypeError, json.JSONDecodeError):
            return JSONResponse({"error": "invalid payload"}, status_code=400)
        storage = CraftTrustStorage.from_environment()
        if storage.rpc("consume_model_webhook_nonce", {"p_nonce": nonce}) is not True:
            return JSONResponse({"error": "replay rejected"}, status_code=409)
        from dispatch import dispatch_one
        try:
            result = await asyncio.to_thread(dispatch_one, storage, Pixal3DWorker().process.spawn, job_id)
        except Exception:
            return JSONResponse({"accepted": False, "reconciliationRequired": True}, status_code=202)
        return JSONResponse(result, status_code=202)

    return web


@app.function(image=web_image, secrets=[engine_secret], schedule=modal.Period(minutes=5), timeout=60)
def reap_stale_jobs():
    from storage_client import CraftTrustStorage

    storage = CraftTrustStorage.from_environment()
    from dispatch import reconcile

    def finished(call_id):
        try:
            modal.FunctionCall.from_id(call_id).get(timeout=0)
            return True
        except TimeoutError:
            return False
        except (modal.exception.FunctionTimeoutError, modal.exception.RemoteError):
            return True
        # Transport/auth/not-found failures do NOT prove termination.

    reconcile(storage, finished)


@app.function(image=web_image, secrets=[engine_secret], schedule=modal.Period(minutes=5), timeout=60)
def dispatch_pending():
    from dispatch import dispatch_one
    from storage_client import CraftTrustStorage
    storage = CraftTrustStorage.from_environment()
    return dispatch_one(storage, Pixal3DWorker().process.spawn)


@app.function(image=web_image, secrets=[engine_secret], timeout=30)
def supabase_preflight():
    """CPU-only, read-only DNS/auth/schema check; never invokes an RPC."""
    from storage_client import CraftTrustStorage

    return CraftTrustStorage.from_environment().preflight(
        REQUIRED_SUPABASE_RPCS,
        REQUIRED_SUPABASE_TABLES,
    )


@app.local_entrypoint()
def check_supabase():
    """Operator-invoked CPU-only preflight. This cannot create or dispatch a job."""
    print(json.dumps(supabase_preflight.remote(), indent=2, sort_keys=True))


@app.local_entrypoint()
def smoke(job_id: str):
    """Explicitly invokes one real database job; never substitutes a fixture GLB."""
    from dispatch import dispatch_one
    from storage_client import CraftTrustStorage
    storage = CraftTrustStorage.from_environment()
    print(dispatch_one(storage, Pixal3DWorker().process.spawn, str(uuid.UUID(job_id))))


@app.function(
    image=gpu_image,
    gpu="L40S",
    secrets=[engine_secret],
    volumes={MODEL_CACHE: model_volume},
    timeout=900,
    cpu=2,
    memory=32768,
    min_containers=0,
    max_containers=1,
    retries=0,
    single_use_containers=True,
)
def gpu_smoke_test():
    """Validates GPU extensions and initializes Pixal3D on a real L40S.
    Only executed on explicit operator invocation; never runs automatically."""
    import time
    import torch
    from huggingface_hub import snapshot_download

    assert torch.cuda.is_available(), "CUDA device not detected on GPU container"
    gpu_name = torch.cuda.get_device_name(0)

    import flex_gemm
    from moge.model.v2 import MoGeModel
    import cumesh, nvdiffrast, nvdiffrec_render, o_voxel, natten
    from pixal3d.pipelines import Pixal3DImageTo3DPipeline
    from pixal3d_runner import Pixal3DRunner

    local_model, moge_checkpoint, local_dino, local_birefnet = (
        _download_pinned_model_snapshots(snapshot_download)
    )
    model_volume.commit()
    runner = Pixal3DRunner(
        Path("/opt/Pixal3D"), local_model,
        moge_checkpoint=moge_checkpoint,
        dino_path=local_dino,
        birefnet_path=local_birefnet,
        low_vram=True,
    )
    runner.load_single()

    return {
        "status": "PASS",
        "gpu": gpu_name,
        "cudaVersion": torch.version.cuda,
        "verifiedModules": [
            "flex_gemm", "MoGeModel", "cumesh", "nvdiffrast",
            "nvdiffrec_render", "o_voxel", "natten", "Pixal3DImageTo3DPipeline",
            "pinned-local-NAF", "pinned-MoGe-2", "pinned-DINOv3", "pinned-BiRefNet",
        ],
        "pipelineInitialized": runner.single_pipeline is not None,
        "timestamp": time.time(),
    }


@app.local_entrypoint()
def smoke_gpu():
    """Operator-invoked GPU smoke test with strict timeout and single container."""
    print("Invoking operator GPU smoke test (L40S, timeout 900s, max 1 container)...")
    result = gpu_smoke_test.remote()
    print(json.dumps(result, indent=2))

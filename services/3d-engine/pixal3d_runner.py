from __future__ import annotations

import importlib.util
import os
import sys
import time
from pathlib import Path

import torch


PIXAL3D_COMMIT = "f7cf38429b0bd264f1995f0f8743a88b1c728b94"
CHECKPOINT_REVISION = "b0cb2e1b794cab9aa0ac38a95d794a4d9337437f"
NAF_REPOSITORY = Path("/opt/NAF")
NAF_CHECKPOINT = NAF_REPOSITORY / "naf_release.pth"


def _module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load official Pixal3D entry point: {path.name}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _use_pinned_local_naf() -> None:
    """Replace Pixal3D's unpinned torch.hub GitHub load with local pinned files."""
    from pixal3d.trainers.flow_matching.mixins.image_conditioned_proj import (
        DinoV3ProjFeatureExtractor,
    )

    if not (NAF_REPOSITORY / "hubconf.py").is_file() or not NAF_CHECKPOINT.is_file():
        raise RuntimeError("PINNED_NAF_MISSING: NAF source or checkpoint is absent from the image.")

    def load_naf(instance) -> None:
        if instance.naf_model is not None:
            return
        device = next(instance.model.parameters()).device
        model = torch.hub.load(
            str(NAF_REPOSITORY),
            "naf",
            pretrained=False,
            device=device,
            source="local",
        )
        state = torch.load(NAF_CHECKPOINT, map_location=device, weights_only=True)
        model.load_state_dict(state)
        model.eval()
        model.requires_grad_(False)
        instance.naf_model = model

    DinoV3ProjFeatureExtractor._load_naf = load_naf


def _disable_model_network_fallbacks() -> None:
    """Make any missed local artifact fail instead of downloading an unpinned file."""
    import huggingface_hub

    def blocked_download(*args, **kwargs):
        raise RuntimeError("UNPINNED_MODEL_DOWNLOAD_BLOCKED: pinned local snapshot is incomplete")

    huggingface_hub.hf_hub_download = blocked_download


class Pixal3DRunner:
    def __init__(
        self,
        repository: Path,
        model_path: Path,
        *,
        moge_checkpoint: Path,
        dino_path: Path,
        birefnet_path: Path,
        low_vram: bool = True,
    ):
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA_UNAVAILABLE: Pixal3D requires a CUDA GPU; no fallback is permitted.")
        self.repository = repository
        self.model_path = model_path
        self.moge_checkpoint = moge_checkpoint
        self.dino_path = dino_path
        self.birefnet_path = birefnet_path
        self.low_vram = low_vram
        self.single_module = None
        self.single_pipeline = None
        self.multi_module = None
        self.multi_pipeline = None
        os.environ.setdefault("ATTN_BACKEND", "sdpa")
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
        _disable_model_network_fallbacks()

    def _configure_pinned_models(self, module) -> None:
        """Route every auxiliary model loader to a pinned local snapshot."""
        _use_pinned_local_naf()
        for config in module.IMAGE_COND_CONFIGS.values():
            config["model_name"] = str(self.dino_path)

        if hasattr(module, "load_moge_model"):
            upstream_load_moge = module.load_moge_model

            def load_moge_model(device="cuda", model_name=None):
                return upstream_load_moge(device=device, model_name=str(self.moge_checkpoint))

            module.load_moge_model = load_moge_model

        from pixal3d.pipelines.rembg.BiRefNet import BiRefNet
        from pixal3d.modules.image_feature_extractor import DinoV3FeatureExtractor

        if not hasattr(DinoV3FeatureExtractor, "_crafttrust_original_init"):
            DinoV3FeatureExtractor._crafttrust_original_init = DinoV3FeatureExtractor.__init__
        original_dino_init = DinoV3FeatureExtractor._crafttrust_original_init
        dino_path = str(self.dino_path)

        def init_dino(instance, model_name=None):
            original_dino_init(instance, model_name=dino_path)

        DinoV3FeatureExtractor.__init__ = init_dino

        if not hasattr(BiRefNet, "_crafttrust_original_init"):
            BiRefNet._crafttrust_original_init = BiRefNet.__init__
        original_init = BiRefNet._crafttrust_original_init
        birefnet_path = str(self.birefnet_path)

        def init_birefnet(instance, model_name=None):
            original_init(instance, model_name=birefnet_path)

        BiRefNet.__init__ = init_birefnet

    def load_single(self) -> None:
        if self.single_pipeline is not None:
            return
        self.single_module = _module("crafttrust_pixal3d_single", self.repository / "inference.py")
        self._configure_pinned_models(self.single_module)
        self.single_pipeline = self.single_module.init_pipeline(
            model_path=str(self.model_path), low_vram=self.low_vram
        )
        pipeline = self.single_pipeline
        self.single_module.init_pipeline = lambda *args, **kwargs: pipeline

    def load_multi(self) -> None:
        if self.multi_pipeline is not None:
            return
        self.multi_module = _module("crafttrust_pixal3d_multi", self.repository / "inference_mv.py")
        self._configure_pinned_models(self.multi_module)
        self.multi_pipeline = self.multi_module.init_pipeline(
            model_path=str(self.model_path), config_file="pipeline_mv.json", low_vram=self.low_vram
        )
        pipeline = self.multi_pipeline
        self.multi_module.init_pipeline = lambda *args, **kwargs: pipeline

    def run_single(self, image: Path, output: Path, resolution: int) -> dict:
        self.load_single()
        torch.cuda.reset_peak_memory_stats()
        started = time.perf_counter()
        self.single_module.run_inference(
            image_path=str(image), output_path=str(output), model_path=str(self.model_path),
            low_vram=self.low_vram, resolution=resolution,
        )
        torch.cuda.synchronize()
        return self._metrics(started)

    def run_multi(self, views_directory: Path, output: Path, resolution: int) -> dict:
        self.load_multi()
        torch.cuda.reset_peak_memory_stats()
        started = time.perf_counter()
        self.multi_module.run_inference(
            views_dir=str(views_directory), output_path=str(output),
            model_path=str(self.model_path), config_file="pipeline_mv.json",
            low_vram=self.low_vram, resolution=resolution,
        )
        torch.cuda.synchronize()
        return self._metrics(started)

    @staticmethod
    def _metrics(started: float) -> dict:
        properties = torch.cuda.get_device_properties(0)
        return {
            "gpuType": torch.cuda.get_device_name(0),
            "cudaAvailable": True,
            "cudaVersion": torch.version.cuda,
            "gpuRuntimeMs": round((time.perf_counter() - started) * 1000),
            "peakVramBytes": int(torch.cuda.max_memory_allocated()),
            "gpuMemoryBytes": int(properties.total_memory),
        }

"""AI Image-to-3D Adapters & Hybrid Reconstruction Manager for Hanoi CraftTrust.

Provides standardized adapter interfaces for TRELLIS.2, Tencent Hunyuan3D,
and TripoSR with automated hardware capability detection (CUDA VRAM, PyTorch),
graceful offline/CPU fallback to Ceramic/Multi-view engines, and explicit confidence scoring.
"""

import os
import shutil
import sys
from typing import Any, Dict, List, Optional, Tuple


class Base3DAdapter:
    """Base interface for all AI 3D reconstruction models."""

    def __init__(self, name: str, version: str, license_type: str, min_vram_gb: float):
        self.name = name
        self.version = version
        self.license = license_type
        self.min_vram_gb = min_vram_gb

    def check_availability(self) -> Tuple[bool, str]:
        """Check if runtime dependencies, CUDA, and weights are available."""
        raise NotImplementedError

    def get_info(self) -> Dict[str, Any]:
        available, reason = self.check_availability()
        return {
            "name": self.name,
            "version": self.version,
            "license": self.license,
            "minVramGb": self.min_vram_gb,
            "available": available,
            "statusReason": reason,
        }

    def generate(
        self,
        front_image_path: str,
        back_image_path: Optional[str],
        output_glb_path: str,
        height_cm: float,
        width_cm: float,
    ) -> Dict[str, Any]:
        """Reconstruct 3D model and write GLB. Returns execution metadata."""
        raise NotImplementedError


class Trellis2Adapter(Base3DAdapter):
    """Adapter for Microsoft TRELLIS.2 (Structured Latent 3D / Radiance Fields to Mesh).

    License: Apache 2.0. Requires >= 12 GB CUDA VRAM for full resolution neural meshing.
    """

    def __init__(self):
        super().__init__(
            name="TRELLIS.2",
            version="2.1.0-preview",
            license_type="Apache-2.0",
            min_vram_gb=12.0,
        )

    def check_availability(self) -> Tuple[bool, str]:
        # Check torch + cuda
        try:
            import torch

            if not torch.cuda.is_available():
                return False, "NVIDIA CUDA GPU không khả dụng trên hệ thống hiện tại."
            vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            if vram < self.min_vram_gb:
                return False, f"VRAM hiện có ({vram:.1f} GB) chưa đạt mức tối thiểu {self.min_vram_gb} GB của TRELLIS.2."
            # Check weights / package
            weights_path = os.environ.get("TRELLIS_WEIGHTS_DIR")
            if not weights_path or not os.path.exists(weights_path):
                return False, "Chưa cấu hình trọng số mô hình TRELLIS.2 (TRELLIS_WEIGHTS_DIR)."
            return True, "Sẵn sàng suy luận GPU."
        except ImportError:
            return False, "Môi trường Python chưa cài đặt PyTorch (torch) hỗ trợ CUDA."


class Hunyuan3DAdapter(Base3DAdapter):
    """Adapter for Tencent Hunyuan3D (1.0 / 2.0 High-Fidelity Generative 3D).

    License: Tencent Hunyuan Community License. Requires >= 16 GB CUDA VRAM.
    """

    def __init__(self):
        super().__init__(
            name="Hunyuan3D-2.0",
            version="2.0",
            license_type="Tencent Hunyuan Community License",
            min_vram_gb=16.0,
        )

    def check_availability(self) -> Tuple[bool, str]:
        try:
            import torch

            if not torch.cuda.is_available():
                return False, "NVIDIA CUDA GPU không khả dụng trên máy chủ này."
            vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            if vram < self.min_vram_gb:
                return False, f"VRAM hiện có ({vram:.1f} GB) chưa đạt mức yêu cầu {self.min_vram_gb} GB của Hunyuan3D-2.0."
            weights = os.environ.get("HUNYUAN3D_CHECKPOINT")
            if not weights or not os.path.exists(weights):
                return False, "Chưa tìm thấy checkpoint Hunyuan3D-2.0 (HUNYUAN3D_CHECKPOINT)."
            return True, "Sẵn sàng suy luận GPU."
        except ImportError:
            return False, "Thiếu thư viện PyTorch/CUDA."


class TripoSRAdapter(Base3DAdapter):
    """Adapter for TripoSR (Fast Feed-Forward 3D Mesh Generator).

    License: MIT. Requires >= 6 GB CUDA VRAM.
    """

    def __init__(self):
        super().__init__(
            name="TripoSR",
            version="1.0",
            license_type="MIT",
            min_vram_gb=6.0,
        )

    def check_availability(self) -> Tuple[bool, str]:
        try:
            import torch

            if not torch.cuda.is_available():
                return False, "Yêu cầu GPU NVIDIA CUDA."
            vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            if vram < self.min_vram_gb:
                return False, f"VRAM ({vram:.1f} GB) chưa đủ tối thiểu {self.min_vram_gb} GB."
            return True, "Sẵn sàng."
        except ImportError:
            return False, "Thư viện PyTorch chưa được cài đặt."


class Hybrid3DManager:
    """Orchestrates 3D reconstruction engine selection, hardware audit, and graceful fallbacks."""

    def __init__(self):
        self.adapters: Dict[str, Base3DAdapter] = {
            "ai-trellis": Trellis2Adapter(),
            "ai-hunyuan": Hunyuan3DAdapter(),
            "ai-triposr": TripoSRAdapter(),
        }

    def detect_hardware(self) -> Dict[str, Any]:
        """Audit current computing environment."""
        info = {
            "platform": sys.platform,
            "pythonVersion": sys.version.split()[0],
            "gpuAvailable": False,
            "gpuName": None,
            "vramGb": 0.0,
            "torchAvailable": False,
        }
        try:
            import torch

            info["torchAvailable"] = True
            info["torchVersion"] = torch.__version__
            if torch.cuda.is_available():
                info["gpuAvailable"] = True
                info["gpuName"] = torch.cuda.get_device_name(0)
                info["vramGb"] = round(
                    torch.cuda.get_device_properties(0).total_memory / (1024**3), 2
                )
        except ImportError:
            pass
        return info

    def list_engine_capabilities(self) -> List[Dict[str, Any]]:
        """Return catalog of available engines with status for UI and audit logs."""
        engines = [
            {
                "id": "ceramic",
                "name": "Ceramic Precision Engine (Rotational Parametric)",
                "type": "geometry",
                "ready": True,
                "confidenceBase": 0.88,
                "description": "Tái dựng biên dạng xoay toán học, kiểm soát vành miệng, cổ, đáy gốm và chiều dày thành thực tế.",
            },
            {
                "id": "multiview",
                "name": "Multi-view Photogrammetric Fusion Engine",
                "type": "hybrid",
                "ready": True,
                "confidenceBase": 0.95,
                "description": "Tích hợp đa góc quan sát (trước, sau, nghiêng 45°), khử đường nối UV và triệt tiêu vùng suy đoán.",
            },
        ]
        for key, adapter in self.adapters.items():
            info = adapter.get_info()
            engines.append(
                {
                    "id": key,
                    "name": f"AI Engine: {adapter.name}",
                    "type": "neural",
                    "ready": info["available"],
                    "confidenceBase": 0.90 if info["available"] else 0.40,
                    "description": f"Mô hình AI Image-to-3D ({adapter.license}). Yêu cầu VRAM >= {adapter.min_vram_gb} GB.",
                    "statusReason": info["statusReason"],
                }
            )
        return engines

    def resolve_engine(
        self,
        requested_engine: str,
        has_back_image: bool,
    ) -> Tuple[str, Optional[str], float]:
        """Resolves target engine with fallback if requested AI engine cannot run.

        Returns: (final_engine_id, fallback_reason_if_any, baseline_confidence)
        """
        requested = (requested_engine or "auto").lower().strip()

        # Specific AI engine requested
        if requested in self.adapters:
            adapter = self.adapters[requested]
            avail, reason = adapter.check_availability()
            if avail:
                return requested, None, 0.92
            # Fallback to multiview or ceramic
            fallback = "multiview" if has_back_image else "ceramic"
            msg = f"{adapter.name} chưa sẵn sàng ({reason}). Đã tự động chuyển về {fallback} engine đảm bảo tính liên tục."
            return fallback, msg, 0.88 if has_back_image else 0.80

        if requested == "ai":
            # Auto-pick best available AI adapter
            for key, adapter in self.adapters.items():
                avail, _ = adapter.check_availability()
                if avail:
                    return key, None, 0.92
            fallback = "multiview" if has_back_image else "ceramic"
            msg = "Hạ tầng GPU AI chưa sẵn sàng (cần GPU VRAM >= 12GB). Hệ thống tự động chuyển sang Multi-view / Ceramic Engine có độ chính xác hình học cao."
            return fallback, msg, 0.88 if has_back_image else 0.80

        if requested == "multiview":
            if has_back_image:
                return "multiview", None, 0.95
            return (
                "ceramic",
                "Chế độ Multi-view cần ít nhất 2 ảnh (mặt trước và mặt sau). Đã dùng Ceramic Engine cho ảnh đơn.",
                0.80,
            )

        if requested == "ceramic":
            return "ceramic", None, 0.90 if has_back_image else 0.82

        # 'auto' mode:
        if has_back_image:
            return "multiview", None, 0.95
        return "ceramic", None, 0.82

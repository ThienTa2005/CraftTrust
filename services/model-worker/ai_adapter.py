"""Explicit engine capability checks; CPU geometry is never labelled AI inference."""
class Hybrid3DManager:
    def detect_hardware(self):
        info = {"gpuAvailable": False, "gpuName": None, "vramGb": 0.0, "torchAvailable": False}
        try:
            import torch
            info["torchAvailable"] = True
            if torch.cuda.is_available():
                info.update(gpuAvailable=True, gpuName=torch.cuda.get_device_name(0),
                    vramGb=round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2))
        except (ImportError, OSError):
            pass
        return info

    def list_engine_capabilities(self):
        return [
            {"id": "ceramic", "name": "Ceramic CPU approximation", "ready": True},
            {"id": "multiview", "name": "Limited multi-view texture projection", "ready": True},
            {"id": "high-fidelity", "name": "COLMAP + OpenMVS", "ready": False,
             "statusReason": "Requires local toolchain and overlapping photos; preflight on request"},
            *[{"id": key, "name": key, "ready": False,
                "statusReason": "Inference implementation and verified weights are not installed"}
              for key in ("ai-trellis", "ai-hunyuan", "ai-triposr")],
        ]

    def resolve_engine(self, requested_engine, has_back_image):
        requested = (requested_engine or "auto").lower().strip()
        if requested == "ai" or requested.startswith("ai-"):
            raise RuntimeError(f"Engine {requested}: inference and verified weights unavailable. "
                "No automatic fallback. Select Ceramic or Limited Multi-view explicitly.")
        if requested == "high-fidelity":
            return requested, None, None
        if requested == "multiview" and not has_back_image:
            raise ValueError("Limited Multi-view requires at least two declared camera views.")
        if requested not in ("auto", "ceramic", "ceramic-cpu", "multiview"):
            raise ValueError(f"Unknown reconstruction engine: {requested}")
        return "ceramic-cpu", None, None

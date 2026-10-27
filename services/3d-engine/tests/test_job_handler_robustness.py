from __future__ import annotations

import sys
from pathlib import Path
import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

from job_handler import _error_code


def test_error_code_classification_avoids_false_inference_failed():
    # 1. Optimization error
    err_opt = RuntimeError("Mesh simplification decimation failed in fast_simplification")
    assert _error_code(err_opt) == "GLB_OPTIMIZATION_FAILED"

    # 2. Storage upload error
    err_storage = RuntimeError("Supabase storage upload timeout for product-models")
    assert _error_code(err_storage) == "STORAGE_UPLOAD_FAILED"

    # 3. Preview render error
    err_preview = RuntimeError("Preview render failed: pyglet buffer unavailable")
    assert _error_code(err_preview) == "PREVIEW_RENDER_FAILED"

    # 4. Validation error
    err_val = ValueError("Output validation failed: corrupt glTF header")
    assert _error_code(err_val) == "VALIDATION_FAILED"

    # 5. Worker code bug (e.g. NameError)
    err_internal = NameError("name 'output' is not defined")
    assert _error_code(err_internal) == "WORKER_INTERNAL_ERROR"

    # 6. GPU OOM
    err_oom = RuntimeError("CUDA out of memory while allocating tensor")
    assert _error_code(err_oom) == "GPU_OOM"

    # 7. Model weights
    err_weights = RuntimeError("Checkpoint revision unavailable on Hugging Face")
    assert _error_code(err_weights) == "MODEL_WEIGHTS_UNAVAILABLE"

    # 8. Genuine inference failure
    err_inf = RuntimeError("Pixal3D diffusion pipeline crashed unexpectedly")
    assert _error_code(err_inf) == "PIXAL3D_INFERENCE_FAILED"

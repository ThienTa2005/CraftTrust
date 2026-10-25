"""Deployment smoke test: CPU generation and valid GLB under the Storage bucket limit.

The separate test_pipeline.py suite also enforces the stricter 2 MB optimization
target; this smoke test does not replace that quality gate.
"""
import tempfile
from pathlib import Path

from generate import run_pipeline
from test_pipeline import create_synthetic_ceramic_photos, validate_glb_structure


with tempfile.TemporaryDirectory() as directory:
    folder = Path(directory)
    front, back = create_synthetic_ceramic_photos()
    front_path, back_path = folder / "front.png", folder / "back.png"
    front.save(front_path)
    back.save(back_path)
    for label, back_image in [("single", None), ("two-photos", str(back_path))]:
        output = folder / f"{label}.glb"
        report = run_pipeline(
            front_path=str(front_path), output_path=str(output),
            height_cm=28, width_cm=16, back_path=back_image,
            shape_mode="measured", engine_request="auto",
        )
        document = validate_glb_structure(str(output))
        assert document.get("meshes") and document.get("scenes")
        assert output.stat().st_size == report["assetBytes"]
        assert output.stat().st_size < 50_000_000  # product-models bucket limit
        assert report["modelMeasurements"] == {"heightCm": 28, "widthCm": 16}
        assert report["hasBackPhoto"] == bool(back_image)
        master = folder / f"{label}-master.glb"
        validate_glb_structure(str(master))
        print(f"CLOUD SMOKE PASS {label}: {report['assetBytes']} bytes, {report['generationMs']} ms")

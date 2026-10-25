"""Local SfM/MVS adapter. Requires an installed COLMAP/OpenMVS/Blender toolchain.

Never substitutes a lathe or a stock mesh. This optional path is not enabled in
the hosted CPU worker until validated with a suitable overlapping capture set.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
from PIL import Image, ImageOps
from segmentation import segment_object


def preflight(records):
    if len(records) < 12:
        raise ValueError("High Fidelity cần ít nhất 12 ảnh chồng lấp; hai ảnh đối diện không đủ SfM/MVS.")
    hashes = [hashlib.sha256(Path(r["path"]).read_bytes()).digest() for r in records]
    if len(set(hashes)) != len(hashes):
        raise ValueError("High Fidelity không chấp nhận ảnh trùng lặp.")
    names = ["colmap", "InterfaceCOLMAP", "DensifyPointCloud", "ReconstructMesh", "RefineMesh", "TextureMesh", "blender"]
    binaries = {name: shutil.which(os.environ.get("CRAFTTRUST_" + name.upper(), name)) for name in names}
    missing = [name for name, executable in binaries.items() if not executable]
    if missing:
        raise RuntimeError("High Fidelity toolchain unavailable: " + ", ".join(missing) + ". No fallback was run.")
    return binaries


def reconstruct(records, output_path, height_cm, width_cm):
    binaries = preflight(records)
    output = Path(output_path).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    log = []
    with tempfile.TemporaryDirectory(prefix="crafttrust-sfm-") as temp:
        work = Path(temp)
        images, masks, sparse, dense = [work / name for name in ("images", "masks", "sparse", "dense")]
        for folder in (images, masks, sparse, dense):
            folder.mkdir()
        for index, record in enumerate(records):
            image = ImageOps.exif_transpose(Image.open(record["path"]))
            rgb, mask = segment_object(image)
            name = f"view-{index:04}.png"
            Image.fromarray(rgb).save(images / name)
            Image.fromarray(mask * 255).save(masks / (name + ".png"))

        def run(name, *args):
            command = [binaries[name], *map(str, args)]
            completed = subprocess.run(command, cwd=work, capture_output=True, text=True,
                timeout=1800, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            log.append({"stage": name + " " + str(args[0]), "returncode": completed.returncode,
                "output": (completed.stdout + completed.stderr)[-12000:]})
            output.with_suffix(".stages.json").write_text(json.dumps(log, indent=2), encoding="utf-8")
            if completed.returncode:
                raise RuntimeError(f"High Fidelity failed at {name}; see stage log. No GLB fallback.")

        database = work / "database.db"
        run("colmap", "feature_extractor", "--database_path", database, "--image_path", images, "--ImageReader.mask_path", masks)
        run("colmap", "exhaustive_matcher", "--database_path", database)
        run("colmap", "mapper", "--database_path", database, "--image_path", images, "--output_path", sparse)
        models = list(sparse.glob("*/images.bin"))
        if len(models) != 1 or struct.unpack("<Q", models[0].read_bytes()[:8])[0] != len(records):
            raise ValueError("SfM không đăng ký được toàn bộ ảnh trong một mô hình; cần chụp bổ sung góc chồng lấp.")
        run("colmap", "image_undistorter", "--image_path", images, "--input_path", models[0].parent,
            "--output_path", dense, "--output_type", "COLMAP")
        run("InterfaceCOLMAP", "-i", dense, "-o", "scene.mvs", "--image-folder", dense / "images")
        run("DensifyPointCloud", "scene.mvs", "-o", "dense.mvs")
        run("ReconstructMesh", "dense.mvs", "-o", "mesh.mvs")
        run("RefineMesh", "mesh.mvs", "-o", "refined.mvs")
        run("TextureMesh", "refined.mvs", "-o", "textured.mvs", "--export-type", "obj")
        obj = work / "textured.obj"
        if not obj.exists():
            raise ValueError("Textured mesh was not produced.")
        run("blender", "--background", "--python", Path(__file__).with_name("high_fidelity_export.py").resolve(),
            "--", obj, output)
        data = output.read_bytes()
        if data[:4] != b"glTF" or struct.unpack_from("<I", data, 8)[0] != len(data):
            raise ValueError("Exported GLB is invalid.")
    report = {"reportVersion": 3, "engine": "colmap-openmvs", "mode": "high-fidelity",
        "inputViewCount": len(records), "registeredViews": len(records), "confidenceScore": None,
        "qualityStatus": "NEEDS_REVIEW", "publicationBlocked": True, "assetBytes": len(data),
        "verifiedMeasurements": [], "inputMeasurements": {"heightCm": height_cm, "widthCm": width_cm},
        "reviewReasons": ["SfM scale/orientation require calibration before AR.",
            "Compare reprojections, relief, texture and topology before approving; no physical accuracy score computed."]}
    output.with_suffix(".json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report

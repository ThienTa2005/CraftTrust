"""Capture deterministic segmentation evidence from the actual supplied photographs."""
import sys
import json
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / "outputs/3d-audit" / (sys.argv[1] if len(sys.argv) > 1 else "baseline")
sys.path.insert(0, str(folder if (folder / "generate.py").exists() else root / "services/model-worker"))
from generate import segment_object, extract_ceramic_profile

folder.mkdir(parents=True, exist_ok=True)
for name, filename in [("front", "t1-3-1024x1536.jpg"), ("back", "t2-3-1024x1536.jpg")]:
    rgb, mask = segment_object(Image.open(root.parent / filename))
    Image.fromarray(mask * 255).save(folder / f"{name}-mask.png")
    Image.fromarray(np.where(mask[:, :, None], rgb, 255)).save(folder / f"{name}-foreground.png")
    cx, top, bottom, samples, radii = extract_ceramic_profile(mask)
    (folder / f"{name}-profile.json").write_text(json.dumps({"top":top,"bottom":bottom,
        "centers":cx.tolist(),"rows":samples.tolist(),"radii":radii.tolist()},indent=2),encoding="utf-8")
    print(name, {"top": top, "bottom": bottom, "maxRadius": float(max(radii)), "axis": [float(min(cx)), float(max(cx))]})

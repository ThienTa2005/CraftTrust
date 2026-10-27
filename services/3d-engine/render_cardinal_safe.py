import io
import time
import trimesh
import trimesh.transformations as tf
import numpy as np
from pathlib import Path
from PIL import Image
import fast_simplification

BASE_DIR = Path(__file__).resolve().parent
DEBUG_DIR = BASE_DIR / "artifacts_debug" / "dc2dfaf7-3b63-43f8-8a20-c1c7c722edeb"
OUT_DIR = BASE_DIR / "artifacts_debug" / "cardinal_comparison"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MASTER_PATH = DEBUG_DIR / "pixal3d_master.glb"
WEB_PATH = DEBUG_DIR / "pixal3d_web.glb"

master_scene = trimesh.load(MASTER_PATH, force="scene", process=False)
master_mesh = list(master_scene.geometry.values())[0]

web_scene = trimesh.load(WEB_PATH, force="scene", process=False)
web_mesh = list(web_scene.geometry.values())[0]

pts = master_mesh.vertices.view(np.ndarray)
tris = master_mesh.faces.view(np.ndarray)
uvs = master_mesh.visual.uv
mat = master_mesh.visual.material

print("Generating safe optimized mesh with preserve_border=True...")
safe_pts, safe_tris, collapses = fast_simplification.simplify(
    pts, tris, target_count=350000, preserve_border=True, return_collapses=True
)
out_pts, out_tris, mapping = fast_simplification.replay_simplification(
    pts, tris, collapses
)
_, root_indices = np.unique(mapping, return_index=True)
safe_uv = uvs[root_indices]

safe_mesh = trimesh.Trimesh(
    vertices=safe_pts,
    faces=safe_tris,
    visual=trimesh.visual.TextureVisuals(uv=safe_uv, material=mat),
    process=True
)

ref_scene = master_mesh.scene()
ref_camera = ref_scene.camera
ref_cam_transform = ref_scene.camera_transform

angles = {
    "FRONT": 0.0,
    "RIGHT": 90.0,
    "BACK": 180.0,
    "LEFT": 270.0
}

def render_one(mesh, model_name, ang_name, deg):
    target = OUT_DIR / f"{model_name}_{ang_name}.png"
    if target.exists() and target.stat().st_size > 10000:
        print(f"Skipping already rendered: {target.name}")
        return
    m = mesh.copy()
    if deg != 0.0:
        rot = tf.rotation_matrix(np.radians(deg), [0, 1, 0])
        m.apply_transform(rot)
    s = m.scene()
    s.camera = ref_camera
    s.camera_transform = ref_cam_transform
    png = s.save_image(resolution=(768, 768))
    img = Image.open(io.BytesIO(png))
    img.save(target)
    print(f"Rendered: {target.name}")
    time.sleep(0.3)

for ang_name, deg in angles.items():
    render_one(web_mesh, "web_current_flawed", ang_name, deg)

for ang_name, deg in angles.items():
    render_one(safe_mesh, "web_safe_optimized", ang_name, deg)

print("All cardinal views rendered successfully!")

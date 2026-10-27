import io
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

# Load Master
master_scene = trimesh.load(MASTER_PATH, force="scene", process=False)
master_mesh = list(master_scene.geometry.values())[0]

# Load Current Web
web_scene = trimesh.load(WEB_PATH, force="scene", process=False)
web_mesh = list(web_scene.geometry.values())[0]

# Build Safe Optimized Web Mesh
pts = master_mesh.vertices.view(np.ndarray)
tris = master_mesh.faces.view(np.ndarray)
uvs = master_mesh.visual.uv
mat = master_mesh.visual.material

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

models = {
    "master": master_mesh,
    "web_current_flawed": web_mesh,
    "web_safe_optimized": safe_mesh
}

angles = {
    "FRONT": 0.0,
    "RIGHT": 90.0,
    "BACK": 180.0,
    "LEFT": 270.0
}

# Determine consistent camera setup using master_mesh scene
ref_scene = master_mesh.scene()
ref_camera = ref_scene.camera
ref_cam_transform = ref_scene.camera_transform

print(f"Rendering {len(models)} models across {len(angles)} cardinal angles...")

for mod_name, mesh in models.items():
    print(f"Rendering model: {mod_name} (Faces: {len(mesh.faces)}, Verts: {len(mesh.vertices)})")
    for ang_name, deg in angles.items():
        m_copy = mesh.copy()
        if deg != 0.0:
            rot = tf.rotation_matrix(np.radians(deg), [0, 1, 0])
            m_copy.apply_transform(rot)
        
        s = m_copy.scene()
        s.camera = ref_camera
        s.camera_transform = ref_cam_transform
        
        png = s.save_image(resolution=(768, 768))
        img = Image.open(io.BytesIO(png))
        save_path = OUT_DIR / f"{mod_name}_{ang_name}.png"
        img.save(save_path)
        print(f"  -> Saved {save_path.name}")

print("All cardinal angle renders successfully completed!")

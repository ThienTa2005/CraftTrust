import io
import trimesh
import numpy as np
from pathlib import Path
from PIL import Image
import fast_simplification

master_path = Path('artifacts_debug/dc2dfaf7-3b63-43f8-8a20-c1c7c722edeb/pixal3d_master.glb')
scene = trimesh.load(master_path, force='scene', process=False)
mesh = list(scene.geometry.values())[0]

points = mesh.vertices.view(np.ndarray)
triangles = mesh.faces.view(np.ndarray)
uvs = mesh.visual.uv
mat = mesh.visual.material

targets = [989620, 750000, 500000, 350000, 200000]
results = []

out_dir = Path('artifacts_debug/comparison_results/progressive')
out_dir.mkdir(parents=True, exist_ok=True)

for target in targets:
    if target == 989620:
        new_pts = points
        new_tris = triangles
        new_uv = uvs
    else:
        new_pts, new_tris, collapses = fast_simplification.simplify(
            points, triangles, target_count=target, return_collapses=True
        )
        out_pts, out_tris, mapping = fast_simplification.replay_simplification(
            points, triangles, collapses
        )
        _, root_indices = np.unique(mapping, return_index=True)
        new_uv = uvs[root_indices]

    # Calculate edge properties
    edges_sorted = np.sort(new_tris.reshape(-1, 3)[:, [0,1, 1,2, 2,0]].reshape(-1, 2), axis=1)
    unique_edges, counts = np.unique(edges_sorted, axis=0, return_counts=True)
    n_boundary = int(np.sum(counts == 1))
    n_non_manifold = int(np.sum(counts > 2))
    
    # Create mesh and render front view
    m = trimesh.Trimesh(
        vertices=new_pts,
        faces=new_tris,
        visual=trimesh.visual.TextureVisuals(uv=new_uv, material=mat),
        process=True # Let trimesh compute vertex normals!
    )
    s = m.scene()
    png = s.save_image(resolution=(512, 512))
    img = Image.open(io.BytesIO(png))
    img_path = out_dir / f"render_{target}.png"
    img.save(img_path)
    
    # Check invalid normals
    has_vn = m.vertex_normals is not None
    v_norm_len = np.linalg.norm(m.vertex_normals, axis=1) if has_vn else np.array([])
    invalid_n = int(np.sum(np.isnan(v_norm_len) | (v_norm_len < 1e-6))) if has_vn else 0

    info = {
        "target_faces": target,
        "actual_faces": len(new_tris),
        "actual_vertices": len(new_pts),
        "boundary_edges": n_boundary,
        "non_manifold_edges": n_non_manifold,
        "invalid_normals": invalid_n,
        "render_path": str(img_path)
    }
    print(info)
    results.append(info)

import json
(out_dir / "progressive_results.json").write_text(json.dumps(results, indent=2))
print("Done testing progressive decimation!")

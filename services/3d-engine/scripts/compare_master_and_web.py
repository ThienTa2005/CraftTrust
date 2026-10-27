import json
import math
import shutil
import time
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree
import trimesh
import trimesh.transformations as tf
from trimesh.exchange import gltf
import fast_simplification

BASE_DIR = Path(__file__).resolve().parent
DEBUG_DIR = BASE_DIR / "artifacts_debug" / "dc2dfaf7-3b63-43f8-8a20-c1c7c722edeb"
OUT_DIR = BASE_DIR / "artifacts_debug" / "comparison_results"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MASTER_PATH = DEBUG_DIR / "pixal3d_master.glb"
WEB_PATH = DEBUG_DIR / "pixal3d_web.glb"
SOURCE_IMAGE_PATH = DEBUG_DIR / "source-0.jpg"

def analyze_mesh(mesh: trimesh.Trimesh, label: str) -> dict:
    print(f"\n--- Analyzing {label} ---")
    points = mesh.vertices.view(np.ndarray)
    triangles = mesh.faces.view(np.ndarray)
    
    # 1. Counts
    n_verts = len(points)
    n_faces = len(triangles)
    
    # 2. Components
    components = trimesh.graph.connected_components(mesh.edges, nodes=np.arange(n_verts))
    n_components = len(components)
    
    # 3. Boundary edges & Watertight & Manifold edges
    edges_sorted = np.sort(mesh.edges, axis=1)
    unique_edges, counts = np.unique(edges_sorted, axis=0, return_counts=True)
    n_boundary = int(np.sum(counts == 1))
    non_manifold_edges = int(np.sum(counts > 2))
    is_watertight = bool(mesh.is_watertight)
    
    # 4. Degenerate faces (zero area or duplicate vertex indices)
    areas = mesh.area_faces
    degenerate_area_faces = int(np.sum(areas <= 1e-10))
    duplicate_idx_faces = int(np.sum(
        (triangles[:, 0] == triangles[:, 1]) |
        (triangles[:, 1] == triangles[:, 2]) |
        (triangles[:, 0] == triangles[:, 2])
    ))
    
    # 6. Normals
    has_vertex_normals = mesh.vertex_normals is not None and len(mesh.vertex_normals) == n_verts
    # Check NaN or zero-norm normals
    v_norm_lengths = np.linalg.norm(mesh.vertex_normals, axis=1) if has_vertex_normals else np.array([])
    invalid_normals = int(np.sum(np.isnan(v_norm_lengths) | (v_norm_lengths < 1e-6))) if has_vertex_normals else 0
    
    # 7. UVs
    has_uv = hasattr(mesh.visual, "uv") and mesh.visual.uv is not None and len(mesh.visual.uv) > 0
    uv_stats = {}
    if has_uv:
        uvs = mesh.visual.uv
        uv_min = uvs.min(axis=0).tolist()
        uv_max = uvs.max(axis=0).tolist()
        out_of_range = int(np.sum((uvs < -0.05) | (uvs > 1.05)))
        
        # Check UV triangles area
        # For each face, get UVs of its 3 vertices
        if len(uvs) >= len(points):
            face_uvs = uvs[triangles] # (F, 3, 2)
            # 2D cross product for UV triangle signed area
            v0, v1, v2 = face_uvs[:, 0], face_uvs[:, 1], face_uvs[:, 2]
            uv_signed_area = 0.5 * ((v1[:, 0] - v0[:, 0]) * (v2[:, 1] - v0[:, 1]) - (v1[:, 1] - v0[:, 1]) * (v2[:, 0] - v0[:, 0]))
            uv_area = np.abs(uv_signed_area)
            uv_degenerate_faces = int(np.sum(uv_area <= 1e-8))
            uv_inverted_faces = int(np.sum(uv_signed_area < -1e-8))
            
            # UV edge stretch: ratio of 2D UV edge length to 3D edge length
            e01_3d = np.linalg.norm(points[triangles[:, 1]] - points[triangles[:, 0]], axis=1)
            e01_uv = np.linalg.norm(v1 - v0, axis=1)
            # Avoid division by zero
            valid_mask = e01_3d > 1e-6
            stretch_ratio = np.zeros(len(triangles))
            stretch_ratio[valid_mask] = e01_uv[valid_mask] / e01_3d[valid_mask]
            
            # Faces with massive UV stretch (e.g. UV spanning across seams > 0.5 when 3D is small)
            seam_tears = int(np.sum((e01_uv > 0.4) & (e01_3d < 0.05)))
        else:
            uv_degenerate_faces = -1
            uv_inverted_faces = -1
            seam_tears = -1
            
        uv_stats = {
            "uv_min": uv_min,
            "uv_max": uv_max,
            "out_of_range_coords": out_of_range,
            "uv_degenerate_faces": uv_degenerate_faces,
            "uv_inverted_faces": uv_inverted_faces,
            "seam_tears_estimated": seam_tears
        }

    stats = {
        "label": label,
        "vertex_count": n_verts,
        "face_count": n_faces,
        "connected_components": n_components,
        "boundary_edges": n_boundary,
        "is_watertight": is_watertight,
        "degenerate_area_faces": degenerate_area_faces,
        "duplicate_idx_faces": duplicate_idx_faces,
        "non_manifold_edges": non_manifold_edges,
        "invalid_normals": invalid_normals,
        "uv_stats": uv_stats
    }
    return stats

def render_views(scene: trimesh.Scene, out_prefix: Path, res=(768, 768)):
    angles = {
        "FRONT": 0.0,
        "RIGHT": 90.0,
        "BACK": 180.0,
        "LEFT": 270.0
    }
    rendered = {}
    for name, angle in angles.items():
        s = scene.copy()
        if angle != 0:
            rot = tf.rotation_matrix(np.radians(angle), [0, 1, 0])
            s.apply_transform(rot)
        png = s.save_image(resolution=res, visible=False)
        target = out_prefix.parent / f"{out_prefix.name}_{name}.png"
        target.write_bytes(png)
        rendered[name] = str(target)
    return rendered

def main():
    print("Loading Master and Web GLBs...")
    master_scene = trimesh.load(MASTER_PATH, force="scene", process=False)
    web_scene = trimesh.load(WEB_PATH, force="scene", process=False)
    
    master_mesh = list(master_scene.geometry.values())[0]
    web_mesh = list(web_scene.geometry.values())[0]
    
    master_stats = analyze_mesh(master_mesh, "Master GLB")
    web_stats = analyze_mesh(web_mesh, "Web GLB (Current Production 200k)")
    
    print("\n--- Surface Deviation Analysis ---")
    # Sample 100k points on Master mesh, measure distance to Web mesh
    pts_master, _ = trimesh.sample.sample_surface(master_mesh, 50000)
    tree_web = cKDTree(web_mesh.vertices)
    distances, _ = tree_web.query(pts_master)
    mean_dist = float(np.mean(distances))
    rms_dist = float(np.sqrt(np.mean(distances**2)))
    max_dist = float(np.max(distances))
    deviation_stats = {
        "mean_surface_deviation": mean_dist,
        "rms_surface_deviation": rms_dist,
        "max_surface_deviation": max_dist
    }
    print("Deviation stats:", deviation_stats)
    
    # Render Master and Web views
    print("\n--- Rendering Master views ---")
    master_renders = render_views(master_scene, OUT_DIR / "master")
    print("\n--- Rendering Web views ---")
    web_renders = render_views(web_scene, OUT_DIR / "web_current")
    
    # Save statistics report
    full_report = {
        "job_id": "dc2dfaf7-3b63-43f8-8a20-c1c7c722edeb",
        "product_id": "f57d000c-789c-45ad-b40c-50775260dd90",
        "source_image": "source-0.jpg",
        "master_stats": master_stats,
        "web_stats": web_stats,
        "surface_deviation": deviation_stats,
        "master_renders": master_renders,
        "web_renders": web_renders
    }
    (OUT_DIR / "comparison_report.json").write_text(json.dumps(full_report, indent=2), encoding="utf-8")
    print(f"\nReport written to {OUT_DIR / 'comparison_report.json'}")

if __name__ == "__main__":
    main()

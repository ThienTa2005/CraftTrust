from __future__ import annotations

import io
import shutil
from pathlib import Path
from typing import Any

import fast_simplification
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree
import trimesh
from trimesh.exchange import gltf

from quality_check import inspect_glb


def _resize_texture(image: Any, max_dim: int = 2048) -> Image.Image | None:
    if not isinstance(image, Image.Image):
        return None
    w, h = image.size
    if max(w, h) <= max_dim:
        return image
    scale = max_dim / float(max(w, h))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    return image.resize((new_w, new_h), Image.Resampling.LANCZOS)


def optimize_glb_for_web(
    input_glb: Path | str | bytes,
    output_web_glb: Path | str | None = None,
    target_faces: int = 350000,
    max_texture_dim: int = 2048,
) -> tuple[bytes, dict[str, Any]]:
    """Decimate mesh adaptively with preserve_border=True, preserve UVs/PBR materials, and compress textures.

    Produces a lightweight Web GLB ready for 60fps mobile and desktop rendering without surface tearing.
    """
    if isinstance(input_glb, bytes):
        raw_master = input_glb
        scene = trimesh.load(
            trimesh.util.wrap_as_stream(raw_master),
            file_type="glb",
            force="scene",
            process=False,
        )
    else:
        path = Path(input_glb)
        raw_master = path.read_bytes()
        scene = trimesh.load(path, file_type="glb", force="scene", process=False)

    geometries = list(scene.geometry.values())
    if not geometries:
        raise ValueError("Cannot optimize GLB: scene contains no mesh geometry.")

    orig_face_count = sum(len(m.faces) for m in geometries)
    orig_vertex_count = sum(len(m.vertices) for m in geometries)
    orig_file_size = len(raw_master)

    new_geometries: dict[str, trimesh.Trimesh] = {}

    for name, mesh in scene.geometry.items():
        points = mesh.vertices.view(np.ndarray)
        triangles = mesh.faces.view(np.ndarray)
        mesh_faces = len(triangles)

        # 1. Mesh decimation if faces exceed target
        if mesh_faces > target_faces:
            # Proportional target if multiple geometries exist
            sub_target = int(round(target_faces * (mesh_faces / orig_face_count)))
            sub_target = max(50, min(sub_target, mesh_faces))

            has_uv = hasattr(mesh.visual, "uv") and mesh.visual.uv is not None and len(mesh.visual.uv) > 0

            try:
                new_points, new_triangles, collapses = fast_simplification.simplify(
                    points, triangles, target_count=sub_target, preserve_border=True, agg=5.0, return_collapses=True
                )
                if has_uv:
                    out_pts, out_tris, mapping = fast_simplification.replay_simplification(
                        points, triangles, collapses
                    )
                    # Topological collapse parentage: map each new vertex to its originating root vertex
                    _, root_indices = np.unique(mapping, return_index=True)
                    new_uv = mesh.visual.uv[root_indices]
                else:
                    new_uv = None
            except Exception:
                # Robust fallback to standard simplify with preserve_border
                new_points, new_triangles = fast_simplification.simplify(
                    points, triangles, target_count=sub_target, preserve_border=True, agg=5.0
                )
                if has_uv:
                    tree = cKDTree(points)
                    _, indices = tree.query(new_points)
                    new_uv = mesh.visual.uv[indices]
                else:
                    new_uv = None
        else:
            new_points = points
            new_triangles = triangles
            new_uv = getattr(mesh.visual, "uv", None)

        # 2. Reconstruct PBR material with resized textures
        orig_mat = getattr(mesh.visual, "material", None)
        if orig_mat is not None and isinstance(orig_mat, trimesh.visual.material.PBRMaterial):
            new_mat = trimesh.visual.material.PBRMaterial(
                baseColorFactor=getattr(orig_mat, "baseColorFactor", [1.0, 1.0, 1.0, 1.0]),
                metallicFactor=getattr(orig_mat, "metallicFactor", 1.0),
                roughnessFactor=getattr(orig_mat, "roughnessFactor", 1.0),
                alphaMode=getattr(orig_mat, "alphaMode", "OPAQUE"),
                doubleSided=getattr(orig_mat, "doubleSided", False),
            )
            for attr in (
                "baseColorTexture",
                "metallicRoughnessTexture",
                "normalTexture",
                "occlusionTexture",
                "emissiveTexture",
            ):
                val = getattr(orig_mat, attr, None)
                if val is not None:
                    resized = _resize_texture(val, max_texture_dim)
                    setattr(new_mat, attr, resized or val)
        elif orig_mat is not None:
            new_mat = orig_mat
        else:
            new_mat = None

        if new_uv is not None and new_mat is not None:
            new_visual = trimesh.visual.TextureVisuals(uv=new_uv, material=new_mat)
        elif new_mat is not None:
            new_visual = trimesh.visual.TextureVisuals(material=new_mat)
        else:
            new_visual = mesh.visual

        # Quality Gate Check: verify non-manifold edges
        edges_sorted = np.sort(new_triangles.reshape(-1, 3)[:, [0, 1, 1, 2, 2, 0]].reshape(-1, 2), axis=1)
        _, edge_counts = np.unique(edges_sorted, axis=0, return_counts=True)
        if int(np.sum(edge_counts > 2)) > 10:
            # Revert geometry to preserve surface integrity
            new_points = points
            new_triangles = triangles
            new_visual = mesh.visual

        decimated_mesh = trimesh.Trimesh(
            vertices=new_points,
            faces=new_triangles,
            visual=new_visual,
            process=True,
        )
        new_geometries[name] = decimated_mesh

    opt_scene = trimesh.Scene(geometry=new_geometries)
    web_glb_bytes = gltf.export_glb(opt_scene, extension_webp=True)

    if output_web_glb is not None:
        out_path = Path(output_web_glb)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(web_glb_bytes)

    web_inspection = inspect_glb(web_glb_bytes)

    web_face_count = web_inspection["faceCount"]
    web_vertex_count = web_inspection["vertexCount"]
    web_file_size = len(web_glb_bytes)

    metrics = {
        "master_file_size": orig_file_size,
        "web_file_size": web_file_size,
        "master_face_count": orig_face_count,
        "web_face_count": web_face_count,
        "master_vertex_count": orig_vertex_count,
        "web_vertex_count": web_vertex_count,
        "size_reduction_percent": round((1.0 - (web_file_size / max(1, orig_file_size))) * 100.0, 1),
        "face_reduction_percent": round((1.0 - (web_face_count / max(1, orig_face_count))) * 100.0, 1),
        "web_has_texture": web_inspection["hasTexture"],
        "web_has_uvs": web_inspection["hasUvs"],
        "web_texture_slots": web_inspection["textureSlots"],
        "web_ready": web_inspection["qualityAdvisory"]["webViewerReady"],
    }

    return web_glb_bytes, metrics


def export_dual_glb(
    master_path: Path,
    output_dir: Path,
    target_faces: int = 350000,
    max_texture_dim: int = 2048,
) -> dict[str, Any]:
    """Export both Master GLB (archival/admin) and Web GLB (optimized for buyer viewer)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    master_dest = output_dir / "master.glb"
    web_dest = output_dir / "web.glb"

    if master_path != master_dest:
        shutil.copyfile(master_path, master_dest)

    _, metrics = optimize_glb_for_web(
        master_dest,
        output_web_glb=web_dest,
        target_faces=target_faces,
        max_texture_dim=max_texture_dim,
    )

    metrics["master_glb_path"] = str(master_dest)
    metrics["web_glb_path"] = str(web_dest)
    return metrics

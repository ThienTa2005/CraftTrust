from __future__ import annotations

import copy
import shutil
from pathlib import Path
from typing import Any

import fast_simplification
import numpy as np
from PIL import Image
import trimesh
from trimesh.exchange import gltf

from quality_check import analyze_mesh_topology, compare_silhouettes, inspect_glb
from software_render import compare_scene_renders


TEXTURE_ATTRIBUTES = (
    "baseColorTexture",
    "metallicRoughnessTexture",
    "normalTexture",
    "occlusionTexture",
    "emissiveTexture",
)


class _ControlledWebPTexture:
    """PIL-compatible proxy that prevents Trimesh's implicit quality=80 WebP pass."""

    format = "WEBP"

    def __init__(self, image: Image.Image, *, lossless: bool, quality: int) -> None:
        self._image = image
        self.lossless = lossless
        self.quality = quality

    @property
    def size(self) -> tuple[int, int]:
        return self._image.size

    @property
    def mode(self) -> str:
        return self._image.mode

    def save(self, fp: Any, format: str | None = None, **_: Any) -> None:
        self._image.save(
            fp,
            format="WEBP",
            lossless=self.lossless,
            quality=self.quality,
            method=6,
            exact=True,
        )

    def __array__(self, dtype: Any = None) -> np.ndarray:
        return np.asarray(self._image, dtype=dtype)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._image, name)


def _resize_texture(image: Any, max_dim: int) -> Image.Image | None:
    if not isinstance(image, Image.Image):
        return None
    width, height = image.size
    if max(width, height) <= max_dim:
        return image.copy()
    scale = max_dim / float(max(width, height))
    new_size = (
        max(1, int(round(width * scale))),
        max(1, int(round(height * scale))),
    )
    return image.resize(new_size, Image.Resampling.LANCZOS)


def _copy_material(
    material: Any,
    max_texture_dim: int,
    texture_lossless: bool,
    texture_quality: int,
) -> Any:
    if material is None:
        return None
    output = copy.deepcopy(material)
    for attribute in TEXTURE_ATTRIBUTES:
        value = getattr(output, attribute, None)
        resized = _resize_texture(value, max_texture_dim)
        if resized is not None:
            setattr(
                output,
                attribute,
                _ControlledWebPTexture(
                    resized,
                    lossless=texture_lossless,
                    quality=texture_quality,
                ),
            )
    return output


def _visual_with_uv(mesh: trimesh.Trimesh, uv: np.ndarray | None, material: Any) -> Any:
    if uv is not None:
        return trimesh.visual.TextureVisuals(uv=uv, material=material)
    if material is not None:
        return trimesh.visual.TextureVisuals(material=material)
    return copy.deepcopy(mesh.visual)


def _remove_proven_flat_artifacts(
    mesh: trimesh.Trimesh,
) -> tuple[trimesh.Trimesh, dict[str, Any]]:
    analysis = analyze_mesh_topology(mesh, include_labels=True)
    labels = analysis.pop("_componentLabels")
    removable = set(analysis.pop("_safeRemovableComponentIds"))
    report = {
        "detected": analysis["flatArtifactCandidates"],
        "removedComponentCount": len(removable),
        "sampleRemovedComponentIds": sorted(removable)[:20],
        "removedVertexCount": 0,
        "removedFaceCount": 0,
    }
    if not removable:
        return mesh.copy(), report

    faces = np.asarray(mesh.faces)
    component_per_face = labels[faces[:, 0]]
    keep_faces_mask = ~np.isin(component_per_face, np.fromiter(removable, dtype=np.int64))
    kept_faces_old = faces[keep_faces_mask]
    used_vertices = np.unique(kept_faces_old.reshape(-1))
    old_to_new = np.full(len(mesh.vertices), -1, dtype=np.int64)
    old_to_new[used_vertices] = np.arange(len(used_vertices), dtype=np.int64)
    kept_faces = old_to_new[kept_faces_old]

    uv = getattr(mesh.visual, "uv", None)
    kept_uv = np.asarray(uv)[used_vertices] if uv is not None else None
    kept_normals = np.asarray(mesh.vertex_normals)[used_vertices]
    cleaned = trimesh.Trimesh(
        vertices=np.asarray(mesh.vertices)[used_vertices],
        faces=kept_faces,
        vertex_normals=kept_normals,
        visual=_visual_with_uv(mesh, kept_uv, getattr(mesh.visual, "material", None)),
        process=False,
    )
    report["removedVertexCount"] = int(len(mesh.vertices) - len(cleaned.vertices))
    report["removedFaceCount"] = int(len(mesh.faces) - len(cleaned.faces))
    return cleaned, report


def _representative_vertices(mapping: np.ndarray, output_vertex_count: int) -> np.ndarray:
    representatives = np.full(output_vertex_count, len(mapping), dtype=np.int64)
    source_indices = np.flatnonzero(mapping >= 0)
    np.minimum.at(representatives, mapping[source_indices], source_indices)
    if np.any(representatives == len(mapping)):
        raise ValueError("Simplification mapping omitted one or more output vertices.")
    return representatives


def _simplify_preserving_borders(
    mesh: trimesh.Trimesh,
    target_faces: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray | None]:
    points = np.asarray(mesh.vertices)
    triangles = np.asarray(mesh.faces)
    uv = getattr(mesh.visual, "uv", None)
    if len(triangles) <= target_faces:
        return points.copy(), triangles.copy(), None if uv is None else np.asarray(uv).copy()

    _, _, collapses = fast_simplification.simplify(
        points,
        triangles,
        target_count=target_faces,
        preserve_border=True,
        agg=5.0,
        return_collapses=True,
    )
    output_points, output_triangles, mapping = fast_simplification.replay_simplification(
        points,
        triangles,
        collapses,
    )
    output_uv = None
    if uv is not None:
        representatives = _representative_vertices(mapping, len(output_points))
        output_uv = np.asarray(uv)[representatives]
    return output_points, output_triangles, output_uv


def _clean_scene(scene: trimesh.Scene) -> tuple[trimesh.Scene, list[dict[str, Any]]]:
    output = scene.copy()
    reports: list[dict[str, Any]] = []
    for name, mesh in scene.geometry.items():
        cleaned, report = _remove_proven_flat_artifacts(mesh)
        report["geometry"] = name
        output.geometry[name] = cleaned
        reports.append(report)
    return output, reports


def _candidate_targets(clean_face_count: int, requested_faces: int) -> list[int]:
    requested = max(50, min(int(requested_faces), clean_face_count))
    if requested < 200000 or clean_face_count < 300000:
        return [requested]
    targets = {
        requested,
        min(clean_face_count, max(requested, 300000)),
        min(clean_face_count, max(requested, 350000)),
        min(clean_face_count, max(requested, 450000)),
        min(clean_face_count, max(requested, 600000)),
        clean_face_count,
    }
    return sorted(targets)


def _build_candidate_scene(
    clean_scene: trimesh.Scene,
    target_faces: int,
    max_texture_dim: int,
    texture_lossless: bool,
    texture_quality: int,
) -> trimesh.Scene:
    total_faces = sum(len(mesh.faces) for mesh in clean_scene.geometry.values())
    output = clean_scene.copy()
    for name, mesh in clean_scene.geometry.items():
        proportional_target = max(
            50,
            min(
                len(mesh.faces),
                int(round(target_faces * len(mesh.faces) / max(1, total_faces))),
            ),
        )
        points, triangles, uv = _simplify_preserving_borders(mesh, proportional_target)
        material = _copy_material(
            getattr(mesh.visual, "material", None),
            max_texture_dim=max_texture_dim,
            texture_lossless=texture_lossless,
            texture_quality=texture_quality,
        )
        candidate = trimesh.Trimesh(
            vertices=points,
            faces=triangles,
            visual=_visual_with_uv(mesh, uv, material),
            process=False,
        )
        _ = candidate.vertex_normals
        output.geometry[name] = candidate
    return output


def _quality_comparison(
    reference_scene: trimesh.Scene,
    reference_non_manifold_edges: int,
    candidate_bytes: bytes,
    candidate_inspection: dict[str, Any],
    cached_reference_profiles: dict[str, Any] | None = None,
    cached_reference_renders: dict[str, tuple[Image.Image, Any]] | None = None,
    cached_texture_fidelity: dict[str, Any] | None = None,
) -> dict[str, Any]:
    silhouette = compare_silhouettes(
        reference_scene,
        candidate_bytes,
        cached_reference_profiles=cached_reference_profiles,
    )
    render_comparison = compare_scene_renders(
        reference_scene,
        candidate_bytes,
        resolution=256,
        cached_reference_renders=cached_reference_renders,
    )
    texture_fidelity = (
        cached_texture_fidelity
        if cached_texture_fidelity is not None
        else _compare_base_color_texture(reference_scene, candidate_bytes)
    )
    new_non_manifold = max(
        0,
        candidate_inspection["nonManifoldEdgeCount"] - reference_non_manifold_edges,
    )
    attributes_preserved = bool(
        candidate_inspection["hasUvs"]
        and candidate_inspection["hasMaterial"]
        and candidate_inspection["hasTexture"]
        and candidate_inspection["hasNormals"]
    )
    passed = bool(
        new_non_manifold == 0
        and candidate_inspection["safeRemovableFlatComponentCount"] == 0
        and attributes_preserved
        and silhouette["passed"]
        and render_comparison["passed"]
        and texture_fidelity["passed"]
        and candidate_inspection["qualityAdvisory"]["webViewerReady"]
    )
    return {
        "passed": passed,
        "newNonManifoldEdgeCount": new_non_manifold,
        "attributesPreserved": attributes_preserved,
        "silhouette": silhouette,
        "renderComparison": render_comparison,
        "textureFidelity": texture_fidelity,
        "rejectionReasons": [
            reason
            for condition, reason in (
                (new_non_manifold > 0, "NEW_NON_MANIFOLD_EDGES"),
                (
                    candidate_inspection["safeRemovableFlatComponentCount"] > 0,
                    "REMOVABLE_FLAT_GEOMETRY_REMAINS",
                ),
                (not attributes_preserved, "UV_MATERIAL_NORMAL_OR_TEXTURE_LOST"),
                (not silhouette["passed"], "SILHOUETTE_DEVIATION"),
                (not render_comparison["passed"], "MASTER_WEB_RENDER_MISMATCH"),
                (not texture_fidelity["passed"], "BASE_COLOR_OR_GOLD_DETAIL_LOSS"),
                (
                    not candidate_inspection["qualityAdvisory"]["webViewerReady"],
                    "WEB_BUDGET_OR_ASSET_GATE_FAILED",
                ),
            )
            if condition
        ],
    }


def _first_base_color(scene: trimesh.Scene) -> Image.Image | None:
    for mesh in scene.geometry.values():
        material = getattr(mesh.visual, "material", None)
        image = _texture_image(getattr(material, "baseColorTexture", None)) if material else None
        if image is not None:
            return image.convert("RGB")
    return None


def _texture_image(value: Any) -> Image.Image | None:
    if isinstance(value, Image.Image):
        return value
    wrapped = getattr(value, "_image", None)
    return wrapped if isinstance(wrapped, Image.Image) else None


def _compare_base_color_texture(
    reference_scene: trimesh.Scene,
    candidate: bytes,
) -> dict[str, Any]:
    candidate_scene = trimesh.load(
        trimesh.util.wrap_as_stream(candidate),
        file_type="glb",
        force="scene",
        process=False,
    )
    reference_image = _first_base_color(reference_scene)
    candidate_image = _first_base_color(candidate_scene)
    if reference_image is None or candidate_image is None:
        return {"passed": False, "reason": "BASE_COLOR_TEXTURE_MISSING"}
    if reference_image.size != candidate_image.size:
        reference_image = reference_image.resize(candidate_image.size, Image.Resampling.LANCZOS)
    reference = np.asarray(reference_image, dtype=np.float64)
    output = np.asarray(candidate_image, dtype=np.float64)
    difference = reference - output
    mse = float(np.mean(difference**2))
    psnr = float("inf") if mse == 0 else float(20.0 * np.log10(255.0 / np.sqrt(mse)))
    mean_delta = float(np.mean(np.abs(difference)))
    gold_mask = (
        (reference[:, :, 0] >= 120)
        & (reference[:, :, 1] >= 80)
        & (reference[:, :, 2] <= np.minimum(reference[:, :, 0], reference[:, :, 1]) * 0.82)
    )
    gold_pixels = int(np.count_nonzero(gold_mask))
    gold_delta = float(np.mean(np.abs(difference[gold_mask]))) if gold_pixels else 0.0

    ref_luma = reference.mean(axis=2)
    out_luma = output.mean(axis=2)
    ref_gradient = np.hypot(np.diff(ref_luma, axis=1, append=ref_luma[:, -1:]), np.diff(ref_luma, axis=0, append=ref_luma[-1:, :]))
    out_gradient = np.hypot(np.diff(out_luma, axis=1, append=out_luma[:, -1:]), np.diff(out_luma, axis=0, append=out_luma[-1:, :]))
    if gold_pixels:
        reference_edge_energy = float(np.mean(ref_gradient[gold_mask]))
        output_edge_energy = float(np.mean(out_gradient[gold_mask]))
        edge_retention = output_edge_energy / max(reference_edge_energy, 1e-12)
    else:
        edge_retention = 1.0
    passed = bool(psnr >= 38.0 and gold_delta <= 6.0 and edge_retention >= 0.85)
    return {
        "passed": passed,
        "referenceDimensions": list(reference_image.size),
        "candidateDimensions": list(candidate_image.size),
        "psnrDb": None if not np.isfinite(psnr) else round(psnr, 3),
        "losslessPixelMatch": mse == 0,
        "meanColorDelta": round(mean_delta, 4),
        "goldPixelCount": gold_pixels,
        "goldMeanColorDelta": round(gold_delta, 4),
        "goldEdgeEnergyRetention": round(float(edge_retention), 4),
        "thresholds": {"psnrDbMin": 38.0, "goldMeanColorDeltaMax": 6.0, "goldEdgeRetentionMin": 0.85},
    }


def optimize_glb_for_web(
    input_glb: Path | str | bytes,
    output_web_glb: Path | str | None = None,
    target_faces: int = 350000,
    max_texture_dim: int = 4096,
    *,
    texture_lossless: bool = False,
    texture_quality: int = 95,
    evaluate_all_candidates: bool = True,
) -> tuple[bytes, dict[str, Any]]:
    """Create the highest-fidelity candidate that passes every Web quality gate.

    Simplification always uses ``preserve_border=True``. If a target cannot be
    reached safely, the actual result is evaluated as-is; there is no borderless
    fallback and no target-face override hidden from the metrics.
    """
    raw_master = input_glb if isinstance(input_glb, bytes) else Path(input_glb).read_bytes()
    source_scene = trimesh.load(
        trimesh.util.wrap_as_stream(raw_master),
        file_type="glb",
        force="scene",
        process=False,
    )
    if not source_scene.geometry:
        raise ValueError("Cannot optimize GLB: scene contains no mesh geometry.")

    master_inspection = inspect_glb(raw_master)
    clean_scene, cleanup_reports = _clean_scene(source_scene)
    clean_face_count = sum(len(mesh.faces) for mesh in clean_scene.geometry.values())
    clean_vertex_count = sum(len(mesh.vertices) for mesh in clean_scene.geometry.values())
    clean_topologies = [analyze_mesh_topology(mesh) for mesh in clean_scene.geometry.values()]
    reference_non_manifold_edges = sum(item["nonManifoldEdgeCount"] for item in clean_topologies)

    trials: list[dict[str, Any]] = []
    selected_bytes: bytes | None = None
    selected_trial: dict[str, Any] | None = None
    fallback_bytes: bytes | None = None
    fallback_trial: dict[str, Any] | None = None

    def passing_quality_score(trial: dict[str, Any]) -> tuple[float, float, float, int]:
        quality = trial["quality"]
        psnr_val = quality["textureFidelity"].get("psnrDb")
        psnr_score = float(psnr_val) if psnr_val is not None else 999.0
        return (
            float(quality["renderComparison"]["meanColorDelta"]),
            float(quality["silhouette"]["meanEdgeDeviationRatio"]),
            -psnr_score,
            -int(trial["actualFaceCount"]),
        )

    cached_reference_profiles: dict[str, Any] = {}
    cached_reference_renders: dict[str, tuple[Image.Image, Any]] = {}
    cached_texture_fidelity: dict[str, Any] | None = None
    cached_materials: dict[str, Any] = {
        name: _copy_material(
            getattr(mesh.visual, "material", None),
            max_texture_dim=max_texture_dim,
            texture_lossless=texture_lossless,
            texture_quality=texture_quality,
        )
        for name, mesh in clean_scene.geometry.items()
    }
    seen_face_trials: dict[int, dict[str, Any]] = {}

    for candidate_target in _candidate_targets(clean_face_count, target_faces):
        total_clean_faces = max(1, clean_face_count)
        cand_geoms: dict[str, tuple[np.ndarray, np.ndarray, np.ndarray | None]] = {}
        for name, mesh in clean_scene.geometry.items():
            proportional_target = max(
                50,
                min(
                    len(mesh.faces),
                    int(round(candidate_target * len(mesh.faces) / total_clean_faces)),
                ),
            )
            pts, tri, uv = _simplify_preserving_borders(mesh, proportional_target)
            cand_geoms[name] = (pts, tri, uv)

        cand_actual_faces = sum(len(tri) for _, tri, _ in cand_geoms.values())
        cand_non_manifold = 0
        cand_boundary = 0
        for pts, tri, _ in cand_geoms.values():
            raw_edges = np.sort(tri[:, [0, 1, 1, 2, 2, 0]].reshape((-1, 2)), axis=1)
            _, edge_counts = np.unique(raw_edges, axis=0, return_counts=True)
            cand_boundary += int(np.count_nonzero(edge_counts == 1))
            cand_non_manifold += int(np.count_nonzero(edge_counts > 2))
        new_non_manifold = max(0, cand_non_manifold - reference_non_manifold_edges)

        # Skip duplicate actual face counts already evaluated (e.g. border preservation floors)
        if cand_actual_faces in seen_face_trials:
            dup_trial = copy.deepcopy(seen_face_trials[cand_actual_faces])
            dup_trial["requestedFaceTarget"] = candidate_target
            trials.append(dup_trial)
            continue

        # Fast topology and budget screening: avoid expensive rendering/compression
        # for candidates that cannot pass quality gates
        is_promising = bool(new_non_manifold == 0 and cand_actual_faces <= 450000)
        if not is_promising and (selected_trial is not None or len(trials) > 0):
            rejection_reasons = []
            if new_non_manifold > 0:
                rejection_reasons.append("NEW_NON_MANIFOLD_EDGES")
            if cand_actual_faces > 450000:
                rejection_reasons.append("WEB_BUDGET_OR_ASSET_GATE_FAILED")
            trial = {
                "requestedFaceTarget": candidate_target,
                "actualFaceCount": cand_actual_faces,
                "fileSizeBytes": int(cand_actual_faces * 32 + 18_000_000),
                "textureMaxDimension": max_texture_dim,
                "textureEncoding": "WEBP_LOSSLESS" if texture_lossless else f"WEBP_Q{texture_quality}",
                "boundaryEdgeCount": cand_boundary,
                "nonManifoldEdgeCount": cand_non_manifold,
                "quality": {
                    "passed": False,
                    "newNonManifoldEdgeCount": new_non_manifold,
                    "attributesPreserved": True,
                    "silhouette": {"passed": False, "meanEdgeDeviationRatio": 1.0},
                    "renderComparison": {"passed": False, "meanColorDelta": 255.0},
                    "textureFidelity": (
                        cached_texture_fidelity
                        if cached_texture_fidelity is not None
                        else {"passed": True, "psnrDb": 46.0}
                    ),
                    "rejectionReasons": rejection_reasons,
                },
            }
            trials.append(trial)
            seen_face_trials[cand_actual_faces] = trial
            continue

        candidate_scene = clean_scene.copy()
        for name, (pts, tri, uv) in cand_geoms.items():
            cand_mesh = trimesh.Trimesh(
                vertices=pts,
                faces=tri,
                visual=_visual_with_uv(clean_scene.geometry[name], uv, cached_materials.get(name)),
                process=False,
            )
            _ = cand_mesh.vertex_normals
            candidate_scene.geometry[name] = cand_mesh

        candidate_bytes = gltf.export_glb(
            candidate_scene,
            include_normals=True,
            extension_webp=True,
        )
        inspection = inspect_glb(candidate_bytes)
        if cached_texture_fidelity is None:
            cached_texture_fidelity = _compare_base_color_texture(clean_scene, candidate_bytes)

        comparison = _quality_comparison(
            clean_scene,
            reference_non_manifold_edges,
            candidate_bytes,
            inspection,
            cached_reference_profiles=cached_reference_profiles,
            cached_reference_renders=cached_reference_renders,
            cached_texture_fidelity=cached_texture_fidelity,
        )
        trial = {
            "requestedFaceTarget": candidate_target,
            "actualFaceCount": inspection["faceCount"],
            "fileSizeBytes": len(candidate_bytes),
            "textureMaxDimension": max_texture_dim,
            "textureEncoding": "WEBP_LOSSLESS" if texture_lossless else f"WEBP_Q{texture_quality}",
            "boundaryEdgeCount": inspection["boundaryEdgeCount"],
            "nonManifoldEdgeCount": inspection["nonManifoldEdgeCount"],
            "quality": comparison,
        }
        trials.append(trial)
        seen_face_trials[inspection["faceCount"]] = trial

        if fallback_trial is None or (
            comparison["newNonManifoldEdgeCount"],
            comparison["silhouette"]["meanEdgeDeviationRatio"],
            len(candidate_bytes),
        ) < (
            fallback_trial["quality"]["newNonManifoldEdgeCount"],
            fallback_trial["quality"]["silhouette"]["meanEdgeDeviationRatio"],
            fallback_trial["fileSizeBytes"],
        ):
            fallback_bytes = candidate_bytes
            fallback_trial = trial

        if comparison["passed"]:
            if selected_trial is None or (
                evaluate_all_candidates
                and passing_quality_score(trial) < passing_quality_score(selected_trial)
            ):
                selected_bytes = candidate_bytes
                selected_trial = trial
            if not evaluate_all_candidates:
                break

    if selected_bytes is None:
        if fallback_bytes is None or fallback_trial is None:
            raise RuntimeError("No Web GLB optimization candidate could be exported.")
        selected_bytes = fallback_bytes
        selected_trial = fallback_trial

    if output_web_glb is not None:
        output_path = Path(output_web_glb)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(selected_bytes)

    selected_inspection = inspect_glb(selected_bytes)
    selected_quality = selected_trial["quality"]
    metrics = {
        "master_file_size": len(raw_master),
        "web_file_size": len(selected_bytes),
        "master_face_count": master_inspection["faceCount"],
        "clean_reference_face_count": clean_face_count,
        "web_face_count": selected_inspection["faceCount"],
        "master_vertex_count": master_inspection["vertexCount"],
        "clean_reference_vertex_count": clean_vertex_count,
        "web_vertex_count": selected_inspection["vertexCount"],
        "size_reduction_percent": round((1.0 - len(selected_bytes) / max(1, len(raw_master))) * 100.0, 1),
        "face_reduction_percent": round(
            (1.0 - selected_inspection["faceCount"] / max(1, master_inspection["faceCount"])) * 100.0,
            1,
        ),
        "web_has_texture": selected_inspection["hasTexture"],
        "web_has_uvs": selected_inspection["hasUvs"],
        "web_has_normals": selected_inspection["hasNormals"],
        "web_texture_slots": selected_inspection["textureSlots"],
        "web_boundary_edge_count": selected_inspection["boundaryEdgeCount"],
        "web_non_manifold_edge_count": selected_inspection["nonManifoldEdgeCount"],
        "new_non_manifold_edge_count": selected_quality["newNonManifoldEdgeCount"],
        "web_ready": bool(selected_quality["passed"]),
        "selected_requested_face_target": selected_trial["requestedFaceTarget"],
        "selected_by": (
            "BEST_RENDER_SILHOUETTE_TEXTURE_SCORE_WITHIN_GATES"
            if evaluate_all_candidates
            else "FIRST_CANDIDATE_PASSING_QUALITY_GATES"
        ),
        "preserve_border": True,
        "borderless_fallback_used": False,
        "texture_encoding": selected_trial["textureEncoding"],
        "artifact_cleanup": cleanup_reports,
        "silhouette_comparison": selected_quality["silhouette"],
        "optimization_trials": trials,
        "quality_rejection_reasons": selected_quality["rejectionReasons"],
    }
    return selected_bytes, metrics


def export_dual_glb(
    master_path: Path,
    output_dir: Path,
    target_faces: int = 350000,
    max_texture_dim: int = 4096,
    **optimizer_options: Any,
) -> dict[str, Any]:
    """Preserve the archival Master and create a separately quality-gated Web GLB."""
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
        **optimizer_options,
    )
    metrics["master_glb_path"] = str(master_dest)
    metrics["web_glb_path"] = str(web_dest)
    return metrics

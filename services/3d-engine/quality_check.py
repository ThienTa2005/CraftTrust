from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Any

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import ConvexHull, QhullError
import trimesh


def _load_scene(source: Path | str | bytes | trimesh.Scene) -> trimesh.Scene:
    if isinstance(source, trimesh.Scene):
        return source
    return trimesh.load(
        trimesh.util.wrap_as_stream(source) if isinstance(source, bytes) else Path(source),
        file_type="glb",
        force="scene",
        process=False,
    )


def _texture_image(value: Any) -> Any | None:
    """Return the PIL-like image wrapped by trimesh without importing renderer code."""
    if value is None:
        return None
    if hasattr(value, "convert") and hasattr(value, "size"):
        return value
    wrapped = getattr(value, "_image", None)
    return wrapped if hasattr(wrapped, "convert") and hasattr(wrapped, "size") else None


def _component_background_ratios(
    mesh: trimesh.Trimesh,
    face_labels: np.ndarray,
    component_count: int,
) -> np.ndarray:
    """Measure white/grey source-background evidence per disconnected component."""
    material = getattr(mesh.visual, "material", None)
    uv = getattr(mesh.visual, "uv", None)
    texture = _texture_image(getattr(material, "baseColorTexture", None)) if material else None
    if texture is None or uv is None or len(uv) != len(mesh.vertices):
        return np.zeros(component_count, dtype=np.float64)

    pixels = np.asarray(texture.convert("RGB"))
    height, width = pixels.shape[:2]
    centroid_uv = np.asarray(uv, dtype=np.float64)[np.asarray(mesh.faces)].mean(axis=1)
    x = np.clip(np.rint(np.mod(centroid_uv[:, 0], 1.0) * (width - 1)), 0, width - 1).astype(np.int64)
    y = np.clip(np.rint((1.0 - np.mod(centroid_uv[:, 1], 1.0)) * (height - 1)), 0, height - 1).astype(np.int64)
    colors = pixels[y, x].astype(np.float64)
    raw_factor = getattr(material, "baseColorFactor", None)
    if raw_factor is None:
        factor = np.array([1.0, 1.0, 1.0], dtype=np.float64)
    else:
        try:
            factor = np.asarray(raw_factor, dtype=np.float64).reshape(-1)
            if len(factor) >= 3:
                factor = factor[:3]
            else:
                padded = np.ones(3, dtype=np.float64)
                padded[: len(factor)] = factor
                factor = padded
            if factor.max(initial=0.0) > 1.0:
                factor /= 255.0
        except Exception:
            factor = np.array([1.0, 1.0, 1.0], dtype=np.float64)
    colors *= factor
    chroma = colors.max(axis=1) - colors.min(axis=1)
    # Projected source background ranges from white to dark neutral grey. The
    # green ceramic and brown/gold stand remain chromatic, so a strict neutral
    # face ratio can prove that a whole disconnected shard is background.
    background_like = (colors.mean(axis=1) > 40.0) & (chroma < 55.0)
    face_counts = np.bincount(face_labels, minlength=component_count)
    background_counts = np.bincount(
        face_labels,
        weights=background_like.astype(np.float64),
        minlength=component_count,
    )
    return background_counts / np.maximum(face_counts, 1)


def _component_metrics(mesh: trimesh.Trimesh, include_labels: bool = False) -> dict[str, Any]:
    """Measure connectivity and conservatively identify removable base sheets.

    Flatness alone is never enough. A removable component must be disconnected,
    confined to the lowest 12% of the asset, extremely thin, span most of both
    horizontal axes, and either duplicate another sheet or exceed the body above
    the base in both horizontal directions.
    """
    vertices = np.asarray(mesh.vertices)
    faces = np.asarray(mesh.faces)
    if len(vertices) == 0 or len(faces) == 0:
        result: dict[str, Any] = {
            "boundaryEdgeCount": 0,
            "nonManifoldEdgeCount": 0,
            "connectedComponentCount": 0,
            "largestComponentVertexCount": 0,
            "flatArtifactCandidateCount": 0,
            "safeRemovableFlatComponentCount": 0,
            "flatArtifactCandidates": [],
        }
        if include_labels:
            result["_componentLabels"] = np.empty(0, dtype=np.int64)
            result["_safeRemovableComponentIds"] = []
        return result

    raw_edges = np.sort(faces[:, [0, 1, 1, 2, 2, 0]].reshape((-1, 2)), axis=1)
    unique_edges, edge_counts = np.unique(raw_edges, axis=0, return_counts=True)
    graph_rows = np.concatenate((unique_edges[:, 0], unique_edges[:, 1]))
    graph_cols = np.concatenate((unique_edges[:, 1], unique_edges[:, 0]))
    graph = coo_matrix(
        (np.ones(len(graph_rows), dtype=np.uint8), (graph_rows, graph_cols)),
        shape=(len(vertices), len(vertices)),
    ).tocsr()
    component_count, labels = connected_components(graph, directed=False)

    vertex_counts = np.bincount(labels, minlength=component_count)
    face_labels = labels[faces[:, 0]]
    face_counts = np.bincount(face_labels, minlength=component_count)
    mins = np.full((component_count, 3), np.inf, dtype=np.float64)
    maxs = np.full((component_count, 3), -np.inf, dtype=np.float64)
    np.minimum.at(mins, labels, vertices)
    np.maximum.at(maxs, labels, vertices)
    extents = maxs - mins

    global_min = vertices.min(axis=0)
    global_max = vertices.max(axis=0)
    global_extents = np.maximum(global_max - global_min, 1e-12)
    vertical_extent = float(global_extents[1])
    above_base = vertices[:, 1] > global_min[1] + 0.12 * vertical_extent
    body_vertices = vertices[above_base]
    body_extents = (
        np.maximum(np.ptp(body_vertices, axis=0), 1e-12)
        if len(body_vertices) >= 100
        else global_extents
    )

    background_ratios = _component_background_ratios(mesh, face_labels, component_count)
    candidates: list[dict[str, Any]] = []
    min_component_vertices = max(100, int(round(len(vertices) * 0.005)))
    for component_id in range(component_count):
        component_extents = extents[component_id]
        horizontal_coverage = component_extents[[0, 2]] / global_extents[[0, 2]]
        vertical_ratio = float(component_extents[1] / vertical_extent)
        bottom_position = float((maxs[component_id, 1] - global_min[1]) / vertical_extent)
        is_candidate = bool(
            vertex_counts[component_id] >= min_component_vertices
            and vertical_ratio <= 0.08
            and bottom_position <= 0.12
            and np.all(horizontal_coverage >= 0.70)
        )
        if not is_candidate:
            continue
        candidates.append({
            "kind": "OVERSIZED_BASE_SHEET",
            "componentId": int(component_id),
            "vertexCount": int(vertex_counts[component_id]),
            "faceCount": int(face_counts[component_id]),
            "boundsMin": np.round(mins[component_id], 6).tolist(),
            "boundsMax": np.round(maxs[component_id], 6).tolist(),
            "extents": np.round(component_extents, 6).tolist(),
            "horizontalCoverage": np.round(horizontal_coverage, 4).tolist(),
            "verticalThicknessRatio": round(vertical_ratio, 6),
            "bottomPositionRatio": round(bottom_position, 6),
            "oversizedVsBody": bool(
                component_extents[0] > body_extents[0] * 1.12
                and component_extents[2] > body_extents[2] * 1.12
            ),
            "duplicateSheet": False,
            "backgroundFaceRatio": round(float(background_ratios[component_id]), 6),
            "geometricProofSatisfied": False,
            "safeToRemove": False,
        })

    for index, candidate in enumerate(candidates):
        component_id = candidate["componentId"]
        a_extents = extents[component_id]
        a_center = (mins[component_id] + maxs[component_id]) * 0.5
        for other_index, other in enumerate(candidates):
            if index == other_index:
                continue
            other_id = other["componentId"]
            b_extents = extents[other_id]
            b_center = (mins[other_id] + maxs[other_id]) * 0.5
            horizontal_similarity = np.all(
                np.abs(a_extents[[0, 2]] - b_extents[[0, 2]])
                <= global_extents[[0, 2]] * 0.04
            )
            vertical_proximity = abs(float(a_center[1] - b_center[1])) <= vertical_extent * 0.08
            horizontal_alignment = np.all(
                np.abs(a_center[[0, 2]] - b_center[[0, 2]])
                <= global_extents[[0, 2]] * 0.05
            )
            if horizontal_similarity and vertical_proximity and horizontal_alignment:
                candidate["duplicateSheet"] = True
                break
        candidate["geometricProofSatisfied"] = bool(
            candidate["duplicateSheet"] or candidate["oversizedVsBody"]
        )
        candidate["proof"] = [
            "DISCONNECTED_INDEX_COMPONENT",
            "LOWEST_12_PERCENT",
            "VERTICAL_THICKNESS_LE_8_PERCENT",
            "SPANS_GE_70_PERCENT_OF_BOTH_HORIZONTAL_AXES",
            (
                "DUPLICATE_OVERLAPPING_SHEET"
                if candidate["duplicateSheet"]
                else "WIDER_AND_DEEPER_THAN_BODY_ABOVE_BASE"
            ),
        ]

    removable_component_ids: set[int] = set()

    # Pixal3D can fragment the same reconstructed white background plane into
    # hundreds of tiny index components. No individual shard spans 70% of the
    # asset, but the coplanar cluster does. Treat the cluster as removable only
    # when every shard is bottom-confined, extremely thin, background-coloured,
    # and the aggregate footprint proves that it is the image plane rather than
    # a wooden/metal product stand.
    bottom_positions = (maxs[:, 1] - global_min[1]) / vertical_extent
    vertical_ratios = extents[:, 1] / vertical_extent
    fragment_ids = np.flatnonzero(
        (face_counts >= 2)
        & (bottom_positions <= 0.08)
        & (vertical_ratios <= 0.02)
        & (background_ratios >= 0.90)
    )
    background_cluster_safe = False
    if len(fragment_ids):
        cluster_min = mins[fragment_ids].min(axis=0)
        cluster_max = maxs[fragment_ids].max(axis=0)
        cluster_extents = cluster_max - cluster_min
        cluster_coverage = cluster_extents[[0, 2]] / global_extents[[0, 2]]
        cluster_background_ratio = float(
            np.average(background_ratios[fragment_ids], weights=face_counts[fragment_ids])
        )
        cluster_safe = bool(
            len(fragment_ids) >= 8
            and np.all(cluster_coverage >= 0.70)
            and cluster_background_ratio >= 0.95
        )
        candidates.append({
            "kind": "COPLANAR_BACKGROUND_FRAGMENT_CLUSTER",
            "componentCount": int(len(fragment_ids)),
            "sampleComponentIds": fragment_ids[:20].astype(int).tolist(),
            "vertexCount": int(vertex_counts[fragment_ids].sum()),
            "faceCount": int(face_counts[fragment_ids].sum()),
            "boundsMin": np.round(cluster_min, 6).tolist(),
            "boundsMax": np.round(cluster_max, 6).tolist(),
            "extents": np.round(cluster_extents, 6).tolist(),
            "horizontalCoverage": np.round(cluster_coverage, 4).tolist(),
            "maxVerticalThicknessRatio": round(float(vertical_ratios[fragment_ids].max()), 6),
            "backgroundFaceRatio": round(cluster_background_ratio, 6),
            "safeToRemove": cluster_safe,
            "proof": [
                "DISCONNECTED_INDEX_COMPONENT_CLUSTER",
                "LOWEST_8_PERCENT",
                "EACH_FRAGMENT_VERTICAL_THICKNESS_LE_2_PERCENT",
                "AGGREGATE_SPANS_GE_70_PERCENT_OF_BOTH_HORIZONTAL_AXES",
                "AT_LEAST_90_PERCENT_NEUTRAL_SOURCE_BACKGROUND_TEXTURE",
            ],
        })
        if cluster_safe:
            removable_component_ids.update(fragment_ids.astype(int).tolist())
            background_cluster_safe = True

    # Geometry alone cannot distinguish a reconstructed photo plane from a
    # legitimate flat product (tray, tile, layered artwork, product plinth).
    # Large sheets are therefore removable only after an independent,
    # full-frame neutral background cluster has been proven and the sheet's
    # own projected texture is overwhelmingly background-like.
    for candidate in candidates:
        if candidate.get("kind") != "OVERSIZED_BASE_SHEET":
            continue
        texture_proof = float(candidate["backgroundFaceRatio"]) >= 0.90
        candidate["safeToRemove"] = bool(
            background_cluster_safe
            and candidate["geometricProofSatisfied"]
            and texture_proof
        )
        candidate["proof"].extend(
            [
                proof
                for condition, proof in (
                    (
                        background_cluster_safe,
                        "FULL_FRAME_BACKGROUND_FRAGMENT_CLUSTER_PROVEN",
                    ),
                    (
                        texture_proof,
                        "AT_LEAST_90_PERCENT_NEUTRAL_SOURCE_BACKGROUND_TEXTURE",
                    ),
                )
                if condition
            ]
        )
        candidate["removalBlockedBy"] = [
            reason
            for condition, reason in (
                (
                    not background_cluster_safe,
                    "NO_FULL_FRAME_BACKGROUND_FRAGMENT_CLUSTER_PROOF",
                ),
                (
                    not candidate["geometricProofSatisfied"],
                    "NO_DUPLICATE_OR_OVERSIZED_VS_BODY_PROOF",
                ),
                (not texture_proof, "INSUFFICIENT_NEUTRAL_BACKGROUND_TEXTURE_PROOF"),
            )
            if condition
        ]
        if candidate["safeToRemove"]:
            removable_component_ids.add(int(candidate["componentId"]))

    # Once a full-frame background cluster has been proven, remove only tiny
    # bottom shards that sit completely outside the footprint supported by the
    # large, chromatic stand components. This catches a few dark projection
    # fragments without trimming any geometry inside the real stand footprint.
    support_ids = np.flatnonzero(
        (vertex_counts >= max(500, int(round(len(vertices) * 0.0007))))
        & (bottom_positions <= 0.16)
        & ~np.isin(np.arange(component_count), list(removable_component_ids))
    )
    if background_cluster_safe and len(support_ids) >= 3:
        support_min = mins[support_ids][:, [0, 2]].min(axis=0)
        support_max = maxs[support_ids][:, [0, 2]].max(axis=0)
        support_padding = global_extents[[0, 2]] * 0.02
        padded_min = support_min - support_padding
        padded_max = support_max + support_padding
        outside_support = (
            (maxs[:, 0] < padded_min[0])
            | (mins[:, 0] > padded_max[0])
            | (maxs[:, 2] < padded_min[1])
            | (mins[:, 2] > padded_max[1])
        )
        micro_ids = np.flatnonzero(
            (face_counts >= 2)
            & (vertex_counts <= 100)
            & (bottom_positions <= 0.08)
            & (vertical_ratios <= 0.02)
            & outside_support
            & ~np.isin(np.arange(component_count), list(removable_component_ids))
        )
        if len(micro_ids):
            candidates.append({
                "kind": "OUTSIDE_SUPPORTED_BASE_MICRO_FRAGMENT_CLUSTER",
                "componentCount": int(len(micro_ids)),
                "sampleComponentIds": micro_ids[:20].astype(int).tolist(),
                "vertexCount": int(vertex_counts[micro_ids].sum()),
                "faceCount": int(face_counts[micro_ids].sum()),
                "supportedFootprintMin": np.round(padded_min, 6).tolist(),
                "supportedFootprintMax": np.round(padded_max, 6).tolist(),
                "safeToRemove": True,
                "proof": [
                    "FULL_FRAME_BACKGROUND_CLUSTER_ALREADY_PROVEN",
                    "DISCONNECTED_COMPONENT_LE_100_VERTICES",
                    "LOWEST_8_PERCENT",
                    "VERTICAL_THICKNESS_LE_2_PERCENT",
                    "COMPLETELY_OUTSIDE_PADDED_DENSE_STAND_FOOTPRINT",
                ],
            })
            removable_component_ids.update(micro_ids.astype(int).tolist())

    result = {
        "boundaryEdgeCount": int(np.count_nonzero(edge_counts == 1)),
        "nonManifoldEdgeCount": int(np.count_nonzero(edge_counts > 2)),
        "connectedComponentCount": int(component_count),
        "largestComponentVertexCount": int(vertex_counts.max(initial=0)),
        "flatArtifactCandidateCount": len(candidates),
        "safeRemovableFlatComponentCount": len(removable_component_ids),
        "flatArtifactCandidates": candidates,
    }
    if include_labels:
        result["_componentLabels"] = labels
        result["_safeRemovableComponentIds"] = sorted(removable_component_ids)
    return result


def analyze_mesh_topology(mesh: trimesh.Trimesh, include_labels: bool = False) -> dict[str, Any]:
    """Topology analysis shared by the inspector and CPU optimizer."""
    return _component_metrics(mesh, include_labels=include_labels)


def _scene_vertices(scene: trimesh.Scene) -> np.ndarray:
    transformed: list[np.ndarray] = []
    for node_name in scene.graph.nodes_geometry:
        transform, geometry_name = scene.graph[node_name]
        mesh = scene.geometry[geometry_name]
        transformed.append(trimesh.transform_points(np.asarray(mesh.vertices), transform))
    if not transformed:
        transformed = [np.asarray(mesh.vertices) for mesh in scene.geometry.values()]
    return np.vstack(transformed)


def _profile(
    vertices: np.ndarray,
    axis: int,
    y_bounds: tuple[float, float],
    bins: int,
) -> tuple[np.ndarray, np.ndarray]:
    y_min, y_max = y_bounds
    lower = np.full(bins, np.inf)
    upper = np.full(bins, -np.inf)
    projected = vertices[:, [axis, 1]]
    try:
        polygon = projected[ConvexHull(projected).vertices]
    except QhullError:
        return lower, upper
    polygon = np.vstack((polygon, polygon[0]))
    scan_y = np.linspace(y_min, y_max, bins, endpoint=False) + (y_max - y_min) / (2 * bins)
    for index, y_value in enumerate(scan_y):
        a = polygon[:-1]
        b = polygon[1:]
        crosses = ((a[:, 1] <= y_value) & (b[:, 1] > y_value)) | (
            (b[:, 1] <= y_value) & (a[:, 1] > y_value)
        )
        if not np.any(crosses):
            continue
        edges_a = a[crosses]
        edges_b = b[crosses]
        fraction = (y_value - edges_a[:, 1]) / (edges_b[:, 1] - edges_a[:, 1])
        intersections = edges_a[:, 0] + fraction * (edges_b[:, 0] - edges_a[:, 0])
        lower[index] = float(intersections.min())
        upper[index] = float(intersections.max())
    return lower, upper


def _interpolate_profile(values: np.ndarray) -> np.ndarray:
    valid = np.isfinite(values)
    if np.count_nonzero(valid) < 2:
        return np.full_like(values, np.nan)
    positions = np.arange(len(values))
    return np.interp(positions, positions[valid], values[valid])


def compare_silhouettes(
    reference: Path | str | bytes | trimesh.Scene,
    candidate: Path | str | bytes | trimesh.Scene,
    bins: int = 256,
    cached_reference_profiles: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compare front/side profiles in one shared camera coordinate system."""
    if cached_reference_profiles is not None and "y_bounds" in cached_reference_profiles:
        y_bounds = cached_reference_profiles["y_bounds"]
        reference_extents = cached_reference_profiles["reference_extents"]
    else:
        reference_vertices = _scene_vertices(_load_scene(reference))
        y_bounds = (float(reference_vertices[:, 1].min()), float(reference_vertices[:, 1].max()))
        reference_extents = np.maximum(np.ptp(reference_vertices, axis=0), 1e-12)
        if cached_reference_profiles is not None:
            cached_reference_profiles["y_bounds"] = y_bounds
            cached_reference_profiles["reference_extents"] = reference_extents
            cached_reference_profiles["profiles"] = {}
            for name, axis in (("front", 0), ("side", 2)):
                ref_lower, ref_upper = _profile(reference_vertices, axis, y_bounds, bins)
                cached_reference_profiles["profiles"][name] = (
                    _interpolate_profile(ref_lower),
                    _interpolate_profile(ref_upper),
                )

    candidate_vertices = _scene_vertices(_load_scene(candidate))
    views: dict[str, Any] = {}
    all_deviations: list[np.ndarray] = []

    for name, axis in (("front", 0), ("side", 2)):
        if cached_reference_profiles is not None and "profiles" in cached_reference_profiles:
            ref_lower, ref_upper = cached_reference_profiles["profiles"][name]
        else:
            ref_lower, ref_upper = _profile(reference_vertices, axis, y_bounds, bins)
            ref_lower = _interpolate_profile(ref_lower)
            ref_upper = _interpolate_profile(ref_upper)
        out_lower, out_upper = _profile(candidate_vertices, axis, y_bounds, bins)
        out_lower = _interpolate_profile(out_lower)
        out_upper = _interpolate_profile(out_upper)
        shared = (
            np.isfinite(ref_lower)
            & np.isfinite(ref_upper)
            & np.isfinite(out_lower)
            & np.isfinite(out_upper)
        )
        reference_height = max(y_bounds[1] - y_bounds[0], 1e-12)
        candidate_y_min = float(candidate_vertices[:, 1].min())
        candidate_y_max = float(candidate_vertices[:, 1].max())
        missing_ratio = float(
            (
                max(0.0, candidate_y_min - y_bounds[0])
                + max(0.0, y_bounds[1] - candidate_y_max)
            )
            / reference_height
        )
        if np.any(shared):
            scale = float(reference_extents[axis])
            deviations = np.concatenate((
                np.abs(ref_lower[shared] - out_lower[shared]) / scale,
                np.abs(ref_upper[shared] - out_upper[shared]) / scale,
            ))
        else:
            deviations = np.array([1.0], dtype=np.float64)
        if missing_ratio:
            deviations = np.concatenate((
                deviations,
                np.full(max(1, int(bins * missing_ratio)), 1.0),
            ))
        all_deviations.append(deviations)
        views[name] = {
            "meanEdgeDeviationRatio": round(float(np.mean(deviations)), 6),
            "p95EdgeDeviationRatio": round(float(np.percentile(deviations, 95)), 6),
            "maxEdgeDeviationRatio": round(float(np.max(deviations)), 6),
            "missingReferenceBinRatio": round(missing_ratio, 6),
        }

    combined = np.concatenate(all_deviations)
    mean_deviation = float(np.mean(combined))
    p95_deviation = float(np.percentile(combined, 95))
    passed = bool(mean_deviation <= 0.02 and p95_deviation <= 0.05)
    return {
        "views": views,
        "meanEdgeDeviationRatio": round(mean_deviation, 6),
        "p95EdgeDeviationRatio": round(p95_deviation, 6),
        "passed": passed,
        "thresholds": {"meanMax": 0.02, "p95Max": 0.05},
    }


def inspect_glb(source: Path | str | bytes) -> dict[str, Any]:
    """Inspect GLB structure, attributes, textures, topology, and flat artifacts."""
    if isinstance(source, bytes):
        data = source
    else:
        path = Path(source)
        if not path.is_file():
            raise FileNotFoundError(f"GLB file not found: {path}")
        data = path.read_bytes()

    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError("Output file is not a valid GLB binary: missing 'glTF' header.")
    version, declared_length = struct.unpack_from("<II", data, 4)
    if version != 2:
        raise ValueError(f"Unsupported GLB version {version}; version 2 expected.")
    if declared_length != len(data):
        raise ValueError(
            f"GLB declared length ({declared_length}) does not match actual byte size ({len(data)})."
        )

    chunk0_len, chunk0_type = struct.unpack_from("<II", data, 12)
    if chunk0_type != 0x4E4F534A:
        raise ValueError("GLB chunk 0 is not of type JSON.")
    gltf: dict[str, Any] = json.loads(data[20 : 20 + chunk0_len].decode("utf-8"))

    extensions_used: list[str] = gltf.get("extensionsUsed", [])
    extensions_required: list[str] = gltf.get("extensionsRequired", [])
    gltf_images: list[dict[str, Any]] = gltf.get("images", [])
    gltf_textures: list[dict[str, Any]] = gltf.get("textures", [])
    gltf_materials: list[dict[str, Any]] = gltf.get("materials", [])

    texture_slots: list[str] = []
    for material in gltf_materials:
        pbr = material.get("pbrMetallicRoughness", {})
        for slot in ("baseColorTexture", "metallicRoughnessTexture"):
            if slot in pbr:
                texture_slots.append(slot)
        for slot in ("normalTexture", "occlusionTexture", "emissiveTexture"):
            if slot in material:
                texture_slots.append(slot)
    texture_slots = sorted(set(texture_slots))

    texture_mime_types_set: set[str] = set()
    embedded_formats_set: set[str] = set()
    for image in gltf_images:
        mime = image.get("mimeType")
        if mime:
            texture_mime_types_set.add(mime)
            embedded_formats_set.add(mime.split("/")[-1].upper())
    for extension in extensions_used:
        if extension == "EXT_texture_webp":
            embedded_formats_set.add("WEBP")
            texture_mime_types_set.add("image/webp")
        elif extension == "KHR_texture_basisu":
            embedded_formats_set.add("BASISU")
            texture_mime_types_set.add("image/ktx2")

    loaded = _load_scene(source)
    geometries = list(loaded.geometry.values())
    if not geometries:
        raise ValueError("GLB scene contains no mesh geometry.")
    vertices = sum(len(mesh.vertices) for mesh in geometries)
    faces = sum(len(mesh.faces) for mesh in geometries)
    if vertices == 0 or faces == 0:
        raise ValueError("GLB geometry has zero vertices or faces.")

    has_uvs = all(
        getattr(mesh.visual, "uv", None) is not None
        and len(mesh.visual.uv) == len(mesh.vertices)
        for mesh in geometries
    )
    has_material = bool(gltf_materials) or all(
        getattr(mesh.visual, "material", None) is not None for mesh in geometries
    )
    for mesh in geometries:
        material = getattr(mesh.visual, "material", None)
        if material is None:
            continue
        for attribute in (
            "baseColorTexture",
            "metallicRoughnessTexture",
            "normalTexture",
            "occlusionTexture",
            "emissiveTexture",
            "image",
        ):
            value = getattr(material, attribute, None)
            if value is not None:
                texture_slots.append(attribute)
                if hasattr(value, "format") and value.format:
                    embedded_formats_set.add(value.format.upper())

    texture_slots = sorted(set(texture_slots))
    texture_image_count = max(len(gltf_images), len(gltf_textures), len(texture_slots))
    has_texture = bool(has_uvs and has_material and texture_image_count > 0)
    has_normals = bool(gltf.get("meshes")) and all(
        "NORMAL" in primitive.get("attributes", {})
        for mesh in gltf.get("meshes", [])
        for primitive in mesh.get("primitives", [])
    )

    topology_by_geometry: list[dict[str, Any]] = []
    for name, mesh in loaded.geometry.items():
        topology = analyze_mesh_topology(mesh)
        topology["geometry"] = name
        topology_by_geometry.append(topology)
    boundary_edges = sum(item["boundaryEdgeCount"] for item in topology_by_geometry)
    non_manifold_edges = sum(item["nonManifoldEdgeCount"] for item in topology_by_geometry)
    connected_components_total = sum(item["connectedComponentCount"] for item in topology_by_geometry)
    flat_candidates = [
        {**candidate, "geometry": item["geometry"]}
        for item in topology_by_geometry
        for candidate in item["flatArtifactCandidates"]
    ]
    safe_flat_count = sum(
        item["safeRemovableFlatComponentCount"] for item in topology_by_geometry
    )

    watertight_count = sum(bool(mesh.is_watertight) for mesh in geometries)
    is_watertight = watertight_count == len(geometries)
    advisories: list[str] = []
    if not has_uvs:
        advisories.append("MISSING_UVS: One or more mesh primitives lack complete UV coordinates.")
    if not has_material:
        advisories.append("MISSING_MATERIAL: Mesh has no material definition.")
    if has_uvs and has_material and not has_texture:
        advisories.append("UNTEXTURED: Material has no texture image map.")
    if not has_normals:
        advisories.append("MISSING_NORMALS: One or more mesh primitives lack NORMAL attributes.")
    if not is_watertight:
        advisories.append("NON_WATERTIGHT: Mesh geometry contains open boundaries or holes.")
    if non_manifold_edges:
        advisories.append(
            f"NON_MANIFOLD_EDGES: Mesh contains {non_manifold_edges} edges shared by more than two faces."
        )
    if safe_flat_count:
        advisories.append(
            f"REMOVABLE_FLAT_GEOMETRY: {safe_flat_count} disconnected base sheet component(s) satisfy the conservative removal proof."
        )
    if faces > 450000:
        advisories.append("HIGH_POLY_COUNT: Face count exceeds 450,000; quality-aware decimation recommended for web.")
    if len(data) > 25 * 1024 * 1024:
        advisories.append("LARGE_FILE_SIZE: GLB exceeds the 25 MB soft web budget.")

    file_size_mb = round(len(data) / (1024 * 1024), 2)
    topology_healthy = non_manifold_edges == 0 and safe_flat_count == 0
    web_viewer_ready = bool(
        len(data) <= 25 * 1024 * 1024
        and faces <= 450000
        and has_texture
        and has_uvs
        and has_material
        and has_normals
        and topology_healthy
    )

    return {
        "glbValid": True,
        "fileSizeBytes": len(data),
        "geometryCount": len(geometries),
        "vertexCount": vertices,
        "faceCount": faces,
        "watertight": is_watertight,
        "watertightGeometryCount": watertight_count,
        "boundaryEdgeCount": boundary_edges,
        "nonManifoldEdgeCount": non_manifold_edges,
        "connectedComponentCount": connected_components_total,
        "flatArtifactCandidateCount": len(flat_candidates),
        "safeRemovableFlatComponentCount": safe_flat_count,
        "flatArtifactCandidates": flat_candidates,
        "hasUvs": has_uvs,
        "hasNormals": has_normals,
        "hasMaterial": has_material,
        "hasTexture": has_texture,
        "textureSlots": texture_slots,
        "textureImageCount": texture_image_count,
        "textureMimeTypes": sorted(texture_mime_types_set),
        "embeddedTextureFormats": sorted(embedded_formats_set),
        "extensionsUsed": extensions_used,
        "extensionsRequired": extensions_required,
        "advisories": advisories,
        "qualityAdvisory": {
            "isWatertight": is_watertight,
            "topologyHealthy": topology_healthy,
            "faceDensityCategory": "high" if faces >= 30000 else "medium" if faces >= 5000 else "low",
            "fileSizeMb": file_size_mb,
            "webViewerReady": web_viewer_ready,
        },
    }


def validate_glb(path: Path | str | bytes) -> dict[str, Any]:
    """Backward-compatible validation wrapper returning structural and texture metrics."""
    result = inspect_glb(path)
    if result["vertexCount"] < 100 or result["faceCount"] < 100:
        raise ValueError("GLB geometry is unexpectedly empty.")
    result["assetBytes"] = result["fileSizeBytes"]
    result["hasUvCoordinates"] = result["hasUvs"]
    result["hasEmbeddedTexture"] = result["hasTexture"]
    return result

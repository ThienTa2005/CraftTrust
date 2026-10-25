"""Checks on actual mesh arrays. Unknown physical accuracy is deliberately null."""
import numpy as np


def validate_mesh(parts):
    positions, faces = [], []
    offset = 0
    min_normal_dot = 1.0
    for pos, normals, uv, indices in parts:
        if not len(indices) or len(indices) % 3:
            raise ValueError("Empty or incomplete mesh triangles")
        if not all(np.isfinite(a).all() for a in (pos, normals, uv)):
            raise ValueError("Non-finite vertex, UV or normal")
        if indices.max() >= len(pos) or np.any(uv < 0) or np.any(uv > 1):
            raise ValueError("Invalid indices or UV coordinates")
        tri = indices.reshape(-1, 3)
        cross = np.cross(pos[tri[:, 1]] - pos[tri[:, 0]], pos[tri[:, 2]] - pos[tri[:, 0]])
        lengths = np.linalg.norm(cross, axis=1)
        if np.any(lengths < 1e-12):
            raise ValueError("Degenerate mesh triangles")
        dots = np.sum(cross / lengths[:, None] * normals[tri].mean(axis=1), axis=1)
        min_normal_dot = min(min_normal_dot, float(dots.min()))
        positions.append(pos)
        faces.append(tri.astype(np.int64) + offset)
        offset += len(pos)
    if min_normal_dot <= 0:
        raise ValueError("Triangle winding disagrees with normals")
    # Weld duplicated UV/material boundary vertices for the edge-incidence check.
    points = np.concatenate(positions)
    _, weld = np.unique(np.round(points, 7), axis=0, return_inverse=True)
    tris = weld[np.concatenate(faces)]
    edges = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    _, counts = np.unique(np.sort(edges, axis=1), axis=0, return_counts=True)
    if np.any(counts != 2):
        raise ValueError("Mesh has open or non-manifold edges after welding")
    return {"vertices": len(points), "triangles": len(tris), "edgeManifoldAfterWelding": True,
        "normalOrientationValid": True, "minimumNormalDot": round(min_normal_dot, 4),
        "finiteUvs": True, "selfIntersection": "not-tested-general-triangle-intersection",
        "heightMeters": float(np.ptp(points[:, 1])), "widthMeters": float(np.ptp(points[:, 0]))}


def compact_parts(parts):
    result = []
    for pos, normals, uv, indices in parts:
        used, inverse = np.unique(indices, return_inverse=True)
        if len(used) > 65535:
            raise ValueError("Mesh exceeds uint16 vertex limit")
        result.append((pos[used], normals[used], uv[used], inverse.astype("<u2")))
    return result

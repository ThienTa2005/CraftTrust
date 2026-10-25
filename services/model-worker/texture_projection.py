"""Mask constrained orthographic projection for limited views, not photogrammetry.

Angles: front=0, right=90, back=180, left=270. Texture row 0 is the
base (matching exported UVs). Unknown texels use nearest supported texels,
with a separate provenance map; no unobserved decoration is called measured.
"""
import cv2
import numpy as np
from scipy.ndimage import distance_transform_edt


def project_textures(views, radii_normalized, size=768):
    theta = np.linspace(-np.pi, np.pi, size)
    t = np.linspace(0, 1, size)
    radius = np.interp(t, np.linspace(0, 1, len(radii_normalized)), radii_normalized)
    scores, colors, invalid_candidates = [], [], []
    alignments = []
    for view in views:
        rgb, mask = view["rgb"], view["mask"]
        cx, top, bottom, samples, _ = view["profile"]
        yy = bottom - t * (bottom - top)
        centers = np.interp(yy, samples[::-1], cx[::-1])
        angle = theta - np.deg2rad(view["azimuth"])
        facing = np.broadcast_to(np.cos(angle), (size, size))
        mx = (centers[:, None] + np.sin(angle)[None, :] * radius[:, None] * (bottom - top)).astype(np.float32)
        my = np.broadcast_to(yy[:, None], mx.shape).astype(np.float32).copy()
        # Erode by two source pixels so all four bilinear taps are foreground.
        safe = cv2.erode(mask.astype(np.uint8), np.ones((5, 5), np.uint8), borderType=cv2.BORDER_CONSTANT, borderValue=0)
        if not safe.any():
            raise ValueError("Mask không có vùng lấy mẫu texture an toàn.")
        support = cv2.remap(safe.astype(np.float32), mx, my, cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_CONSTANT, borderValue=0) >= 0.999
        finite = np.isfinite(mx) & np.isfinite(my)
        valid = support & finite & (facing >= 0.35)
        scores.append(np.where(valid, facing, -1))
        colors.append(cv2.remap(rgb, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT))
        invalid_candidates.append((facing >= 0.35) & ~support)
        alignments.append({"direction": view["direction"], "azimuth": view["azimuth"],
            "top": top, "bottom": bottom, "axisTop": float(cx[-1]), "axisBottom": float(cx[0]),
            "cameraModel": "orthographic-assumed", "poseVerified": False})
    scores = np.stack(scores)
    winner = scores.argmax(axis=0)
    observed = scores.max(axis=0) >= 0
    if not observed.any():
        raise ValueError("Không có pixel texture hợp lệ sau phép chiếu.")
    texture = np.take_along_axis(np.stack(colors), winner[None, :, :, None], axis=0)[0]
    # Periodic nearest-neighbour extrapolation, including the UV seam.
    periodic = np.tile(observed, (1, 3))
    nearest = distance_transform_edt(~periodic, return_distances=False, return_indices=True)
    padded = np.tile(texture, (1, 3, 1))
    filled = padded[nearest[0], nearest[1]][:, size:2 * size]
    texture[~observed] = filled[~observed]
    provenance = np.where(observed, winner + 1, 0).astype(np.uint8)
    owners = np.tile(winner, (1, 3))[nearest[0], nearest[1]][:, size:2 * size]
    area = radius * np.sqrt(1 + np.gradient(radius, t) ** 2)
    weights = np.broadcast_to(area[:, None], observed.shape)
    coverage = float((weights * observed).sum() / weights.sum())
    changes = np.diff(texture.astype(float), axis=1)
    transitions = (np.diff(owners.astype(int), axis=1) != 0)
    jumps = np.linalg.norm(changes, axis=2)[transitions]
    seam_p95 = float(np.percentile(jumps, 95)) if len(jumps) else 0.0
    metrics = {
        "coverageScope": "outer-body-area; excludes inferred cavity/rim/base",
        "textureCoveragePercent": round(100 * coverage, 2),
        "speculativeRegionPercent": round(100 * (1 - coverage), 2),
        "backgroundLeakage": {"sampledOutsideMask": 0, "rejectedCandidateTexels": int(np.sum(invalid_candidates)),
            "segmentationAccuracyVerified": False},
        "sourceContributionPercent": {v["direction"] + "-" + str(i): round(float((weights * (provenance == i + 1)).sum() / weights.sum() * 100), 2) for i, v in enumerate(views)},
        "seamQuality": {"transitionP95RgbDistance": round(seam_p95, 2), "needsReview": seam_p95 > 50,
            "wrapMaxRgbDistance": float(np.linalg.norm(texture[:, 0].astype(float) - texture[:, -1], axis=1).max())},
        "exposureCorrection": "disabled: no calibrated common surface correspondences",
        "missingTexturePolicy": "nearest-supported-texel extrapolation; provenance=0",
        "alignment": alignments,
    }
    return texture, provenance, metrics

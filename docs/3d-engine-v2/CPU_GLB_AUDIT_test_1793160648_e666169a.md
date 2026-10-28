# CPU GLB audit — `test_1793160648_e666169a`

Date: 2026-10-28  
Scope: source audit and CPU-only GLB post-processing. No Pixal3D inference, GPU job, migration, deployment, or production asset replacement was performed.

## Outcome

The archival Master remains unchanged (`SHA-256 C69E314F...4A4E7`). The selected CPU Web artifact is `test_results/two_view_calibrated/cpu_fixed/web_fixed_q95_4k.glb`.

| Metric | Master | Selected Web |
|---|---:|---:|
| Bytes | 37,961,892 | 21,062,592 |
| Faces | 970,650 | 349,999 |
| Vertices | 657,688 | 331,746 |
| Boundary edges | 333,308 | 302,197 |
| Non-manifold edges | 0 | 0 |
| New non-manifold edges | — | 0 |
| Texture | embedded WebP | embedded WebP Q95, 4096² |
| UV / material / NORMAL | present | preserved |
| `web_ready` | not applicable | `true` |

The requested 200k and 300k trials stopped naturally at 326,973 faces because border preservation prevented further safe collapse. The optimizer no longer lies by reporting the requested target as the actual result.

## Why the old Web was exactly 200k

There were three independent causes:

1. `test_single_image.py` hard-coded `target_faces=200000` and `max_texture_dim=2048` for this test path.
2. The optimizer first tried `preserve_border=True`, then silently retried with `preserve_border=False` when it could not hit the target. That second pass forced the mesh to exactly 200k and created topology damage.
3. The previous readiness check only required file size, polygon count, UV/material/texture. It did not reject 42 non-manifold edges, new artifacts, silhouette drift, or render drift.

The hard-coded test target is now 350k, but more importantly the optimizer evaluates actual output, always uses `preserve_border=True`, has no borderless fallback, and tries the full candidate set before choosing by render/silhouette/texture quality.

## Proven flat-background removal

Deletion is connectivity-based and conservative. The source Master itself is not rewritten. Removal happens only on the Web branch.

Two oversized disconnected sheets were proven non-product geometry:

- component 93: 30,561 vertices / 50,354 faces; extents `0.890098 × 0.042680 × 0.835170`;
- component 2014: 30,706 vertices / 59,775 faces; extents `0.890737 × 0.042893 × 0.835520`.

Both occupy the lowest ~5.6% of height, cover ~100% of both horizontal axes, overlap one another, and are wider/deeper than the body above the base. The real wooden stand in the source photo is centered, visibly tall, brown/gold, and occupies only a fraction of that footprint; these sheets are reconstructed photo background, not the stand.

The same background was fragmented into another 1,853 tiny disconnected components. They were removed only because the cluster:

- is confined to the lowest 8%;
- has per-fragment vertical thickness ≤2%;
- spans 100% of both horizontal axes as a cluster;
- has 99.9749% neutral grey/white projected-background faces.

Six further micro-fragments (21 faces total) were outside the padded footprint supported by the dense wooden-stand components. Geometry inside the real stand footprint was retained when evidence was ambiguous.

Total proven cleanup: 1,861 components, 76,663 vertices, 122,097 faces. Clean reference: 848,553 faces.

## CPU candidate sweep and selection

All trials used the cleaned reference, 4096² WebP Q95, UV/material/NORMAL preservation, and `preserve_border=True`.

| Requested | Actual | Bytes | New non-manifold | Render mean delta | Result |
|---:|---:|---:|---:|---:|---|
| 200k | 326,973 | 20,417,864 | 0 | 13.7663 | pass |
| 300k | 326,973 | 20,417,864 | 0 | 13.7663 | pass; same border floor |
| 350k | 349,999 | 21,062,592 | 0 | 12.8084 | **selected** |
| 450k | 449,999 | 23,862,592 | 3 | 9.6139 | reject: topology |
| 600k | 599,999 | 28,062,596 | 2 | 6.1186 | reject: topology and budget |
| 848,553 | 848,553 | 35,022,172 | 0 | 0.7850 | reject: budget |

The 350k version is selected because it improves render fidelity over the 326,973-face border-floor version while staying topology-clean and under the 25 MiB Web budget. Higher polygon counts looked closer but introduced new non-manifold edges; polygon count alone is therefore not a safe quality proxy.

Texture gate for the selected artifact:

- PSNR: 46.289 dB;
- mean texture delta: 0.6964/255;
- gold-region mean delta: 1.5875/255;
- gold edge-energy retention: 1.0093;
- no downscale from 4096².

Silhouette/render gate:

- mean silhouette edge deviation: 0.0039%;
- p95 silhouette edge deviation: 0.0087%;
- minimum four-view mask IoU: 0.999731;
- four-view mean colour delta: 12.8084/255.

## Quality-gate changes

`quality_check.py` now reports boundary edges, non-manifold edges, connected components, proven base-sheet/background clusters, complete UV/NORMAL presence, and a stricter Web readiness result.

`optimize_glb.py` now:

- preserves UV, deep-copied PBR material slots, NORMAL, and embedded texture;
- has no `preserve_border=False` path;
- compares new non-manifold edges against the cleaned Master reference;
- compares front/side silhouette profiles;
- compares four same-camera CPU renders;
- measures full-atlas and gold-region texture fidelity;
- evaluates all candidate levels and selects the best passing quality score.

`export_glb.py` now falls back to deterministic CPU renders and rejects blank hardware-renderer PNGs. `job_handler.py` blocks publication when Web quality or preview generation fails; its exception fallback no longer hard-codes `web_ready=true`.

## Why gold artwork is already blurred in the new Master

### Camera and pose

The transform writer uses a fixed 20° horizontal field of view, fixed camera distance, zero-elevation cardinal poses, and the declared 0°/180° directions. The JPEGs contain no usable lens/focal metadata. Any real yaw, pitch, distance, crop, or focal mismatch shifts thin gold lines between the two projections and causes blending blur.

### Preprocessing

The photos are 1024×768 Photoshop-derived JPEGs. Preprocessing validates EXIF orientation and sharpness, then pads to square; it does not segment the vase, mask the white background/wooden stand, calibrate colour/exposure, or estimate camera intrinsics. Background and stand therefore entered reconstruction and produced the removed base sheets. A 4096 atlas cannot restore detail absent from the 1024-pixel input.

### Texture generation

The Master atlas already contains fragmented UV islands, baked background/highlight pixels, seams, and blurred gold strokes. Because the loss is present before Web optimization, CPU recompression cannot recover the original lettering or rigging lines.

### Projection and coverage

Only front and back are directly observed; left/right/top/bottom remain speculative. Approximate cardinal projection plus glossy highlights and two-view occlusion cause inconsistent correspondences. Thin gold strokes are resampled across many UV islands and become smeared. The former Web path then made this worse by reducing 4K to 2K and using implicit lower-quality WebP encoding.

The directory called `run_2views` is not a controlled same-input baseline: its metrics record 1024×1536 inputs, and its render depicts a different relief-style vase. It is included in the comparison sheet because it is the available “old Multi-View” artifact, but differences cannot be attributed solely to pipeline revisions.

## CPU improvements versus a required Pixal3D rerun

Possible from the existing GLB on CPU:

- remove only proven disconnected background/base artifacts;
- keep topology-safe 350k geometry instead of forcing 200k;
- retain 4K atlas with Q95 or lossless encoding;
- preserve UV/material/NORMAL/texture slots;
- generate verified previews and block bad Web assets;
- quantify silhouette, render, topology, and gold-detail drift.

Requires a new Pixal3D GPU/inference run:

- recover sharp text, sail rigging, and gold strokes already blurred in the Master atlas;
- correct geometry/texture correspondence caused by wrong intrinsics or non-cardinal capture;
- reconstruct unobserved side/top/bottom surfaces rather than relying on priors;
- eliminate UV-island fragmentation and projection seams at generation time;
- use foreground masks and calibrated cameras before reconstruction.

Recommended next GPU run (not executed): masked/cropped inputs without the background or wooden stand, real intrinsics or calibrated FOV/pose, exposure/specular normalization, and preferably four or more evenly spaced views including slight top/bottom coverage.

## Verification artifacts

- Compact metrics: `test_results/two_view_calibrated/cpu_fixed/metrics_cpu_fix.json`
- Front comparison: `test_results/two_view_calibrated/cpu_fixed/renders/comparison_front.png`
- Back comparison: `test_results/two_view_calibrated/cpu_fixed/renders/comparison_back.png`
- Side comparison: `test_results/two_view_calibrated/cpu_fixed/renders/comparison_side_views_no_source_photo.png`
- Cardinal previews: `test_results/two_view_calibrated/cpu_fixed/previews/`

Test result: 23 selected engine tests passed. The final selected artifact also passed direct topology, silhouette, render, texture, and preview checks.

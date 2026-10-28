# Staging acceptance — Web GLB `test_1793160648_e666169a`

Date: 2026-10-28  
Decision: **STAGING NOT ACCEPTED / MOBILE NOT READY**

No GPU inference, AI job, database migration, production deployment, Supabase upload, or production asset replacement was performed. The archival Master and the currently published Web GLB were not modified.

## Candidate under test

| Item | Value |
| --- | ---: |
| Master | `test_results/two_view_calibrated/master.glb` |
| Master SHA-256 | `C69E314F3A35E851C1C06536CD2FD698CF5B1F1B6D8A71AAB78C37186BD4A4E7` |
| Versioned staging Web GLB | `apps/web/public/models/staging/test_1793160648_e666169a/web-1cf288a4.glb` |
| Web SHA-256 | `1CF288A4C5F6D689A25B3CC415B7B6CE901BD0B8B1F4FD096828009A02727799` |
| Master / Web bytes | 37,961,892 / 21,062,592 |
| Master / Web faces | 970,650 / 349,999 |
| Web texture | embedded WebP 4096² Q95 |
| Topology | 0 new non-manifold edges |

The local staging copy is ignored by Git and is not a deployable production asset. The QA page is `/preview-3d` and is explicitly labelled `STAGING QA — NOT PUBLISHED`.

## Source and regression review

The complete tracked diff was reviewed. Two cross-product regressions were found and fixed:

1. The flat-background classifier could remove a legitimate tray, tile, layered artwork, or plinth based on shape alone. Oversized sheets now require both their own neutral-background texture evidence and an independently proven full-frame background fragment cluster.
2. Rebuilding a `trimesh.Scene` from its geometry dictionary discarded node transforms and instances. Cleanup and candidate construction now replace geometry in a copied scene so the graph is retained.

The calibrated vase still produces the same conservative cleanup result: 1,861 removable components. The two large sheets have neutral-background ratios of 98.7786% and 99.2204%; the independent fragment cluster is 99.9749% background-like.

The admin publish API was also incompatible with the worker update: the worker emits quality report version 5 while the API only accepted version 4. The API now accepts verified Pixal3D reports v4 and v5; blocked/invalid reports remain rejected.

Regression results:

- 3D engine Python: **90 passed**.
- Model-worker Python: **14 passed, 1 skipped**.
- Combined Python: **104 passed, 1 skipped**.
- Web Vitest: **67 passed**.
- Monorepo JavaScript/TypeScript tests: **81 passed** (67 web, 5 API client, 4 contracts, 3 mobile, 2 Zalo).
- Monorepo typecheck: **PASS** for contracts, API client, web, mobile, and Zalo.
- Monorepo production build: **PASS**; web generated 33 routes, Expo mobile exported 15 static routes, and Zalo Vite build completed.
- Zalo build warns that one minified chunk is 542.03 kB before adding any 3D viewer, so bundle splitting must be part of a future Zalo integration.
- Repository-wide ESLint remains non-green because of 49 pre-existing warnings outside this staging change; the new QA page adds no warning.

## Four-view visual acceptance

The same CPU camera, orthographic framing, and lighting were used at front/right/back/left:

- comparison: `test_results/two_view_calibrated/cpu_fixed/renders/master_vs_web_4views.png`;
- grounded front/back comparisons: `comparison_front.png`, `comparison_back.png`;
- ungrounded side comparison: `comparison_side_views_no_source_photo.png`.

Observed result:

- the two oversized reconstructed background sheets are absent from the Web candidate;
- the chromatic wooden/gold stand remains in all four views;
- isolated bottom speckles remain, but the remaining large bottom components are chromatic/stand-like and do not satisfy neutral-background proof, so they were not deleted automatically;
- silhouette is stable across four views;
- polygonal simplification is visible in highlights and gold artwork, especially on front/back. The source Master already contains blurred and misplaced artwork, so CPU post-processing cannot restore the source photograph detail.

Human review therefore confirms the intended background-sheet removal but does not certify photographic fidelity of the artwork.

## CraftTrust viewer measurements

The test used the production Next.js build and the real `CraftModelViewer`. Chromium ran with ANGLE SwiftShader, so WebGL rendering was CPU software rendering and no GPU inference was used. Cold-load results are recorded in `test-results/staging-glb/metrics.json`.

| Profile | Network | Viewer result | GLB resource | UI load indicator |
| --- | --- | --- | ---: | ---: |
| Desktop Chromium | local/unthrottled | loaded; no console/page errors | 3,539 ms | 9,539 ms |
| Pixel 7 emulation | 8 Mbps, 80 ms RTT | loaded; no console/page errors | 16,576 ms | 20,922 ms |
| Android WebView UA emulation | 8 Mbps, 80 ms RTT | loaded; no console/page errors | 16,590 ms | 21,028 ms |

HTTP transfer was 16,229,773 encoded bytes and 21,062,592 decoded bytes. `load` and `poster-dismissed` fired in every profile. The desktop screenshot is `test-results/staging-glb/desktop-software-webgl.png`.

These are desktop-engine emulations, not measurements on physical Android hardware or inside the approved Zalo Mini App runtime. They prove structural/browser compatibility only. A roughly 21-second cold load at 8 Mbps is too slow to claim mobile readiness.

## Android and Zalo blockers

- `apps/mobile` currently has no 3D view or product-to-viewer handoff.
- `apps/zalo-mini-app` currently has no `model-viewer` integration or 3D route.
- No physical low/mid/high Android devices were available for peak-memory, context-loss, rotation, background/foreground, and repeated-load testing.
- No approved Zalo Mini App package/runtime was available for real WebView testing.

The Web GLB must not be published as Android/Zalo-ready until these paths exist and pass device tests.

## Versioning and rollback design

The current storage model already supports immutable versions:

1. upload with `upsert=false` to a unique job/asset path;
2. insert a new `product_model_assets` row in `pending_review`;
3. validate the exact SHA-256 and QA report;
4. publish by asset ID; the database function archives the previously published row atomically;
5. rollback by publishing the prior archived asset ID, which archives the current one and repoints `products.model_url` without overwriting either object.

No staging or production Supabase object was created in this run because acceptance failed. Before a future upload, use a dedicated staging project/bucket or a `staging/` prefix and verify that the environment cannot mutate production product rows.

## Web Mobile GLB proposal

Create a separate immutable Mobile derivative from the same Master. Do not force a 200k face count. The current border-preserving simplifier naturally bottoms out near 326,973 faces for this asset; that is evidence that a hard 200k target would require topology damage or another meshing strategy.

The Mobile candidate sweep should vary both geometry and texture (for example 2K/3K WebP and safe face candidates) and choose the best candidate that passes a dedicated gate:

- no new non-manifold edges and no loss of UV, NORMAL, material, or required textures;
- four-view silhouette IoU and edge-deviation limits;
- four-view render colour/detail comparison against the cleaned Master;
- gold-region edge-energy and texture-detail comparison against the original 4K atlas, without first downscaling the reference to the candidate size;
- explicit byte budget and decoded-memory budget;
- cold-load, first-render, rotation, repeated-load, context-loss, and background/foreground tests on physical Android devices and Zalo WebView;
- acceptance based on measured quality/performance, not a fixed polygon target.

Suggested initial performance target for discussion: under 12 MiB, cold viewer-ready under 10 seconds at 8 Mbps, and no crash/context loss on the lowest supported Android device. These are proposed thresholds, not achieved results.

## Deployment status and approvals required

- Modal CPU post-processing: code prepared and regression-tested locally; **not deployed**.
- Web frontend: staging QA page and report-v5 compatibility prepared; **not deployed**.
- Supabase Storage: **no upload**.
- Production Master/Web assets: **unchanged**.
- Database: **no migration**.

Required approvals/resources before another acceptance attempt:

1. staging Supabase/Vercel/Modal environment identifiers and permission to deploy CPU-only post-processing;
2. physical Android test devices or a device-farm scope;
3. an approved Zalo Mini App test package/runtime;
4. agreement on Mobile GLB byte, load-time, memory, and visual-quality thresholds.

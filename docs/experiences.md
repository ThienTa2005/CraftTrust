# Product 3D and curated experiences

These are separate workflows:

- Artisans use **Seller → Thêm Sản Phẩm Mới** or **Studio 3D & AI Scan** to upload product photos, queue generation, inspect the result and publish their product. The existing product tables, storage buckets, ownership rules and worker are preserved.
- Only administrators use **Admin → Trải nghiệm 3D/VR** to upload a self-contained GLB, save a draft, preview it and publish/hide an entry on `/experiences`. Verifiers do not have this permission. Product models never enter this collection automatically.

## Deployment

Apply `supabase/migrations/202610250001_admin_experiences.sql` through the project's normal migration process before deploying the web app. It adds `experiences`, a private `experience-models` bucket and admin-only write policies. It does not modify product data or the generation pipeline. No production migration or deployment was performed as part of this change.

Uploads currently accept a self-contained GLB 2.0 up to 4,000,000 bytes. This keeps the multipart upload below the hosting request-size ceiling. External texture/resource URLs are rejected. Validation checks the container, scene/mesh presence and binary size; administrators must inspect the rendered model before publishing. It is not a full topology/material validator.

Public queries return only published entries. Model access uses RLS and a signed URL valid for 60 seconds; after hiding an entry, a previously issued URL may work for the remainder of that period. Already downloaded files cannot be revoked.

The experience viewer currently supports browser 3D rotation/zoom. The “3D/VR” page label does not imply immersive headset VR support. Existing product 3D/AR functionality remains separate.

## Verification

- Web typecheck and production build.
- Vitest: API role checks, GLB validation, upload cleanup, publish/hide, preservation of artisan/seller photo-to-3D generation, and the new-product button.
- `supabase/tests/database/002_experiences.test.sql`: 15 real RLS assertions covering admin writes, seller/verifier denial, private drafts, public publication, unpublishing, and retained seller photo/job permissions.
- For a local database **before applying the migration**, `rtk proxy powershell -NoProfile -File scripts/test-experiences-db.ps1` applies the migration and assertions in one transaction, then rolls back. After applying it, run the SQL test through the usual Supabase test runner.
- After building, `rtk proxy corepack pnpm exec playwright test --config playwright.experiences.config.ts` checks the separate page, mobile/desktop layout and anonymous API denial. Screenshots go to `test-results/experiences-*.png`.

The photo generation worker still needs its existing runtime configuration. Authenticated uploads against the deployed Supabase project and physical AR/VR devices require separate deployment validation.

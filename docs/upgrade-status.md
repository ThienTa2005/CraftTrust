# CraftTrust upgrade work log

Scope: the full master prompt, with the user's correction preserved: artisans can upload product photographs to generate their own 3D models; the separate experience collection is administered by admins.

## Initial audit

- Buyer header stacks utility links and language buttons into narrow columns on mobile; global overflow clipping hides underlying layout errors.
- Seller/admin navigation disappears below 900px with no full navigation drawer.
- Supplied CraftTrust logo is not integrated; browser title still uses Bát Tràng Craft.
- Admin and seller dashboards contain fabricated metrics and actions; order changes are local state only.
- Product data merges demo entries into live lists, defaults missing passports to gold, and exposes model URLs without publication checks.
- Customizer changes the first material regardless of product, uses screen-space engraving, and saves only a note to the demo cart.
- Generation worker uploads draft models to a public bucket.
- Existing separate `/experiences` admin workflow and role tests are preserved.

## Verification artifacts

Before/after screenshots and machine-readable audit results: `outputs/upgrade/`.

Work in progress. Completion and environment limitations will be recorded after implementation and tests; no production deployment is implied.

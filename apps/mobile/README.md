# Hanoi Craft-Trust mobile

Expo Router consumer app for published village/artisan discovery, active products, a Supabase-backed customer cart, disclosed test checkout, private order history, and passport lookup/QR scanning.

## Local setup

1. Copy `.env.example` to `.env` and set the public Supabase URL and anonymous key from the same project as the web app.
2. From the repository root, run `corepack pnpm install`.
3. Run `corepack pnpm --filter @craft-trust/mobile start` and open the project in a compatible Expo development client.

The app intentionally shows a setup state instead of demo content when configuration is absent. Email/password accounts must already exist in Supabase. Camera permission is requested only when the user asks to scan; denied and permanently blocked states retain manual lookup.

## Test-build preparation

`eas.json`, the Android application ID, iOS bundle ID, URL scheme, and camera permission copy are configured. Creating an installable EAS artifact still requires an Expo account, a linked EAS project, Android/iOS signing credentials, and `eas build --profile preview`. No build artifact is claimed until that external process succeeds.

The web export (`pnpm build`) verifies bundling but is not an Android or iOS binary. Camera scanning is explicitly unavailable in that export.

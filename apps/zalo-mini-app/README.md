# Hanoi Craft-Trust Zalo Mini App shell

Responsive React/Vite shell using `zmp-sdk`, `app-config.json`, the shared Craft-Trust API client, and the same Supabase auth session as other browser clients. It covers published discovery/catalog, passport lookup, persisted cart viewing/add-to-cart, order status, and account state.

## Local setup

1. Copy `.env.example` to `.env` and provide the public Supabase settings.
2. Run `corepack pnpm --filter @craft-trust/zalo-mini-app dev` for a browser preview.
3. Run `corepack pnpm --filter @craft-trust/zalo-mini-app build` for the production web bundle.

The browser preview is labelled and is not proof that the Mini App was accepted or deployed. Official packaging/release still requires a Zalo Mini App ID, a verified Zalo developer account, the official CLI/release flow, domain allow-listing, and platform review.

Zalo identity is not exchanged for a Craft-Trust session yet. That requires an approved App ID and a server-side token exchange that validates the Zalo credential before issuing/linking a Supabase identity. Until then, the shell offers the existing Supabase email/password session and clearly reports the unavailable link; it never treats Zalo container detection as authentication.

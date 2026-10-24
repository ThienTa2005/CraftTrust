# Validation record

Run date: 2026-10-23 (Asia/Saigon)

## Passed

- Monorepo strict typecheck: all five workspace packages/apps.
- Monorepo lint: contracts, API client, Expo app, Next.js web, and Zalo Mini App.
- Unit tests: 16 total (contracts 4, API client 5, mobile 3, web 2, Zalo 2).
- Production build: shared packages, Next.js 16 web app, Expo web export (15 static routes), and Zalo Vite bundle.
- Playwright smoke: 6/6 on desktop Chromium and Pixel 7 viewport.
- Secret scan: no persisted hosting token, service-role key, OpenAI key, or JWT-like credential detected.

## Warnings and unavailable checks

- The Zalo bundle contains one minified chunk over 500 kB. This is a performance warning, not a build failure; route-level code splitting is a follow-up.
- Supabase pgTAP contains 33 assertions but was not executed because the Supabase CLI/PostgreSQL client and a running Docker engine are not present on this machine.
- Native EAS artifacts were not produced because an Expo account, project ID, platform agreements, and signing credentials were not provided. Expo web export passed and `eas.json` is ready.
- Zalo platform packaging/release was not attempted without an approved App ID, developer credentials, current official CLI, domain allow-list, and review access.
- A private Sites project was registered as `appgprj_6adb6d0d33a4819189bfdd6adcf3edef`, but source upload/deployment was blocked by the environment security reviewer pending explicit approval to send the repository to the Sites hosting Git endpoint. No deployment success or URL is claimed.

## Commands

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Database verification, once prerequisites are installed:

```powershell
supabase start
supabase db reset
supabase test db
```

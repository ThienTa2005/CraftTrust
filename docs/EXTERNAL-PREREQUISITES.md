# External prerequisites and truthful delivery status

This repository is deployable, but the following actions require credentials or services that are intentionally not fabricated.

## Supabase

- Create a Supabase project or install the Supabase CLI plus Docker for local integration tests.
- Apply all migrations and the clearly marked demo seed with `supabase db reset` locally or `supabase db push` against the intended project.
- Configure Site URL and auth redirect URLs, including `/auth/callback` for every deployed origin.
- Populate public URL/anon-key variables in each client. Keep the service-role key server-only.
- Create storage buckets and retention rules if evidence binary uploads are enabled. The database stores evidence paths; this build does not invent uploaded files.

## AI provider

- Set a server-only `OPENAI_API_KEY` and an account-accessible `OPENAI_MODEL`.
- The assistant refuses to run without both Supabase-approved retrieval results and provider credentials.
- Review data-processing requirements before sending approved excerpts to any model provider.

## Payments

- Only test checkout is implemented. It creates an order and a `payment_attempts(mode = 'test')` row and never claims that money moved.
- A production provider requires merchant onboarding, webhook signature verification, idempotency, reconciliation, refunds, and regional compliance review.

## QR and NFC issuance

- Generate cryptographically random QR tokens in a trusted server/issuer workflow; store only hashes in PostgreSQL and print/encode the raw token once.
- NFC tags require physical provisioning and, where supported, tag locking/signature policy. Device capability must be tested on actual target hardware.

## Web deployment

- Provide hosting credentials and all production environment variables.
- A deployment is successful only when the provider returns a deployed URL and health checks pass.

## Expo mobile builds

- Install/login to EAS CLI, configure an Expo project ID, Android package/iOS bundle identifiers, signing credentials, and camera usage disclosures.
- Run `eas build --profile preview --platform android` and/or iOS after the owner accepts the relevant platform terms.
- This repository includes `eas.json`; it does not claim an EAS artifact without those external prerequisites.

## Zalo Mini App

- Create/obtain a Zalo Mini App ID, install the official CLI expected by the current Zalo platform, and update its manifest/build adapter.
- Configure approved domains, OAuth scopes, privacy disclosures, and submit through Zalo's review process.
- The included Vite client is a portable functional shell; platform packaging is not claimed until official tooling and credentials complete.

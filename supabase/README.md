# Supabase backend

This directory contains the forward-only PostgreSQL schema, RLS policies, audited workflow RPCs, and explicitly labelled local demo fixtures. It implements only an internal **test checkout**. There is no live payment gateway, no automatic truth claim, and no simulated external verification.

## Local commands

```sh
supabase start
supabase db reset
supabase test db
```

Requirements: Docker and Supabase CLI. The `vector`, `pgcrypto`, and (for tests) `pgtap` extensions must be available in the target Supabase project. Apply migrations before generating `supabase-js` database types.

Never run `seed.sql` as production heritage data. Every persona, product, review, and approved source in it is a `DEMO` fixture using `.invalid` identities and URLs.

## RPC contract

All mutating RPCs return JSON objects suitable for `supabase-js`. Arguments are named for object-style invocation.

| RPC | Exact arguments | Access/result |
| --- | --- | --- |
| `add_to_cart` | `p_product_id uuid, p_quantity integer = 1` | Authenticated owner; returns cart/item snapshot. |
| `checkout_test_cart` | `p_shipping_address jsonb, p_idempotency_key text` | Authenticated owner; atomic stock lock/decrement, immutable order lines, explicit `payment_mode=test`; repeat key returns original order. |
| `review_evidence` | `p_evidence_id uuid, p_decision approval_status, p_notes text` | Verifier/admin only; pending evidence only; writes review/audit and recomputes tier. |
| `recompute_passport_tier` | `p_passport_id uuid` | Verifier/admin only; derives tier solely from approved evidence. |
| `review_heritage_source` | `p_source_id uuid, p_decision approval_status` | Verifier/admin only; records approver metadata. |
| `issue_qr_identifier` | `p_passport_id uuid` | Product manager/verifier/admin; active passport only; raw random token returned once, SHA-256 only stored. |
| `resolve_qr_identifier` | `p_token text` | Public; returns only curated active passport/product/artisan/village JSON, or SQL `null`. |
| `map_nfc_tag` | `p_passport_id uuid, p_raw_uid text, p_target_url text` | Product manager/verifier/admin; HTTPS target must end in `/passport/{public_id}`; raw UID is hashed and never stored. |
| `resolve_nfc_tag` | `p_raw_uid text` | Public; returns active target/public passport summary, or SQL `null`. |
| `revoke_qr_identifier` | `p_identifier_id uuid` | Product manager/verifier/admin; audited revocation. |
| `revoke_nfc_mapping` | `p_mapping_id uuid` | Product manager/verifier/admin; audited revocation. |
| `search_approved_heritage` | `p_query text, p_limit integer = 5` | Public; returns rows from approved chunks whose parent source is also approved; limit clamped to 1–20. |

Tier rules are cumulative: bronze = approved identity + origin; silver additionally requires approved material + process; gold additionally requires an approved heritage-source evidence item whose source is approved + verifier attestation. Rejected evidence can never raise a tier.

## Storage and external prerequisites

Evidence stores only a `storage_path`; provision a private Supabase Storage bucket and signed-upload policy before accepting files. Configure production Auth redirect allowlists, SMTP, CAPTCHA, backups, rate limiting, custom domains, and secrets separately. QR resolver origin and NFC writer hardware/app configuration are external. A real payment provider and provider webhook verification remain intentionally unimplemented.

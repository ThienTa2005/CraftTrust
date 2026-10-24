# Hanoi Craft-Trust architecture

Status: implementation baseline for the one-day integrated vertical slice.

## System shape

```text
Next.js web        Expo mobile       Zalo Mini App
     \                 |                 /
      +-------- @craft-trust/api-client -+
                         |
                @craft-trust/contracts
                         |
        Supabase Auth + PostgREST + PostgreSQL
                         |
      RLS, audited RPCs, storage metadata, pgvector-ready knowledge
```

- `apps/web`: public marketplace and discovery, seller workspace, admin verification, passport resolver, QR/NFC utilities, 3D/AR capability-gated viewer, and approved-content assistant.
- `apps/mobile`: Expo Router consumer browse, cart, orders, and passport scan flows.
- `apps/zalo-mini-app`: compact browse, passport lookup, cart, and order status flows, structured so the official Zalo build tooling can be added when app credentials are available.
- `packages/contracts`: source of truth for roles, entities, workflow states, Zod input/output validation, and database-facing TypeScript types.
- `packages/api-client`: environment-neutral repository interface, Supabase implementation, server/admin extensions, and a deterministic in-memory adapter for tests only.
- `supabase`: forward-only PostgreSQL migrations, RLS policies, audited security-definer functions, clearly labelled demo seed, and pgTAP policy tests.

## Database schema

### Identity and authorization

- `profiles(id -> auth.users, display_name, avatar_url, village_id, created_at)`
- `user_roles(user_id, role in customer|artisan|seller|verifier|admin)`
- Authorization helpers: `has_role`, `owns_artisan`, `can_manage_product`.

### Heritage and commerce

- `villages(id, slug, name, district, summary, story, coordinates, cover_image_url, is_published)`
- `artisans(id, village_id, owner_id, slug, name, bio, portrait_url, years_practicing, is_published)`
- `products(id, artisan_id, slug, name, description, price_vnd, stock_quantity, status, model_url, poster_url, ar_url, created_at)`
- `product_media(id, product_id, kind, url, alt, sort_order)`
- `carts(id, user_id, status, created_at, updated_at)` and `cart_items(cart_id, product_id, quantity, unit_price_vnd)`
- `orders(id, user_id, status, subtotal_vnd, payment_mode, shipping_address, created_at)` and immutable `order_items`
- `payment_attempts(id, order_id, provider, mode, status, external_reference, created_at)`; only `mode=test` is implemented.

### Trust and provenance

- `heritage_sources(id, village_id, title, publisher, source_url, excerpt, approval_status, approved_by, approved_at)`
- `passport_records(id, product_id, public_id, tier, status, issued_at, updated_at)`
- `evidence_submissions(id, passport_id, evidence_type, source_id, storage_path, statement, status, submitted_by, reviewed_by, review_notes, reviewed_at)`
- `verification_reviews(id, evidence_id, decision, notes, reviewer_id, created_at)`
- `qr_identifiers(id, passport_id, token_hash, status, issued_at, revoked_at)`
- `nfc_mappings(id, passport_id, tag_uid_hash, target_url, status, created_at)`
- Tier calculation is server-side and evidence-based: bronze requires identity + origin; silver adds material/process; gold adds approved heritage source + verifier attestation. Rejection never increases a tier.

### AI grounding and audit

- `knowledge_chunks(id, source_id, content, embedding, approval_status, created_at)`; only approved source/chunk pairs are retrievable.
- `assistant_conversations(id, user_id, created_at)` and `assistant_messages(id, conversation_id, role, content, citations, created_at)`.
- `audit_events(id, actor_id, action, entity_type, entity_id, before_data, after_data, created_at)` is append-only to clients; triggers capture workflow changes.

## Dependency-ordered task graph

```text
A. workspace + contracts
  -> B. migrations, RLS, audited RPCs, demo seed
    -> C. Supabase client + auth/role guards
      -> D. marketplace, discovery, cart, test checkout, orders
      -> E. evidence review, tiering, QR/NFC passport resolution
        -> F. seller/admin dashboards
        -> G. 3D viewer + runtime-gated AR
        -> H. approved-source assistant
          -> I. Expo and Zalo clients
            -> J. lint, typecheck, tests, builds, E2E smoke
              -> K. web deployment + mobile test-build preparation
```

Modules can run in parallel only after their input contract is committed. Database migrations and shared contracts are the integration boundary.

## Acceptance criteria

1. Marketplace reads published villages, artisans, and active products from Supabase; offline/sample behavior is labelled `DEMO DATA` and never presented as production truth.
2. Customer cart mutation, test checkout, and order history persist in PostgreSQL and enforce ownership through RLS.
3. Seller routes and mutations require `seller` or `artisan`; admin verification requires `verifier` or `admin`; negative authorization tests pass.
4. Passport tier is recalculated by a database function using approved evidence. UI cannot directly promote a passport.
5. Evidence submissions and review decisions create append-only audit events with actor and before/after state.
6. QR codes contain a unique revocable public resolver URL. NFC records map a hashed UID to the same canonical route; raw tag UIDs are not stored.
7. The 3D viewer reports loading/error/unsupported states. AR entry points appear only after runtime checks and a compatible asset; compatibility is never inferred from device name alone.
8. The assistant retrieves only approved heritage chunks, cites its sources, and declines unsupported questions. Missing AI credentials produce a clear unavailable state.
9. Web, mobile, and Zalo share validated domain contracts and API calls and include accessible loading, empty, and error states.
10. Lint, strict typecheck, unit/integration tests, production builds, RLS tests (when local Supabase is available), and Playwright smoke tests are run and results recorded.
11. A deployment URL is reported only after a hosting provider confirms success. Expo/Zalo build artifacts are reported only if the corresponding external credentials and tooling complete successfully.


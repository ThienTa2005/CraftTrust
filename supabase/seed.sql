-- DEMO DATA ONLY.
-- These records are deterministic local-development fixtures, not production claims,
-- real verification, live payment data, or deployable credentials.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, recovery_token, email_change_token_new
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'demo.seller@example.invalid', extensions.crypt('demo-password-never-production', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"[DEMO] Seller"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'demo.verifier@example.invalid', extensions.crypt('demo-password-never-production', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"[DEMO] Verifier"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'demo.customer@example.invalid', extensions.crypt('demo-password-never-production', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"[DEMO] Customer"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.user_roles(user_id, role) values
  ('10000000-0000-0000-0000-000000000001', 'artisan'),
  ('10000000-0000-0000-0000-000000000001', 'seller'),
  ('10000000-0000-0000-0000-000000000002', 'verifier')
on conflict do nothing;

insert into public.villages(id, slug, name, district, summary, story, coordinates, cover_image_url, is_published) values
  ('20000000-0000-0000-0000-000000000001', 'demo-bat-trang', '[DEMO] Bát Tràng', 'Gia Lâm',
   'DEMO DATA: A sample pottery village listing for local development.',
   'DEMO DATA ONLY: This abbreviated story is a fixture and is not asserted as an approved historical account.',
   '{"latitude":20.976,"longitude":105.912}'::jsonb,
   'https://images.unsplash.com/photo-1610701596007-11502861dcfa', true),
  ('20000000-0000-0000-0000-000000000002', 'demo-van-phuc', '[DEMO] Vạn Phúc', 'Hà Đông',
   'DEMO DATA: A sample silk village listing for local development.',
   'DEMO DATA ONLY: This abbreviated story is a fixture and is not asserted as an approved historical account.',
   '{"latitude":20.980,"longitude":105.775}'::jsonb,
   'https://images.unsplash.com/photo-1603376335934-d50e8f8e4716', true)
on conflict (id) do nothing;

insert into public.artisans(id, village_id, owner_id, slug, name, bio, portrait_url, years_practicing, is_published) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'demo-nguyen-an', '[DEMO] Nguyễn An', 'DEMO PERSONA: fictional artisan used for interface testing.', null, 18, true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', null, 'demo-tran-mai', '[DEMO] Trần Mai', 'DEMO PERSONA: fictional artisan used for interface testing.', null, 12, true)
on conflict (id) do nothing;

insert into public.products(id, artisan_id, slug, name, description, price_vnd, stock_quantity, status, poster_url) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'demo-men-lam-binh', '[DEMO] Bình men lam', 'DEMO PRODUCT: non-purchasable production claim; test checkout only.', 850000, 12, 'active', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'demo-khan-lua', '[DEMO] Khăn lụa', 'DEMO PRODUCT: non-purchasable production claim; test checkout only.', 420000, 20, 'active', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26')
on conflict (id) do nothing;

insert into public.heritage_sources(id, village_id, title, publisher, source_url, excerpt, approval_status, approved_by, approved_at) values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '[DEMO APPROVED FIXTURE] Pottery source', '[DEMO] Editorial board', 'https://example.invalid/demo-pottery-source', 'DEMO approved fixture used to exercise grounded retrieval. It is not a real heritage citation.', 'approved', '10000000-0000-0000-0000-000000000002', now()),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '[DEMO PENDING FIXTURE] Silk source', '[DEMO] Contributor', 'https://example.invalid/demo-silk-source', 'DEMO pending fixture which must never appear in public assistant retrieval.', 'pending', null, null)
on conflict (id) do nothing;

insert into public.knowledge_chunks(id, source_id, content, approval_status) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'DEMO approved content: the sample pottery workflow includes shaping, drying, decorating, glazing, and firing.', 'approved'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'DEMO pending content: this sentence exists to prove unapproved knowledge is excluded.', 'pending')
on conflict (id) do nothing;

insert into public.passport_records(id, product_id, public_id, tier, status, issued_at) values
  ('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'bronze', 'active', now())
on conflict (id) do nothing;

insert into public.evidence_submissions(id, passport_id, evidence_type, statement, status, submitted_by, reviewed_by, review_notes, reviewed_at) values
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'identity', 'DEMO EVIDENCE: fictional identity fixture for authorization and tier tests.', 'approved', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'DEMO review fixture', now()),
  ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'origin', 'DEMO EVIDENCE: fictional origin fixture for authorization and tier tests.', 'approved', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'DEMO review fixture', now())
on conflict (id) do nothing;

insert into public.verification_reviews(evidence_id, decision, notes, reviewer_id)
select id, 'approved', 'DEMO review fixture', '10000000-0000-0000-0000-000000000002'
from public.evidence_submissions where id in ('80000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002')
and not exists (select 1 from public.verification_reviews vr where vr.evidence_id = evidence_submissions.id);

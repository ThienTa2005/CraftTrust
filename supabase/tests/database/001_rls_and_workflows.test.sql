begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,recovery_token,email_change_token_new) values
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000001','authenticated','authenticated','test.seller@example.invalid',extensions.crypt('not-a-secret',extensions.gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000002','authenticated','authenticated','test.customer@example.invalid',extensions.crypt('not-a-secret',extensions.gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000003','authenticated','authenticated','test.intruder@example.invalid',extensions.crypt('not-a-secret',extensions.gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000004','authenticated','authenticated','test.verifier@example.invalid',extensions.crypt('not-a-secret',extensions.gen_salt('bf')),now(),'{}','{}',now(),now(),'','','','');

insert into public.user_roles(user_id,role) values
('90000000-0000-0000-0000-000000000001','seller'),('90000000-0000-0000-0000-000000000001','artisan'),('90000000-0000-0000-0000-000000000004','verifier');
insert into public.villages(id,slug,name,district,summary,story,is_published) values
('91000000-0000-0000-0000-000000000001','test-public','Test Public','Test','Test summary','Test story',true),
('91000000-0000-0000-0000-000000000002','test-private','Test Private','Test','Test summary','Test story',false);
insert into public.artisans(id,village_id,owner_id,slug,name,bio,is_published) values
('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','test-artisan','Test Artisan','Test bio',true);
insert into public.products(id,artisan_id,slug,name,description,price_vnd,stock_quantity,status) values
('93000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','test-product','Test Product','Test description',100000,5,'active');
insert into public.passport_records(id,product_id,public_id) values
('94000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','94100000-0000-0000-0000-000000000001');
insert into public.evidence_submissions(id,passport_id,evidence_type,statement,submitted_by) values
('95000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','identity','Identity evidence pending review','90000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
select ok(public.has_role('customer'), 'auth trigger grants customer role');
select is((select count(*) from public.villages where id='91000000-0000-0000-0000-000000000002'),0::bigint,'customer cannot read unpublished village');
select is((select count(*) from public.profiles where id='90000000-0000-0000-0000-000000000001'),0::bigint,'customer cannot read another profile');
select is((select count(*) from public.evidence_submissions),0::bigint,'customer cannot read seller evidence');
select lives_ok($$select public.add_to_cart('93000000-0000-0000-0000-000000000001',2)$$,'customer can add active product');
select is((public.checkout_test_cart('{"recipient_name":"Test Buyer","phone":"000","address_line":"Test address"}'::jsonb,'test-key-0001')->>'payment_mode'),'test','checkout is explicitly test mode');
select ok((public.checkout_test_cart('{"recipient_name":"Test Buyer","phone":"000","address_line":"Test address"}'::jsonb,'test-key-0001')->>'idempotent_replay')::boolean,'checkout replay is idempotent');
select is((select count(*) from public.orders where user_id='90000000-0000-0000-0000-000000000002'),1::bigint,'idempotent checkout made one order');

select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.review_evidence('95000000-0000-0000-0000-000000000001','approved','Looks valid')$$,'42501','verifier or admin role required','non-verifier cannot review evidence');
select throws_ok($$select public.recompute_passport_tier('94000000-0000-0000-0000-000000000001')$$,'42501','verifier or admin role required','non-verifier cannot recompute tier');
select throws_ok($$select public.issue_qr_identifier('94000000-0000-0000-0000-000000000001')$$,'42501','active manageable passport not found','intruder cannot issue QR');
select throws_ok($$select public.map_nfc_tag('94000000-0000-0000-0000-000000000001','04AABBCC','https://example.invalid/p/test')$$,'42501','active manageable passport not found','intruder cannot map NFC');
select throws_ok($$update public.audit_events set action='tampered'$$,'42501','permission denied for table audit_events','clients cannot update audit rows');

select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000004',true);
select lives_ok($$select public.review_evidence('95000000-0000-0000-0000-000000000001','approved','Identity checked')$$,'verifier can review evidence');
select is((select tier::text from public.passport_records where id='94000000-0000-0000-0000-000000000001'),'unverified','identity alone does not grant bronze');
select ok((select count(*) > 0 from public.audit_events where entity_id='95000000-0000-0000-0000-000000000001'),'evidence review was audited');

reset role;
insert into public.heritage_sources(id,village_id,title,publisher,source_url,excerpt,approval_status,approved_by,approved_at) values
('96000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','Approved test source','Test publisher','https://example.invalid/approved','Approved test excerpt','approved','90000000-0000-0000-0000-000000000004',now()),
('96000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','Pending test source','Test publisher','https://example.invalid/pending','Pending test excerpt','pending',null,null);
insert into public.knowledge_chunks(id,source_id,content,approval_status) values
('97000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001','Approved pottery knowledge searchable phrase kiln firing.','approved'),
('97000000-0000-0000-0000-000000000002','96000000-0000-0000-0000-000000000002','Pending secret pottery knowledge searchable phrase kiln firing.','approved');
insert into public.evidence_submissions(id,passport_id,evidence_type,source_id,statement,submitted_by) values
('95000000-0000-0000-0000-000000000002','94000000-0000-0000-0000-000000000001','origin',null,'Origin evidence pending review','90000000-0000-0000-0000-000000000001'),
('95000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000001','material',null,'Material evidence pending review','90000000-0000-0000-0000-000000000001'),
('95000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000001','process',null,'Process evidence pending review','90000000-0000-0000-0000-000000000001'),
('95000000-0000-0000-0000-000000000005','94000000-0000-0000-0000-000000000001','heritage_source','96000000-0000-0000-0000-000000000001','Heritage source evidence pending review','90000000-0000-0000-0000-000000000001'),
('95000000-0000-0000-0000-000000000006','94000000-0000-0000-0000-000000000001','verifier_attestation',null,'Verifier attestation evidence pending review','90000000-0000-0000-0000-000000000001'),
('95000000-0000-0000-0000-000000000007','94000000-0000-0000-0000-000000000001','identity',null,'Rejected duplicate identity evidence item','90000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000004',true);
select lives_ok($$select public.review_evidence('95000000-0000-0000-0000-000000000002','approved','Origin checked')$$,'verifier approves origin');
select is((select tier::text from public.passport_records where id='94000000-0000-0000-0000-000000000001'),'bronze','identity and origin grant bronze');
select lives_ok($$select public.review_evidence('95000000-0000-0000-0000-000000000003','approved','Material checked')$$,'verifier approves material');
select lives_ok($$select public.review_evidence('95000000-0000-0000-0000-000000000004','approved','Process checked')$$,'verifier approves process');
select is((select tier::text from public.passport_records where id='94000000-0000-0000-0000-000000000001'),'silver','material and process additionally grant silver');
select lives_ok($$select public.review_evidence('95000000-0000-0000-0000-000000000005','approved','Source checked')$$,'verifier approves heritage-source evidence');
select lives_ok($$select public.review_evidence('95000000-0000-0000-0000-000000000006','approved','Attestation checked')$$,'verifier approves attestation');
select is((select tier::text from public.passport_records where id='94000000-0000-0000-0000-000000000001'),'gold','approved source and attestation additionally grant gold');
select lives_ok($$select public.review_evidence('95000000-0000-0000-0000-000000000007','rejected','Duplicate rejected')$$,'verifier can reject evidence');
select is((select tier::text from public.passport_records where id='94000000-0000-0000-0000-000000000001'),'gold','rejection never increases or corrupts tier');

select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
select ok(public.resolve_qr_identifier(public.issue_qr_identifier('94000000-0000-0000-0000-000000000001')->>'token') is not null,'seller can issue and resolve a QR token for active passport');
select lives_ok($$select public.map_nfc_tag('94000000-0000-0000-0000-000000000001','04AABBCC','https://example.invalid/passport/94100000-0000-0000-0000-000000000001')$$,'seller can map hashed NFC UID');

set local role anon;
select is((public.resolve_nfc_tag('04AABBCC')->>'target_url'),'https://example.invalid/passport/94100000-0000-0000-0000-000000000001','anon resolves active NFC mapping without exposing raw UID');
select is((select count(*) from public.search_approved_heritage('kiln firing',5)),1::bigint,'retrieval requires approved chunk and approved parent source');
select is((select count(*) from public.knowledge_chunks where id='97000000-0000-0000-0000-000000000002'),0::bigint,'anon RLS hides chunk with pending source');
select is(has_table_privilege('anon','public.qr_identifiers','select'),false,'anon cannot enumerate QR hashes');
select is(has_table_privilege('anon','public.nfc_mappings','select'),false,'anon cannot enumerate NFC hashes');

select * from finish();
rollback;

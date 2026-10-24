begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users(id,email,raw_user_meta_data) values
('a0000000-0000-4000-8000-000000000001','experience-admin@example.invalid','{}'),
('a0000000-0000-4000-8000-000000000002','experience-seller@example.invalid','{}'),
('a0000000-0000-4000-8000-000000000003','experience-verifier@example.invalid','{}');
insert into public.user_roles(user_id,role) values
('a0000000-0000-4000-8000-000000000001','admin'),
('a0000000-0000-4000-8000-000000000002','artisan'),
('a0000000-0000-4000-8000-000000000002','seller'),
('a0000000-0000-4000-8000-000000000003','verifier');
insert into public.villages(id,slug,name,district,summary,story,is_published) values
('a1000000-0000-4000-8000-000000000001','experience-test-village','Test','Test','Test','Test',true);
insert into public.artisans(id,village_id,owner_id,slug,name,bio,is_published) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','experience-test-artisan','Test','Test',true);
insert into public.products(id,artisan_id,slug,name,description,price_vnd,stock_quantity,status) values
('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','experience-test-product','Test','Test',100000,1,'draft');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.experiences(id,title,model_path,uploaded_by) values
('a4000000-0000-4000-8000-000000000001','Draft experience','a4000000-0000-4000-8000-000000000001/model.glb',auth.uid()),
('a4000000-0000-4000-8000-000000000002','Public experience','a4000000-0000-4000-8000-000000000002/model.glb',auth.uid())$$,'admin can upload experience drafts');
select lives_ok($$insert into storage.objects(bucket_id,name) values
('experience-models','a4000000-0000-4000-8000-000000000001/model.glb'),
('experience-models','a4000000-0000-4000-8000-000000000002/model.glb')$$,'admin can store experience files');
select lives_ok($$update public.experiences set status='published' where id='a4000000-0000-4000-8000-000000000002'$$,'admin can publish');
select is((select count(*) from storage.objects where bucket_id='experience-models' and name like 'a4000000%'),2::bigint,'admin can preview draft and published files');

select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
select throws_ok($$insert into public.experiences(id,title,model_path,uploaded_by) values
('a4000000-0000-4000-8000-000000000003','Seller experience','a4000000-0000-4000-8000-000000000003/model.glb',auth.uid())$$,'42501','new row violates row-level security policy for table "experiences"','seller cannot create experiences');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('experience-models','seller/model.glb')$$,'42501','new row violates row-level security policy for table "objects"','seller cannot upload experience models');
select is((select count(*) from public.experiences where id='a4000000-0000-4000-8000-000000000001'),0::bigint,'seller cannot read draft experience');
with changed as (update public.experiences set status='draft' where id='a4000000-0000-4000-8000-000000000002' returning id)
select is((select count(*) from changed),0::bigint,'seller cannot change published experience');
select lives_ok($$insert into storage.objects(bucket_id,name) values ('product-source',auth.uid()::text || '/a3000000-0000-4000-8000-000000000001/source-0.png')$$,'seller retains product photo upload');
select lives_ok($$insert into public.model_jobs(product_id,status) values ('a3000000-0000-4000-8000-000000000001','queued')$$,'seller retains product 3D generation');

select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
select throws_ok($$insert into public.experiences(id,title,model_path,uploaded_by) values
('a4000000-0000-4000-8000-000000000003','Verifier experience','a4000000-0000-4000-8000-000000000003/model.glb',auth.uid())$$,'42501','new row violates row-level security policy for table "experiences"','verifier cannot upload experiences');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*) from public.experiences where id::text like 'a4000000%'),1::bigint,'public reads only published experiences');
select is((select count(*) from storage.objects where bucket_id='experience-models' and name like 'a4000000%'),1::bigint,'public cannot access draft storage files');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select lives_ok($$update public.experiences set status='draft' where id='a4000000-0000-4000-8000-000000000002'$$,'admin can hide experience');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*) from storage.objects where bucket_id='experience-models' and name like 'a4000000%'),0::bigint,'hidden experience files no longer readable');

select * from finish();
rollback;

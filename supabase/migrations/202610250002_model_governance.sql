create table public.product_model_assets (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 storage_path text not null unique,
 original_filename text not null,
 file_size integer not null check(file_size > 0),
 origin text not null default 'admin' check(origin in ('admin','generated')),
 status text not null default 'draft' check(status in ('draft','pending_review','published','archived','rejected')),
 settings jsonb not null default '{}'::jsonb check(jsonb_typeof(settings)='object'),
 uploaded_by uuid references auth.users(id), approved_by uuid references auth.users(id),
 approved_at timestamptz, created_at timestamptz not null default now(),
 check(status <> 'published' or (approved_by is not null and approved_at is not null))
);
create unique index one_published_model_per_product on public.product_model_assets(product_id) where status='published';
alter table public.product_model_assets enable row level security;
create policy product_models_public on public.product_model_assets for select to anon,authenticated
using(status='published' and exists(select 1 from public.products p where p.id=product_id and p.status='active'));
create policy product_models_owner_preview on public.product_model_assets for select to authenticated using(public.can_manage_product(product_id));
create policy product_models_admin_insert on public.product_model_assets for insert to authenticated with check(public.has_role('admin') and status='draft' and uploaded_by=auth.uid());
-- State transitions and configuration changes use the audited function below.
grant select on public.product_model_assets to anon,authenticated;
grant insert on public.product_model_assets to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-models','product-models',false,50000000,array['model/gltf-binary','application/octet-stream']) on conflict(id) do nothing;
create policy product_models_storage_read on storage.objects for select to anon,authenticated using(bucket_id='product-models' and (public.has_role('admin') or exists(select 1 from public.product_model_assets a where a.storage_path=name)));
create policy product_models_storage_admin_insert on storage.objects for insert to authenticated with check(bucket_id='product-models' and public.has_role('admin'));
create policy product_models_storage_admin_delete on storage.objects for delete to authenticated using(bucket_id='product-models' and public.has_role('admin'));

create or replace function public.manage_product_model(p_id uuid,p_action text,p_settings jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_asset public.product_model_assets%rowtype; v_before jsonb;
begin
 if not public.has_role('admin') then raise exception 'admin required' using errcode='42501'; end if;
 select * into v_asset from public.product_model_assets where id=p_id;
 if not found then raise exception 'model not found' using errcode='P0002'; end if;
 perform 1 from public.products where id=v_asset.product_id for update;
 select * into v_asset from public.product_model_assets where id=p_id for update;
 v_before:=to_jsonb(v_asset);
 if p_action='configure' then
  if v_asset.status='published' then raise exception 'archive model before changing settings'; end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception 'settings required'; end if;
  update public.product_model_assets set settings=p_settings where id=p_id;
 elsif p_action='publish' then
  if v_asset.status not in ('draft','pending_review','archived') then raise exception 'model cannot be published'; end if;
  if not exists(select 1 from storage.objects where bucket_id='product-models' and name=v_asset.storage_path) then raise exception 'model file missing'; end if;
  update public.product_model_assets set status='archived' where product_id=v_asset.product_id and status='published';
  update public.product_model_assets set status='published',approved_by=auth.uid(),approved_at=now() where id=p_id;
  update public.products set model_status='ready',model_url='/api/models/'||p_id::text,ar_url=null where id=v_asset.product_id;
 elsif p_action in ('archive','reject') then
  update public.product_model_assets set status=case when p_action='archive' then 'archived' else 'rejected' end where id=p_id;
  if v_asset.status='published' then update public.products set model_url=null,ar_url=null,model_status='review' where id=v_asset.product_id; end if;
 else raise exception 'invalid action'; end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,before_data,after_data)
 values(auth.uid(),'model_'||p_action,'product_model_assets',p_id,v_before,(select to_jsonb(a) from public.product_model_assets a where a.id=p_id));
 return jsonb_build_object('id',p_id);
end $$;
revoke all on function public.manage_product_model(uuid,text,jsonb) from public;
grant execute on function public.manage_product_model(uuid,text,jsonb) to authenticated;

-- Retire public access to legacy draft GLBs without deleting any originals.
update storage.buckets set public=false where id='product-assets';
drop policy if exists product_assets_public_read on storage.objects;
create policy product_assets_images_read on storage.objects for select to anon,authenticated
using(bucket_id='product-assets' and lower(name) ~ '\.(png|jpg|jpeg|webp)$');
create policy product_assets_legacy_owner_read on storage.objects for select to authenticated
using(bucket_id='product-assets' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_role('admin')));
update public.products set poster_url=regexp_replace(poster_url,'^https?://[^/]+/storage/v1/object/public/product-assets/','/api/assets/product-assets/') where poster_url like '%/storage/v1/object/public/product-assets/%';
update public.product_media set url=regexp_replace(url,'^https?://[^/]+/storage/v1/object/public/product-assets/','/api/assets/product-assets/') where kind='image' and url like '%/storage/v1/object/public/product-assets/%';

create or replace function public.protect_verified_model() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.uid() is not null and not public.has_role('admin') and
 ((new.model_url is distinct from old.model_url and new.model_url is not null) or
 (new.model_status='ready' and old.model_status is distinct from new.model_status)) then
 raise exception 'admin approval required for product model' using errcode='42501';
 end if;
 return new;
end $$;
create trigger protect_verified_product_model before update on public.products for each row execute function public.protect_verified_model();

notify pgrst,'reload schema';

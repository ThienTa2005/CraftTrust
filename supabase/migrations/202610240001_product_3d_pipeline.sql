-- Seller-owned product media and asynchronous ceramic 3D generation.
-- Source photographs stay private. Published posters and GLB assets use a
-- separate public bucket so marketplace visitors can view them directly.

create type public.model_generation_status as enum (
  'not_requested',
  'queued',
  'processing',
  'review',
  'ready',
  'failed'
);

alter table public.products
  add column height_cm numeric(6, 1) check (height_cm between 3 and 250),
  add column width_cm numeric(6, 1) check (width_cm between 3 and 250),
  add column dimensions_verified boolean not null default false,
  add column shape_mode text not null default 'photo' check (shape_mode in ('photo', 'measured')),
  add column back_texture text not null default 'mirror' check (back_texture in ('mirror', 'plain')),
  add column model_status public.model_generation_status not null default 'not_requested',
  add column model_report jsonb,
  add column model_error text,
  add column model_version uuid;

create table public.product_source_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  byte_size bigint not null check (byte_size between 200 and 7000000),
  ordinal smallint not null default 0 check (ordinal between 0 and 3),
  created_at timestamptz not null default now(),
  unique (product_id, ordinal),
  unique (storage_path)
);

create table public.model_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  engine text not null default 'ceramic-cpu',
  attempt integer not null default 1 check (attempt between 1 and 10),
  started_at timestamptz,
  finished_at timestamptz,
  generation_ms integer check (generation_ms is null or generation_ms >= 0),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index model_jobs_queue_idx on public.model_jobs(created_at) where status = 'queued';
create index model_jobs_product_idx on public.model_jobs(product_id, created_at desc);
create trigger model_jobs_updated_at before update on public.model_jobs
for each row execute function public.set_updated_at();

-- Atomically claim one queued job. SKIP LOCKED allows more than one worker
-- replica without two processes generating the same product at once.
create or replace function public.claim_model_job()
returns setof public.model_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.model_jobs
  set status = 'processing', started_at = now(), error = null
  where id = (
    select queued.id
    from public.model_jobs as queued
    where queued.status = 'queued'
    order by queued.created_at
    for update skip locked
    limit 1
  )
  returning *;
end;
$$;

revoke all on function public.claim_model_job() from public, anon, authenticated;
grant execute on function public.claim_model_job() to service_role;

alter table public.product_source_assets enable row level security;
alter table public.model_jobs enable row level security;

create policy product_source_assets_owner_read
on public.product_source_assets for select to authenticated
using (public.can_manage_product(product_id));

create policy product_source_assets_owner_insert
on public.product_source_assets for insert to authenticated
with check (public.can_manage_product(product_id));

create policy model_jobs_owner_read
on public.model_jobs for select to authenticated
using (public.can_manage_product(product_id));

create policy model_jobs_owner_insert
on public.model_jobs for insert to authenticated
with check (status = 'queued' and public.can_manage_product(product_id));

grant select, insert on public.product_source_assets to authenticated;
grant select, insert on public.model_jobs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-source',
  'product-source',
  false,
  7000000,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-assets',
  'product-assets',
  true,
  7000000,
  array['image/png', 'image/jpeg', 'image/webp', 'model/gltf-binary', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_source_objects_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-source'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (public.has_role('artisan') or public.has_role('seller') or public.has_role('admin'))
);

create policy product_source_objects_owner_read
on storage.objects for select to authenticated
using (
  bucket_id = 'product-source'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy product_source_objects_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-source'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy product_assets_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (public.has_role('artisan') or public.has_role('seller') or public.has_role('admin'))
);

create policy product_assets_public_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-assets');

create policy product_assets_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'product-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'product-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy product_assets_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

comment on table public.model_jobs is
  'Asynchronous 3D reconstruction jobs. Only a trusted service-role worker may update execution state.';
comment on function public.claim_model_job() is
  'Atomically claims the oldest queued 3D job for a trusted service-role worker.';
comment on column public.products.model_report is
  'Generator measurements and limitations. A single photograph does not verify unseen surfaces.';

notify pgrst, 'reload schema';

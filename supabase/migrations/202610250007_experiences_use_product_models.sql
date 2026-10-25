-- Editorial 3D/VR experiences select an already reviewed artisan product model.
-- This replaces the separate admin GLB upload flow while preserving legacy rows.
begin;

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 3000),
  model_path text unique,
  product_id uuid references public.products(id) on delete cascade,
  model_asset_id uuid references public.product_model_assets(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'published')),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.experiences add column if not exists product_id uuid references public.products(id) on delete cascade;
alter table public.experiences add column if not exists model_asset_id uuid references public.product_model_assets(id) on delete restrict;
alter table public.experiences add column if not exists model_path text;
alter table public.experiences alter column model_path drop not null;
alter table public.experiences drop constraint if exists experience_model_path;
alter table public.experiences drop constraint if exists experience_has_model;
alter table public.experiences add constraint experience_has_model
  check (model_asset_id is not null or model_path is not null) not valid;

create unique index if not exists experiences_model_asset_unique
  on public.experiences(model_asset_id) where model_asset_id is not null;

alter table public.experiences enable row level security;
drop policy if exists experiences_published_read on public.experiences;
create policy experiences_published_read on public.experiences
  for select to anon, authenticated using (status = 'published');
drop policy if exists experiences_admin_read on public.experiences;
create policy experiences_admin_read on public.experiences
  for select to authenticated using (public.has_role('admin'));
drop policy if exists experiences_admin_insert on public.experiences;
create policy experiences_admin_insert on public.experiences
  for insert to authenticated with check (
    public.has_role('admin') and uploaded_by = auth.uid() and status = 'draft'
  );
drop policy if exists experiences_admin_update on public.experiences;
create policy experiences_admin_update on public.experiences
  for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
grant select on public.experiences to anon, authenticated;
grant insert, update on public.experiences to authenticated;

notify pgrst, 'reload schema';
commit;

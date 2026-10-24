-- Editorial experiences are independent of artisan product images/model_jobs.
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 3000),
  model_path text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint experience_model_path check (model_path = id::text || '/model.glb')
);

alter table public.experiences enable row level security;
create policy experiences_published_read on public.experiences
  for select to anon, authenticated using (status = 'published');
create policy experiences_admin_read on public.experiences
  for select to authenticated using (public.has_role('admin'));
create policy experiences_admin_insert on public.experiences
  for insert to authenticated with check (public.has_role('admin') and uploaded_by = auth.uid() and status = 'draft');
create policy experiences_admin_update on public.experiences
  for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
grant select on public.experiences to anon, authenticated;
grant insert, update on public.experiences to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('experience-models', 'experience-models', false, 4000000, array['model/gltf-binary'])
on conflict (id) do nothing;

create policy experience_models_read on storage.objects for select to anon, authenticated
using (bucket_id = 'experience-models' and (
  public.has_role('admin') or exists (
    select 1 from public.experiences e where e.model_path = name and e.status = 'published'
  )
));
create policy experience_models_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'experience-models' and public.has_role('admin'));
create policy experience_models_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'experience-models' and public.has_role('admin'));

comment on table public.experiences is 'Admin-uploaded content for the public 3D experience page; independent of seller product generation.';

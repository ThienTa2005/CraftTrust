-- Hanoi Craft-Trust: core schema, RLS, audit, and trusted workflows.
-- Forward-only migration. All privileged functions pin search_path and validate roles.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create type public.app_role as enum ('customer', 'artisan', 'seller', 'verifier', 'admin');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.cart_status as enum ('active', 'converted', 'abandoned');
create type public.order_status as enum ('placed', 'processing', 'fulfilled', 'cancelled');
create type public.payment_mode as enum ('test');
create type public.payment_status as enum ('test_succeeded', 'test_failed');
create type public.media_kind as enum ('image', 'video', 'model', 'ar_asset');
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.passport_tier as enum ('unverified', 'bronze', 'silver', 'gold');
create type public.passport_status as enum ('draft', 'active', 'revoked');
create type public.evidence_type as enum ('identity', 'origin', 'material', 'process', 'heritage_source', 'verifier_attestation');
create type public.identifier_status as enum ('active', 'revoked');
create type public.assistant_message_role as enum ('user', 'assistant');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  village_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.villages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  district text not null,
  summary text not null,
  story text not null,
  coordinates jsonb check (
    coordinates is null or
    (jsonb_typeof(coordinates) = 'object' and coordinates ? 'latitude' and coordinates ? 'longitude')
  ),
  cover_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_village_id_fkey foreign key (village_id) references public.villages(id) on delete set null;

create table public.artisans (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages(id) on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  bio text not null,
  portrait_url text,
  years_practicing integer not null default 0 check (years_practicing >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text not null,
  price_vnd bigint not null check (price_vnd >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  status public.product_status not null default 'draft',
  model_url text,
  poster_url text,
  ar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind public.media_kind not null,
  url text not null,
  alt text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.cart_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index carts_one_active_per_user on public.carts(user_id) where status = 'active';

create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0 and quantity <= 99),
  unit_price_vnd bigint not null check (unit_price_vnd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cart_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.order_status not null default 'placed',
  subtotal_vnd bigint not null check (subtotal_vnd >= 0),
  payment_mode public.payment_mode not null,
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_vnd bigint not null check (unit_price_vnd >= 0),
  line_total_vnd bigint generated always as (quantity::bigint * unit_price_vnd) stored,
  created_at timestamptz not null default now()
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider = 'internal-test'),
  mode public.payment_mode not null check (mode = 'test'),
  status public.payment_status not null,
  external_reference text,
  created_at timestamptz not null default now()
);

create table public.heritage_sources (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages(id) on delete restrict,
  title text not null,
  publisher text not null,
  source_url text not null check (source_url ~ '^https?://'),
  excerpt text not null,
  approval_status public.approval_status not null default 'pending',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((approval_status = 'approved') = (approved_by is not null and approved_at is not null))
);

create table public.passport_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete restrict,
  public_id uuid not null default gen_random_uuid() unique,
  tier public.passport_tier not null default 'unverified',
  status public.passport_status not null default 'draft',
  issued_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((status = 'active' and issued_at is not null) or status <> 'active')
);

create table public.evidence_submissions (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passport_records(id) on delete restrict,
  evidence_type public.evidence_type not null,
  source_id uuid references public.heritage_sources(id) on delete restrict,
  storage_path text,
  statement text not null check (length(trim(statement)) >= 10),
  status public.approval_status not null default 'pending',
  submitted_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'pending' and reviewed_by is null and reviewed_at is null) or
         (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)),
  check (evidence_type <> 'heritage_source' or source_id is not null)
);

create table public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence_submissions(id) on delete restrict,
  decision public.approval_status not null check (decision <> 'pending'),
  notes text not null,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.qr_identifiers (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passport_records(id) on delete restrict,
  token_hash text not null unique check (length(token_hash) = 64),
  status public.identifier_status not null default 'active',
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((status = 'revoked') = (revoked_at is not null))
);

create table public.nfc_mappings (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passport_records(id) on delete restrict,
  tag_uid_hash text not null unique check (length(tag_uid_hash) = 64),
  target_url text not null check (target_url ~ '^https://'),
  status public.identifier_status not null default 'active',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((status = 'revoked') = (revoked_at is not null))
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.heritage_sources(id) on delete cascade,
  content text not null check (length(trim(content)) >= 20),
  embedding extensions.vector(1536),
  approval_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role public.assistant_message_role not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb check (jsonb_typeof(citations) = 'array'),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index products_artisan_status_idx on public.products(artisan_id, status);
create index order_items_order_idx on public.order_items(order_id);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index evidence_passport_status_idx on public.evidence_submissions(passport_id, status, evidence_type);
create index reviews_evidence_created_idx on public.verification_reviews(evidence_id, created_at desc);
create index knowledge_source_status_idx on public.knowledge_chunks(source_id, approval_status);
create index knowledge_content_search_idx on public.knowledge_chunks using gin (to_tsvector('simple', content));

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger villages_updated_at before update on public.villages for each row execute function public.set_updated_at();
create trigger artisans_updated_at before update on public.artisans for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger carts_updated_at before update on public.carts for each row execute function public.set_updated_at();
create trigger cart_items_updated_at before update on public.cart_items for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger heritage_sources_updated_at before update on public.heritage_sources for each row execute function public.set_updated_at();
create trigger passports_updated_at before update on public.passport_records for each row execute function public.set_updated_at();
create trigger evidence_updated_at before update on public.evidence_submissions for each row execute function public.set_updated_at();
create trigger knowledge_updated_at before update on public.knowledge_chunks for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.assistant_conversations for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), ''),
    new.raw_user_meta_data ->> 'avatar_url'
  ) on conflict (id) do nothing;
  insert into public.user_roles(user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public._has_role_for(p_role public.app_role, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user_id is not null and exists (
    select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = p_role
  );
$$;

create or replace function public.has_role(p_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select public._has_role_for(p_role, auth.uid());
$$;

create or replace function public.owns_artisan(p_artisan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.artisans a where a.id = p_artisan_id and a.owner_id = auth.uid()
  );
$$;

create or replace function public.can_manage_product(p_product_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    public._has_role_for('admin', auth.uid()) or exists (
      select 1 from public.products p join public.artisans a on a.id = p.artisan_id
      where p.id = p_product_id and a.owner_id = auth.uid()
        and (public._has_role_for('seller', auth.uid()) or public._has_role_for('artisan', auth.uid()))
    )
  );
$$;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_entity_id uuid;
begin
  v_before := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_after := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_entity_id := coalesce((v_after ->> 'id')::uuid, (v_before ->> 'id')::uuid);
  insert into public.audit_events(actor_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), lower(tg_op), tg_table_name, v_entity_id, v_before, v_after);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger audit_evidence after insert or update or delete on public.evidence_submissions
for each row execute function public.audit_row_change();
create trigger audit_reviews after insert or update or delete on public.verification_reviews
for each row execute function public.audit_row_change();
create trigger audit_passports after insert or update or delete on public.passport_records
for each row execute function public.audit_row_change();
create trigger audit_sources after insert or update or delete on public.heritage_sources
for each row execute function public.audit_row_change();
create trigger audit_qr after insert or update or delete on public.qr_identifiers
for each row execute function public.audit_row_change();
create trigger audit_nfc after insert or update or delete on public.nfc_mappings
for each row execute function public.audit_row_change();
create trigger audit_orders after insert or update or delete on public.orders
for each row execute function public.audit_row_change();

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'audit events are append-only' using errcode = '42501';
end;
$$;
create trigger audit_events_immutable before update or delete on public.audit_events
for each row execute function public.prevent_audit_mutation();

create or replace function public.prevent_immutable_order_item_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'order items are immutable' using errcode = '42501';
end;
$$;
create trigger order_items_immutable before update or delete on public.order_items
for each row execute function public.prevent_immutable_order_item_mutation();

create or replace function public.protect_source_review_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.source_review', true) = 'on' then return new; end if;
  if old.approval_status <> 'pending'
     or new.approval_status is distinct from old.approval_status
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at then
    raise exception 'source approval fields are managed by review_heritage_source' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger heritage_source_review_guard before update on public.heritage_sources
for each row execute function public.protect_source_review_fields();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.villages enable row level security;
alter table public.artisans enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.heritage_sources enable row level security;
alter table public.passport_records enable row level security;
alter table public.evidence_submissions enable row level security;
alter table public.verification_reviews enable row level security;
alter table public.qr_identifiers enable row level security;
alter table public.nfc_mappings enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid() or public.has_role('admin'));
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy roles_self_select on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role('admin'));

create policy villages_public_read on public.villages for select to anon, authenticated using (is_published or public.has_role('admin') or public.has_role('verifier'));
create policy villages_admin_all on public.villages for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy artisans_public_read on public.artisans for select to anon, authenticated using (is_published or owner_id = auth.uid() or public.has_role('admin') or public.has_role('verifier'));
create policy artisans_owner_update on public.artisans for update to authenticated using (owner_id = auth.uid() and (public.has_role('artisan') or public.has_role('seller'))) with check (owner_id = auth.uid());
create policy artisans_admin_all on public.artisans for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy products_public_read on public.products for select to anon, authenticated using (
  status = 'active' and exists (select 1 from public.artisans a join public.villages v on v.id = a.village_id where a.id = artisan_id and a.is_published and v.is_published)
  or public.can_manage_product(id) or public.has_role('verifier')
);
create policy products_owner_insert on public.products for insert to authenticated with check (public.owns_artisan(artisan_id) and (public.has_role('artisan') or public.has_role('seller')));
create policy products_owner_update on public.products for update to authenticated using (public.can_manage_product(id)) with check (public.owns_artisan(artisan_id) or public.has_role('admin'));
create policy products_admin_delete on public.products for delete to authenticated using (public.has_role('admin'));

create policy media_public_read on public.product_media for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active') or public.can_manage_product(product_id));
create policy media_manager_all on public.product_media for all to authenticated using (public.can_manage_product(product_id)) with check (public.can_manage_product(product_id));

create policy carts_owner_read on public.carts for select to authenticated using (user_id = auth.uid());
create policy cart_items_owner_read on public.cart_items for select to authenticated using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

create policy orders_customer_or_seller_read on public.orders for select to authenticated using (
  user_id = auth.uid() or public.has_role('admin') or exists (
    select 1 from public.order_items oi where oi.order_id = id and public.can_manage_product(oi.product_id)
  )
);
create policy order_items_customer_or_seller_read on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  or public.can_manage_product(product_id) or public.has_role('admin')
);
create policy payments_customer_admin_read on public.payment_attempts for select to authenticated using (
  public.has_role('admin') or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

create policy sources_approved_read on public.heritage_sources for select to anon, authenticated using (approval_status = 'approved' or public.has_role('verifier') or public.has_role('admin'));
create policy sources_reviewer_insert on public.heritage_sources for insert to authenticated with check (
  (public.has_role('verifier') or public.has_role('admin')) and approval_status = 'pending' and approved_by is null and approved_at is null
);
create policy sources_reviewer_update on public.heritage_sources for update to authenticated using (public.has_role('verifier') or public.has_role('admin')) with check (public.has_role('verifier') or public.has_role('admin'));
create policy sources_admin_delete_pending on public.heritage_sources for delete to authenticated using (public.has_role('admin') and approval_status = 'pending');

create policy passports_public_read on public.passport_records for select to anon, authenticated using (status = 'active' or public.can_manage_product(product_id) or public.has_role('verifier') or public.has_role('admin'));
create policy passports_manager_insert on public.passport_records for insert to authenticated with check (public.can_manage_product(product_id) and tier = 'unverified' and status = 'draft');

create policy evidence_authorized_read on public.evidence_submissions for select to authenticated using (
  submitted_by = auth.uid() or public.has_role('verifier') or public.has_role('admin') or exists (
    select 1 from public.passport_records pr where pr.id = passport_id and public.can_manage_product(pr.product_id)
  )
);
create policy evidence_manager_submit on public.evidence_submissions for insert to authenticated with check (
  submitted_by = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null and exists (
    select 1 from public.passport_records pr where pr.id = passport_id and public.can_manage_product(pr.product_id)
  )
);
create policy reviews_authorized_read on public.verification_reviews for select to authenticated using (
  reviewer_id = auth.uid() or public.has_role('verifier') or public.has_role('admin') or exists (
    select 1 from public.evidence_submissions e join public.passport_records pr on pr.id = e.passport_id
    where e.id = evidence_id and (e.submitted_by = auth.uid() or public.can_manage_product(pr.product_id))
  )
);

create policy qr_managers_read on public.qr_identifiers for select to authenticated using (
  public.has_role('verifier') or public.has_role('admin') or exists (select 1 from public.passport_records pr where pr.id = passport_id and public.can_manage_product(pr.product_id))
);
create policy nfc_managers_read on public.nfc_mappings for select to authenticated using (
  public.has_role('verifier') or public.has_role('admin') or exists (select 1 from public.passport_records pr where pr.id = passport_id and public.can_manage_product(pr.product_id))
);

create policy knowledge_approved_read on public.knowledge_chunks for select to anon, authenticated using (
  approval_status = 'approved' and exists (select 1 from public.heritage_sources hs where hs.id = source_id and hs.approval_status = 'approved')
  or public.has_role('verifier') or public.has_role('admin')
);
create policy knowledge_reviewer_all on public.knowledge_chunks for all to authenticated using (public.has_role('verifier') or public.has_role('admin')) with check (public.has_role('verifier') or public.has_role('admin'));

create policy conversations_owner_all on public.assistant_conversations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_owner_read on public.assistant_messages for select to authenticated using (exists (select 1 from public.assistant_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy messages_owner_insert on public.assistant_messages for insert to authenticated with check (exists (select 1 from public.assistant_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy audit_reviewer_read on public.audit_events for select to authenticated using (public.has_role('verifier') or public.has_role('admin'));

create or replace function public.add_to_cart(p_product_id uuid, p_quantity integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_cart uuid;
  v_product public.products%rowtype;
  v_quantity integer;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_quantity < 1 or p_quantity > 99 then raise exception 'quantity must be between 1 and 99' using errcode = '22023'; end if;

  select p.* into v_product
  from public.products p
  join public.artisans a on a.id = p.artisan_id and a.is_published
  join public.villages v on v.id = a.village_id and v.is_published
  where p.id = p_product_id and p.status = 'active'
  for update of p;
  if not found then raise exception 'active product not found' using errcode = 'P0002'; end if;

  insert into public.carts(user_id) values (v_user)
  on conflict (user_id) where status = 'active' do nothing;
  select id into v_cart from public.carts where user_id = v_user and status = 'active' for update;

  select coalesce(quantity, 0) + p_quantity into v_quantity from public.cart_items where cart_id = v_cart and product_id = p_product_id;
  v_quantity := coalesce(v_quantity, p_quantity);
  if v_quantity > v_product.stock_quantity then raise exception 'requested quantity exceeds stock' using errcode = '23514'; end if;

  insert into public.cart_items(cart_id, product_id, quantity, unit_price_vnd)
  values (v_cart, p_product_id, p_quantity, v_product.price_vnd)
  on conflict (cart_id, product_id) do update
    set quantity = public.cart_items.quantity + excluded.quantity,
        unit_price_vnd = excluded.unit_price_vnd,
        updated_at = now();

  return jsonb_build_object('cart_id', v_cart, 'product_id', p_product_id, 'quantity', v_quantity, 'unit_price_vnd', v_product.price_vnd);
end;
$$;

create or replace function public.checkout_test_cart(p_shipping_address jsonb, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_cart uuid;
  v_order uuid;
  v_existing public.orders%rowtype;
  v_subtotal bigint;
  v_item record;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 200 then raise exception 'invalid idempotency key' using errcode = '22023'; end if;
  if p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object'
     or coalesce(trim(p_shipping_address ->> 'recipient_name'), '') = ''
     or coalesce(trim(p_shipping_address ->> 'phone'), '') = ''
     or coalesce(trim(p_shipping_address ->> 'address_line'), '') = '' then
    raise exception 'shipping address requires recipient_name, phone, and address_line' using errcode = '22023';
  end if;

  select * into v_existing from public.orders where user_id = v_user and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('order_id', v_existing.id, 'status', v_existing.status, 'subtotal_vnd', v_existing.subtotal_vnd, 'payment_mode', v_existing.payment_mode, 'idempotent_replay', true);
  end if;

  select id into v_cart from public.carts where user_id = v_user and status = 'active' for update;
  if v_cart is null then raise exception 'active cart not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.cart_items where cart_id = v_cart) then raise exception 'cart is empty' using errcode = '22023'; end if;

  for v_item in
    select ci.product_id, ci.quantity, ci.unit_price_vnd, p.name, p.price_vnd, p.stock_quantity, p.status
    from public.cart_items ci join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart order by p.id for update of p
  loop
    if v_item.status <> 'active' then raise exception 'cart contains inactive product %', v_item.product_id using errcode = '23514'; end if;
    if v_item.quantity > v_item.stock_quantity then raise exception 'insufficient stock for product %', v_item.product_id using errcode = '23514'; end if;
  end loop;

  select sum(ci.quantity::bigint * p.price_vnd) into v_subtotal
  from public.cart_items ci join public.products p on p.id = ci.product_id where ci.cart_id = v_cart;

  insert into public.orders(user_id, subtotal_vnd, payment_mode, shipping_address, idempotency_key)
  values (v_user, v_subtotal, 'test', p_shipping_address, p_idempotency_key) returning id into v_order;

  insert into public.order_items(order_id, product_id, product_name, quantity, unit_price_vnd)
  select v_order, p.id, p.name, ci.quantity, p.price_vnd
  from public.cart_items ci join public.products p on p.id = ci.product_id where ci.cart_id = v_cart;

  update public.products p set stock_quantity = p.stock_quantity - ci.quantity
  from public.cart_items ci where ci.cart_id = v_cart and p.id = ci.product_id;

  insert into public.payment_attempts(order_id, provider, mode, status, external_reference)
  values (v_order, 'internal-test', 'test', 'test_succeeded', 'test:' || v_order::text);
  update public.carts set status = 'converted' where id = v_cart;

  return jsonb_build_object('order_id', v_order, 'status', 'placed', 'subtotal_vnd', v_subtotal, 'payment_mode', 'test', 'idempotent_replay', false);
exception when unique_violation then
  select * into v_existing from public.orders where user_id = v_user and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('order_id', v_existing.id, 'status', v_existing.status, 'subtotal_vnd', v_existing.subtotal_vnd, 'payment_mode', v_existing.payment_mode, 'idempotent_replay', true); end if;
  raise;
end;
$$;

create or replace function public.recompute_passport_tier(p_passport_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_old public.passport_tier;
  v_new public.passport_tier := 'unverified';
  v_status public.passport_status;
  v_has_identity boolean;
  v_has_origin boolean;
  v_has_material boolean;
  v_has_process boolean;
  v_has_heritage boolean;
  v_has_attestation boolean;
begin
  if not (public.has_role('verifier') or public.has_role('admin')) then raise exception 'verifier or admin role required' using errcode = '42501'; end if;
  select tier, status into v_old, v_status from public.passport_records where id = p_passport_id for update;
  if not found then raise exception 'passport not found' using errcode = 'P0002'; end if;
  if v_status = 'revoked' then raise exception 'revoked passport cannot be recomputed' using errcode = '55000'; end if;

  select
    bool_or(evidence_type = 'identity'), bool_or(evidence_type = 'origin'),
    bool_or(evidence_type = 'material'), bool_or(evidence_type = 'process'),
    bool_or(evidence_type = 'heritage_source' and exists (select 1 from public.heritage_sources hs where hs.id = e.source_id and hs.approval_status = 'approved')),
    bool_or(evidence_type = 'verifier_attestation')
  into v_has_identity, v_has_origin, v_has_material, v_has_process, v_has_heritage, v_has_attestation
  from public.evidence_submissions e where passport_id = p_passport_id and status = 'approved';

  if coalesce(v_has_identity, false) and coalesce(v_has_origin, false) then v_new := 'bronze'; end if;
  if v_new = 'bronze' and coalesce(v_has_material, false) and coalesce(v_has_process, false) then v_new := 'silver'; end if;
  if v_new = 'silver' and coalesce(v_has_heritage, false) and coalesce(v_has_attestation, false) then v_new := 'gold'; end if;

  update public.passport_records set
    tier = v_new,
    status = case when v_new = 'unverified' then 'draft'::public.passport_status else 'active'::public.passport_status end,
    issued_at = case when v_new = 'unverified' then null else coalesce(issued_at, now()) end
  where id = p_passport_id;
  return jsonb_build_object('passport_id', p_passport_id, 'previous_tier', v_old, 'tier', v_new);
end;
$$;

create or replace function public.review_evidence(p_evidence_id uuid, p_decision public.approval_status, p_notes text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_evidence public.evidence_submissions%rowtype;
  v_tier jsonb;
begin
  if not (public.has_role('verifier') or public.has_role('admin')) then raise exception 'verifier or admin role required' using errcode = '42501'; end if;
  if p_decision = 'pending' then raise exception 'decision must be approved or rejected' using errcode = '22023'; end if;
  if coalesce(length(trim(p_notes)), 0) < 3 then raise exception 'review notes are required' using errcode = '22023'; end if;
  select * into v_evidence from public.evidence_submissions where id = p_evidence_id for update;
  if not found then raise exception 'evidence not found' using errcode = 'P0002'; end if;
  if v_evidence.status <> 'pending' then raise exception 'evidence has already been reviewed' using errcode = '55000'; end if;

  update public.evidence_submissions set status = p_decision, reviewed_by = auth.uid(), review_notes = p_notes, reviewed_at = now() where id = p_evidence_id;
  insert into public.verification_reviews(evidence_id, decision, notes, reviewer_id) values (p_evidence_id, p_decision, p_notes, auth.uid());
  v_tier := public.recompute_passport_tier(v_evidence.passport_id);
  return jsonb_build_object('evidence_id', p_evidence_id, 'decision', p_decision, 'passport', v_tier);
end;
$$;

create or replace function public.review_heritage_source(p_source_id uuid, p_decision public.approval_status)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_role('verifier') or public.has_role('admin')) then raise exception 'verifier or admin role required' using errcode = '42501'; end if;
  if p_decision = 'pending' then raise exception 'decision must be approved or rejected' using errcode = '22023'; end if;
  perform set_config('app.source_review', 'on', true);
  update public.heritage_sources set approval_status = p_decision,
    approved_by = case when p_decision = 'approved' then auth.uid() else null end,
    approved_at = case when p_decision = 'approved' then now() else null end
  where id = p_source_id;
  if not found then raise exception 'heritage source not found' using errcode = 'P0002'; end if;
  return jsonb_build_object('source_id', p_source_id, 'decision', p_decision);
end;
$$;

create or replace function public.issue_qr_identifier(p_passport_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_id uuid;
begin
  if not exists (select 1 from public.passport_records pr where pr.id = p_passport_id and pr.status = 'active' and (public.can_manage_product(pr.product_id) or public.has_role('verifier') or public.has_role('admin'))) then
    raise exception 'active manageable passport not found' using errcode = '42501';
  end if;
  insert into public.qr_identifiers(passport_id, token_hash) values (p_passport_id, encode(extensions.digest(v_token, 'sha256'), 'hex')) returning id into v_id;
  return jsonb_build_object('identifier_id', v_id, 'token', v_token, 'resolver_path', '/passport/qr/' || v_token);
end;
$$;

create or replace function public.resolve_qr_identifier(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'public_id', pr.public_id, 'tier', pr.tier, 'status', pr.status, 'issued_at', pr.issued_at,
    'product', jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'description', p.description, 'poster_url', p.poster_url, 'model_url', p.model_url, 'ar_url', p.ar_url),
    'artisan', jsonb_build_object('id', a.id, 'slug', a.slug, 'name', a.name),
    'village', jsonb_build_object('id', v.id, 'slug', v.slug, 'name', v.name)
  )
  from public.qr_identifiers qi
  join public.passport_records pr on pr.id = qi.passport_id
  join public.products p on p.id = pr.product_id
  join public.artisans a on a.id = p.artisan_id
  join public.villages v on v.id = a.village_id
  where qi.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and qi.status = 'active' and pr.status = 'active';
$$;

create or replace function public.map_nfc_tag(p_passport_id uuid, p_raw_uid text, p_target_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_hash text; v_public_id uuid;
begin
  if p_raw_uid is null or length(trim(p_raw_uid)) < 4 then raise exception 'invalid NFC UID' using errcode = '22023'; end if;
  if p_target_url !~ '^https://' then raise exception 'NFC target must use HTTPS' using errcode = '22023'; end if;
  select pr.public_id into v_public_id from public.passport_records pr
  where pr.id = p_passport_id and pr.status = 'active'
    and (public.can_manage_product(pr.product_id) or public.has_role('verifier') or public.has_role('admin'));
  if v_public_id is null then
    raise exception 'active manageable passport not found' using errcode = '42501';
  end if;
  if p_target_url !~ ('/passport/' || v_public_id::text || '/?$') then raise exception 'NFC target must be the canonical public passport URL' using errcode = '22023'; end if;
  v_hash := encode(extensions.digest(p_raw_uid, 'sha256'), 'hex');
  insert into public.nfc_mappings(passport_id, tag_uid_hash, target_url) values (p_passport_id, v_hash, p_target_url) returning id into v_id;
  return jsonb_build_object('mapping_id', v_id, 'passport_id', p_passport_id, 'target_url', p_target_url);
end;
$$;

create or replace function public.resolve_nfc_tag(p_raw_uid text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('target_url', nm.target_url, 'public_id', pr.public_id, 'tier', pr.tier, 'status', pr.status)
  from public.nfc_mappings nm join public.passport_records pr on pr.id = nm.passport_id
  where nm.tag_uid_hash = encode(extensions.digest(p_raw_uid, 'sha256'), 'hex') and nm.status = 'active' and pr.status = 'active';
$$;

create or replace function public.revoke_qr_identifier(p_identifier_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.qr_identifiers qi join public.passport_records pr on pr.id = qi.passport_id where qi.id = p_identifier_id and (public.can_manage_product(pr.product_id) or public.has_role('verifier') or public.has_role('admin'))) then raise exception 'identifier not manageable' using errcode = '42501'; end if;
  update public.qr_identifiers set status = 'revoked', revoked_at = now() where id = p_identifier_id and status = 'active';
  return jsonb_build_object('identifier_id', p_identifier_id, 'status', 'revoked');
end;
$$;

create or replace function public.revoke_nfc_mapping(p_mapping_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.nfc_mappings nm join public.passport_records pr on pr.id = nm.passport_id where nm.id = p_mapping_id and (public.can_manage_product(pr.product_id) or public.has_role('verifier') or public.has_role('admin'))) then raise exception 'mapping not manageable' using errcode = '42501'; end if;
  update public.nfc_mappings set status = 'revoked', revoked_at = now() where id = p_mapping_id and status = 'active';
  return jsonb_build_object('mapping_id', p_mapping_id, 'status', 'revoked');
end;
$$;

create or replace function public.search_approved_heritage(p_query text, p_limit integer default 5)
returns table(chunk_id uuid, content text, source_id uuid, source_title text, publisher text, source_url text, rank real)
language sql stable security definer set search_path = '' as $$
  select kc.id, kc.content, hs.id, hs.title, hs.publisher, hs.source_url,
    ts_rank(to_tsvector('simple', kc.content || ' ' || hs.title), plainto_tsquery('simple', p_query))::real as rank
  from public.knowledge_chunks kc join public.heritage_sources hs on hs.id = kc.source_id
  where kc.approval_status = 'approved' and hs.approval_status = 'approved'
    and length(trim(p_query)) > 0
    and to_tsvector('simple', kc.content || ' ' || hs.title) @@ plainto_tsquery('simple', p_query)
  order by rank desc, kc.id
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

revoke all on function public._has_role_for(public.app_role, uuid) from public;
revoke all on function public.has_role(public.app_role) from public;
revoke all on function public.owns_artisan(uuid) from public;
revoke all on function public.can_manage_product(uuid) from public;
grant execute on function public.has_role(public.app_role) to anon, authenticated;
grant execute on function public.owns_artisan(uuid) to authenticated;
-- Anonymous read policies also call this helper; auth.uid() is null so it
-- deterministically returns false without exposing ownership data.
grant execute on function public.can_manage_product(uuid) to anon, authenticated;

revoke all on function public.add_to_cart(uuid, integer) from public;
revoke all on function public.checkout_test_cart(jsonb, text) from public;
revoke all on function public.recompute_passport_tier(uuid) from public;
revoke all on function public.review_evidence(uuid, public.approval_status, text) from public;
revoke all on function public.review_heritage_source(uuid, public.approval_status) from public;
revoke all on function public.issue_qr_identifier(uuid) from public;
revoke all on function public.map_nfc_tag(uuid, text, text) from public;
revoke all on function public.revoke_qr_identifier(uuid) from public;
revoke all on function public.revoke_nfc_mapping(uuid) from public;
grant execute on function public.add_to_cart(uuid, integer) to authenticated;
grant execute on function public.checkout_test_cart(jsonb, text) to authenticated;
grant execute on function public.recompute_passport_tier(uuid) to authenticated;
grant execute on function public.review_evidence(uuid, public.approval_status, text) to authenticated;
grant execute on function public.review_heritage_source(uuid, public.approval_status) to authenticated;
grant execute on function public.issue_qr_identifier(uuid) to authenticated;
grant execute on function public.map_nfc_tag(uuid, text, text) to authenticated;
grant execute on function public.revoke_qr_identifier(uuid) to authenticated;
grant execute on function public.revoke_nfc_mapping(uuid) to authenticated;

revoke all on function public.resolve_qr_identifier(text) from public;
revoke all on function public.resolve_nfc_tag(text) from public;
revoke all on function public.search_approved_heritage(text, integer) from public;
grant execute on function public.resolve_qr_identifier(text) to anon, authenticated;
grant execute on function public.resolve_nfc_tag(text) to anon, authenticated;
grant execute on function public.search_approved_heritage(text, integer) to anon, authenticated;

grant usage on schema public to anon, authenticated;
-- Supabase projects commonly grant broad table privileges through default
-- privileges. Reset them explicitly; RLS is defense-in-depth, not the only gate.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.villages, public.artisans, public.products, public.product_media, public.heritage_sources, public.passport_records, public.knowledge_chunks to anon, authenticated;
grant select on public.profiles, public.user_roles, public.carts, public.cart_items, public.orders, public.order_items, public.payment_attempts, public.evidence_submissions, public.verification_reviews, public.qr_identifiers, public.nfc_mappings, public.assistant_conversations, public.assistant_messages, public.audit_events to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.villages, public.artisans, public.products, public.product_media, public.heritage_sources, public.knowledge_chunks to authenticated;
grant insert on public.passport_records, public.evidence_submissions, public.assistant_conversations, public.assistant_messages to authenticated;
grant update, delete on public.assistant_conversations to authenticated;

comment on table public.audit_events is 'Append-only security and workflow audit trail; clients have no mutation policy.';
comment on table public.payment_attempts is 'Only explicit internal test-mode attempts exist in this implementation; no live payment provider is integrated.';
comment on column public.qr_identifiers.token_hash is 'SHA-256 hash only. Raw QR token is returned once by issue_qr_identifier.';
comment on column public.nfc_mappings.tag_uid_hash is 'SHA-256 hash only. Raw NFC UID is never stored.';
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
  camera_direction text check (camera_direction in ('FRONT', 'BACK', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'CUSTOM')),
  camera_azimuth double precision check (camera_azimuth >= 0 and camera_azimuth < 360),
  created_at timestamptz not null default now(),
  unique (product_id, ordinal),
  unique (storage_path),
  constraint source_custom_angle_required check (camera_direction is distinct from 'CUSTOM' or camera_azimuth is not null)
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
-- Email/password account onboarding for buyers and self-registered sellers.
-- Privileged roles (admin and verifier) are never accepted from user metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_account_type text;
  v_village_id uuid;
begin
  v_display_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Thành viên mới'
    ),
    120
  );
  v_account_type := case
    when new.raw_user_meta_data ->> 'account_type' = 'seller' then 'seller'
    else 'customer'
  end;

  insert into public.profiles(id, display_name, avatar_url)
  values (new.id, v_display_name, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  insert into public.user_roles(user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  if v_account_type = 'seller' then
    insert into public.user_roles(user_id, role)
    values (new.id, 'seller')
    on conflict do nothing;

    select v.id
    into v_village_id
    from public.villages as v
    where v.slug in ('bat-trang', 'demo-bat-trang')
    order by case when v.slug = 'bat-trang' then 0 else 1 end
    limit 1;

    if v_village_id is not null then
      insert into public.artisans(
        village_id,
        owner_id,
        slug,
        name,
        bio,
        years_practicing,
        is_published
      )
      values (
        v_village_id,
        new.id,
        'seller-' || replace(new.id::text, '-', ''),
        v_display_name,
        'Hồ sơ người bán tự đăng ký. Nghệ nhân có thể bổ sung câu chuyện và thông tin nghề nghiệp sau.',
        0,
        true
      )
      on conflict (slug) do nothing;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a customer profile for every signup and a Bát Tràng seller profile only when account_type=seller.';
-- Seller marketplace management: owners may remove unsold products and replace
-- their private source assets. Products referenced by an order remain protected
-- by the existing foreign key and are archived by the application instead.

create policy products_owner_delete
on public.products for delete to authenticated
using (
  public.can_manage_product(id)
  and not exists (
    select 1 from public.order_items oi where oi.product_id = id
  )
);

create policy product_source_assets_owner_update
on public.product_source_assets for update to authenticated
using (public.can_manage_product(product_id))
with check (public.can_manage_product(product_id));

create policy product_source_assets_owner_delete
on public.product_source_assets for delete to authenticated
using (public.can_manage_product(product_id));

grant update, delete on public.product_source_assets to authenticated;

create or replace function public.set_cart_quantity(
  p_product_id uuid,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_cart uuid;
  v_stock integer;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_quantity < 0 or p_quantity > 99 then
    raise exception 'quantity must be between 0 and 99' using errcode = '22023';
  end if;

  select id into v_cart
  from public.carts
  where user_id = v_user and status = 'active';
  if v_cart is null then
    raise exception 'active cart not found' using errcode = 'P0002';
  end if;

  if p_quantity = 0 then
    delete from public.cart_items
    where cart_id = v_cart and product_id = p_product_id;
    return jsonb_build_object('product_id', p_product_id, 'quantity', 0);
  end if;

  select stock_quantity into v_stock
  from public.products
  where id = p_product_id and status = 'active';
  if v_stock is null then
    raise exception 'product is unavailable' using errcode = 'P0002';
  end if;
  if p_quantity > v_stock then
    raise exception 'requested quantity exceeds stock' using errcode = '23514';
  end if;

  update public.cart_items
  set quantity = p_quantity, updated_at = now()
  where cart_id = v_cart and product_id = p_product_id;
  if not found then
    raise exception 'cart item not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity);
end;
$$;

revoke all on function public.set_cart_quantity(uuid, integer) from public;
grant execute on function public.set_cart_quantity(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
-- Break the orders <-> order_items policy recursion while preserving the rule:
-- customers see their whole order, sellers only see lines for products they own.

create or replace function public.can_read_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and (
        o.user_id = auth.uid()
        or public._has_role_for('admin', auth.uid())
        or exists (
          select 1
          from public.order_items oi
          where oi.order_id = o.id
            and public.can_manage_product(oi.product_id)
        )
      )
  );
$$;

create or replace function public.can_read_order_item(
  p_order_id uuid,
  p_product_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    public._has_role_for('admin', auth.uid())
    or public.can_manage_product(p_product_id)
    or exists (
      select 1
      from public.orders o
      where o.id = p_order_id and o.user_id = auth.uid()
    )
  );
$$;

revoke all on function public.can_read_order(uuid) from public;
revoke all on function public.can_read_order_item(uuid, uuid) from public;
grant execute on function public.can_read_order(uuid) to authenticated;
grant execute on function public.can_read_order_item(uuid, uuid) to authenticated;

drop policy if exists orders_customer_or_seller_read on public.orders;
create policy orders_customer_or_seller_read
on public.orders for select to authenticated
using (public.can_read_order(id));

drop policy if exists order_items_customer_or_seller_read on public.order_items;
create policy order_items_customer_or_seller_read
on public.order_items for select to authenticated
using (public.can_read_order_item(order_id, product_id));

notify pgrst, 'reload schema';
-- Production Seed Migration: Provisions standard demo and production role accounts,
-- villages, artisan profiles, and default heritage passport records.

-- 1. Create or update core auth accounts
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, recovery_token, email_change_token_new
) VALUES
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'admin@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Quản Trị Viên & Thẩm Định"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000020', 'authenticated', 'authenticated', 'seller@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Nghệ Nhân Bát Tràng"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000030', 'authenticated', 'authenticated', 'buyer@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Khách Mua Hàng"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'demo.seller@example.invalid', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Nghệ nhân Thăng Long"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'demo.verifier@example.invalid', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Chuyên gia Giám định Di sản"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'demo.customer@example.invalid', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Khách hàng CraftTrust"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO UPDATE SET encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf'));

-- 2. Profiles
INSERT INTO public.profiles(id, display_name)
VALUES
  ('10000000-0000-0000-0000-000000000010', 'Quản Trị Viên & Thẩm Định'),
  ('10000000-0000-0000-0000-000000000020', 'Nghệ Nhân Bát Tràng (Nguyễn An)'),
  ('10000000-0000-0000-0000-000000000030', 'Khách Mua Hàng'),
  ('10000000-0000-0000-0000-000000000001', 'Nghệ nhân Thăng Long'),
  ('10000000-0000-0000-0000-000000000002', 'Chuyên gia Giám định Di sản'),
  ('10000000-0000-0000-0000-000000000003', 'Khách hàng CraftTrust')
ON CONFLICT (id) DO NOTHING;

-- 3. User Roles
INSERT INTO public.user_roles(user_id, role)
VALUES
  ('10000000-0000-0000-0000-000000000010', 'customer'),
  ('10000000-0000-0000-0000-000000000010', 'verifier'),
  ('10000000-0000-0000-0000-000000000010', 'admin'),
  ('10000000-0000-0000-0000-000000000020', 'customer'),
  ('10000000-0000-0000-0000-000000000020', 'artisan'),
  ('10000000-0000-0000-0000-000000000020', 'seller'),
  ('10000000-0000-0000-0000-000000000030', 'customer'),
  ('10000000-0000-0000-0000-000000000001', 'customer'),
  ('10000000-0000-0000-0000-000000000001', 'artisan'),
  ('10000000-0000-0000-0000-000000000001', 'seller'),
  ('10000000-0000-0000-0000-000000000002', 'customer'),
  ('10000000-0000-0000-0000-000000000002', 'verifier'),
  ('10000000-0000-0000-0000-000000000002', 'admin'),
  ('10000000-0000-0000-0000-000000000003', 'customer')
ON CONFLICT DO NOTHING;

-- 4. Villages
INSERT INTO public.villages(id, slug, name, district, summary, story, coordinates, cover_image_url, is_published)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'demo-bat-trang', 'Làng gốm Bát Tràng', 'Gia Lâm',
   'Làng gốm cổ truyền ven sông Hồng với bề dày hơn 500 năm.',
   'Lịch sử hơn 5 thế kỷ của làng gốm Bát Tràng gắn liền với phù sa sông Hồng.',
   '{"latitude":20.976,"longitude":105.912}'::jsonb,
   'https://images.unsplash.com/photo-1610701596007-11502861dcfa', true),
  ('20000000-0000-0000-0000-000000000002', 'demo-van-phuc', 'Làng lụa Vạn Phúc', 'Hà Đông',
   'Tiếng thoi dệt lụa tơ tằm rộn vang khắp ngõ ngách, nổi danh với lụa vân mỏng nhẹ.',
   'Làng lụa Vạn Phúc có truyền thống hơn 1000 năm tuổi.',
   '{"latitude":20.980,"longitude":105.775}'::jsonb,
   'https://images.unsplash.com/photo-1603376335934-d50e8f8e4716', true),
  ('20000000-0000-0000-0000-000000000011', 'bat-trang', 'Làng gốm Bát Tràng', 'Gia Lâm',
   'Làng gốm cổ truyền ven sông Hồng với bề dày hơn 500 năm, nơi tinh hoa đất sét và kỹ thuật men rạn được truyền thừa qua nhiều thế hệ.',
   'Lịch sử hơn 5 thế kỷ của làng gốm Bát Tràng gắn liền với phù sa sông Hồng và bàn tay tài hoa của các thế hệ nghệ nhân.',
   '{"latitude":20.976,"longitude":105.912}'::jsonb,
   'https://images.unsplash.com/photo-1610701596007-11502861dcfa', true),
  ('20000000-0000-0000-0000-000000000012', 'van-phuc', 'Làng lụa Vạn Phúc', 'Hà Đông',
   'Tiếng thoi dệt lụa tơ tằm rộn vang khắp ngõ ngách, nổi danh với lụa vân mỏng nhẹ, thoáng mát và bền đẹp bậc nhất đất kinh kỳ.',
   'Làng lụa Vạn Phúc có truyền thống hơn 1000 năm tuổi, gìn giữ tơ tằm tự nhiên và hoa văn dệt cổ truyền Thăng Long.',
   '{"latitude":20.980,"longitude":105.775}'::jsonb,
   'https://images.unsplash.com/photo-1603376335934-d50e8f8e4716', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Artisans
INSERT INTO public.artisans(id, village_id, owner_id, slug, name, bio, portrait_url, years_practicing, is_published)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'demo-nguyen-an', 'Nghệ nhân Nguyễn An', 'Nghệ nhân gốm ưu tú Bát Tràng với hơn 18 năm chế tác gốm sứ độc bản.', null, 18, true),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000020', 'xuong-gom-bat-trang', 'Xưởng Gốm Nghệ Nhân Bát Tràng', 'Xưởng gốm cổ truyền Bát Tràng, chế tác thủ công ấm chén men tro, bình hút lộc men lam và gốm hỏa biến.', null, 25, true)
ON CONFLICT (slug) DO UPDATE SET owner_id = EXCLUDED.owner_id;

-- 6. Products
INSERT INTO public.products(id, artisan_id, slug, name, description, price_vnd, stock_quantity, status, poster_url)
VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'demo-men-lam-binh', 'Bình gốm men lam Bát Tràng', 'Tác phẩm bình gốm vuốt tay thủ công men lam truyền thống Bát Tràng.', 850000, 12, 'active', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'demo-khan-lua', 'Khăn lụa tơ tằm Vạn Phúc', 'Khăn lụa dệt thủ công từ tơ tằm tự nhiên Vạn Phúc mềm mại thoáng khí.', 420000, 20, 'active', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26')
ON CONFLICT (id) DO NOTHING;

-- 7. Passport Records
INSERT INTO public.passport_records(id, product_id, public_id, tier, status, issued_at)
VALUES
  ('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'gold', 'active', now())
ON CONFLICT (id) DO UPDATE SET tier = 'gold';

-- 7.1. Model Governance & 3D Assets (Migration 202610250002)
create table if not exists public.product_model_assets (
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
create unique index if not exists one_published_model_per_product on public.product_model_assets(product_id) where status='published';
alter table public.product_model_assets enable row level security;
drop policy if exists product_models_public on public.product_model_assets;
create policy product_models_public on public.product_model_assets for select to anon,authenticated
using(status='published' and exists(select 1 from public.products p where p.id=product_id and p.status='active'));
drop policy if exists product_models_owner_preview on public.product_model_assets;
create policy product_models_owner_preview on public.product_model_assets for select to authenticated using(public.can_manage_product(product_id));
drop policy if exists product_models_admin_insert on public.product_model_assets;
create policy product_models_admin_insert on public.product_model_assets for insert to authenticated with check(public.has_role('admin') and status='draft' and uploaded_by=auth.uid());
grant select on public.product_model_assets to anon,authenticated;
grant insert on public.product_model_assets to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-models','product-models',false,50000000,array['model/gltf-binary','application/octet-stream']) on conflict(id) do nothing;
drop policy if exists product_models_storage_read on storage.objects;
create policy product_models_storage_read on storage.objects for select to anon,authenticated using(bucket_id='product-models' and (public.has_role('admin') or exists(select 1 from public.product_model_assets a where a.storage_path=name)));
drop policy if exists product_models_storage_admin_insert on storage.objects;
create policy product_models_storage_admin_insert on storage.objects for insert to authenticated with check(bucket_id='product-models' and public.has_role('admin'));
drop policy if exists product_models_storage_admin_delete on storage.objects;
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

-- 7.2. Personalization & Add to Cart (Migration 202610250003)
alter table public.cart_items add column if not exists personalization jsonb;
alter table public.order_items add column if not exists personalization jsonb;
alter table public.order_items add column if not exists fulfillment_status text not null default 'placed' check(fulfillment_status in ('placed','processing','fulfilled','cancelled'));

create or replace function public.add_configured_cart_item(p_product_id uuid,p_quantity integer,p_personalization jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cart uuid; v_product public.products%rowtype; v_existing public.cart_items%rowtype;
 v_asset public.product_model_assets%rowtype; v_region jsonb; v_config jsonb:=p_personalization;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>99 then raise exception 'invalid quantity'; end if;
 select p.* into v_product from public.products p join public.artisans a on a.id=p.artisan_id and a.is_published join public.villages v on v.id=a.village_id and v.is_published where p.id=p_product_id and p.status='active' for update of p;
 if not found then raise exception 'active product not found' using errcode='P0002'; end if;
 if v_config is not null then
  if jsonb_typeof(v_config)<>'object' or octet_length(v_config::text)>510000
   or coalesce(v_config->>'schemaVersion','')<>'1'
   or length(trim(coalesce(v_config->>'text',''))) not between 1 and 400
   or coalesce(v_config->>'font','') not in ('sans','serif')
   or coalesce(v_config->>'align','') not in ('left','center','right')
   or coalesce(v_config->>'finish','') not in ('ink','gold','recessed','raised')
   or coalesce(v_config->>'previewDataUrl','') !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
   or coalesce((v_config->>'fontSizeMm')::numeric,0) not between 2 and 30
   or coalesce((v_config->>'depth')::numeric,0) not between 0.1 and 2
   or coalesce((v_config->>'rotation')::numeric,100) not between -30 and 30
  then raise exception 'invalid personalization' using errcode='22023'; end if;
  select * into v_asset from public.product_model_assets where id=(v_config->>'modelAssetId')::uuid and product_id=p_product_id and status='published';
  if not found then raise exception 'published product model required' using errcode='23514'; end if;
  select r into v_region from jsonb_array_elements(v_asset.settings->'regions') r where r->>'id'=v_config->>'regionId';
  if v_region is null or not (v_region->'finishes' ? (v_config->>'finish')) or (v_config->>'fontSizeMm')::numeric>(v_region->>'heightMm')::numeric then raise exception 'personalization region or finish unavailable' using errcode='23514'; end if;
  v_config:=v_config || jsonb_build_object('regionSnapshot',v_region,'modelSettingsSnapshot',v_asset.settings,'modelApprovedAt',v_asset.approved_at);
 end if;
 insert into public.carts(user_id) values(auth.uid()) on conflict(user_id) where status='active' do nothing;
 select id into v_cart from public.carts where user_id=auth.uid() and status='active' for update;
 select * into v_existing from public.cart_items where cart_id=v_cart and product_id=p_product_id;
 if found and (v_existing.personalization is distinct from v_config) then raise exception 'Sản phẩm đã có cấu hình khác trong giỏ. Hãy xóa dòng cũ trước khi đổi thiết kế.' using errcode='23514'; end if;
 if coalesce(v_existing.quantity,0)+p_quantity>least(v_product.stock_quantity,99) then raise exception 'requested quantity exceeds stock' using errcode='23514'; end if;
 insert into public.cart_items(cart_id,product_id,quantity,unit_price_vnd,personalization) values(v_cart,p_product_id,p_quantity,v_product.price_vnd,v_config)
 on conflict(cart_id,product_id) do update set quantity=public.cart_items.quantity+excluded.quantity,unit_price_vnd=excluded.unit_price_vnd;
 return jsonb_build_object('cart_id',v_cart,'product_id',p_product_id);
end $$;
revoke all on function public.add_configured_cart_item(uuid,integer,jsonb) from public;
grant execute on function public.add_configured_cart_item(uuid,integer,jsonb) to authenticated;

create or replace function public.add_to_cart(p_product_id uuid,p_quantity integer default 1)
returns jsonb language sql security definer set search_path='' as $$select public.add_configured_cart_item(p_product_id,p_quantity,null);$$;

create or replace function public.snapshot_order_personalization() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select ci.personalization into new.personalization from public.cart_items ci join public.carts c on c.id=ci.cart_id join public.orders o on o.user_id=c.user_id where o.id=new.order_id and c.status='active' and ci.product_id=new.product_id;
 return new;
end $$;
drop trigger if exists snapshot_order_design on public.order_items;
create trigger snapshot_order_design before insert on public.order_items for each row execute function public.snapshot_order_personalization();

create or replace function public.immutable_order_design() returns trigger language plpgsql set search_path='' as $$
begin
 if new.personalization is distinct from old.personalization then raise exception 'order personalization is immutable' using errcode='23514'; end if;
 return new;
end $$;
drop trigger if exists protect_order_design on public.order_items;
create trigger protect_order_design before update on public.order_items for each row execute function public.immutable_order_design();

create or replace function public.set_seller_fulfillment(p_order_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.order_items oi where oi.order_id=p_order_id and public.can_manage_product(oi.product_id)) and not public.has_role('admin') then raise exception 'unauthorized'; end if;
 if p_status not in ('processing','fulfilled','cancelled') then raise exception 'invalid status'; end if;
 update public.order_items set fulfillment_status=p_status where order_id=p_order_id and (public.can_manage_product(product_id) or public.has_role('admin'));
 if not exists(select 1 from public.order_items where order_id=p_order_id and fulfillment_status in ('placed','processing')) then
  update public.orders set status='fulfilled',updated_at=now() where id=p_order_id;
 elsif exists(select 1 from public.order_items where order_id=p_order_id and fulfillment_status='processing') then
  update public.orders set status='processing',updated_at=now() where id=p_order_id and status='placed';
 end if;
end $$;
revoke all on function public.set_seller_fulfillment(uuid,text) from public;
grant execute on function public.set_seller_fulfillment(uuid,text) to authenticated;

-- 7.3. 3D Worker Hardening & Passport Traceability (Migration 202610250004)
alter table public.model_jobs
  add column if not exists worker_id text,
  add column if not exists heartbeat_at timestamptz default now(),
  add column if not exists current_step text not null default 'queued',
  add column if not exists progress smallint not null default 0;

create or replace function public.claim_model_job(p_worker_id text default 'worker-default')
returns setof public.model_jobs
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.model_jobs
  set status = 'processing',
      current_step = 'preprocessing',
      worker_id = p_worker_id,
      heartbeat_at = now(),
      started_at = now(),
      error = null
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

create or replace function public.heartbeat_model_job(
  p_job_id uuid,
  p_worker_id text,
  p_step text,
  p_progress smallint default 0
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.model_jobs
  set heartbeat_at = now(),
      worker_id = p_worker_id,
      current_step = p_step,
      progress = p_progress
  where id = p_job_id;
  return found;
end;
$$;

create or replace function public.reap_stale_model_jobs(p_timeout_minutes integer default 5)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  with timed_out as (
    update public.model_jobs
    set status = 'failed',
        finished_at = now(),
        error = 'Xử lý vượt quá giới hạn thời gian (Worker timeout hoặc mất kết nối sau ' || p_timeout_minutes || ' phút)'
    where status = 'processing'
      and (heartbeat_at < now() - (p_timeout_minutes || ' minutes')::interval)
    returning product_id
  )
  update public.products p
  set model_status = 'failed',
      model_error = 'Quá thời gian xử lý dựng mô hình 3D. Vui lòng bấm Thử tạo lại.'
  from timed_out t
  where p.id = t.product_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.claim_model_job(text) from public, anon, authenticated;
grant execute on function public.claim_model_job(text) to service_role;
revoke all on function public.heartbeat_model_job(uuid, text, text, smallint) from public, anon, authenticated;
grant execute on function public.heartbeat_model_job(uuid, text, text, smallint) to service_role;
revoke all on function public.reap_stale_model_jobs(integer) from public, anon, authenticated;
grant execute on function public.reap_stale_model_jobs(integer) to service_role;

alter table public.passport_records
  add column if not exists public_code text,
  add column if not exists artifact_id text,
  add column if not exists batch_code text,
  add column if not exists qr_placement jsonb default '{"enabled":true,"sizePercent":60,"rotation":0,"position":[0,0]}'::jsonb;

create unique index if not exists passport_records_public_code_idx on public.passport_records(public_code) where public_code is not null;

drop policy if exists passport_records_public_trace on public.passport_records;
create policy passport_records_public_trace on public.passport_records
  for select to anon, authenticated
  using (status = 'active' or public_code is not null);

-- 7.4. Order Lifecycle Updates & Engine Compatibility (Migrations 202610250005 & 0006)
do $$
begin
  if not exists (
    select 1 from pg_policy where polrelid = 'public.orders'::regclass and polname = 'orders_update_status'
  ) then
    create policy orders_update_status on public.orders
      for update to authenticated
      using (can_read_order(id))
      with check (can_read_order(id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policy where polrelid = 'public.artisans'::regclass and polname = 'artisans_admin_update'
  ) then
    create policy artisans_admin_update on public.artisans
      for update to authenticated
      using (public._has_role_for('admin', auth.uid()))
      with check (public._has_role_for('admin', auth.uid()));
  end if;
end $$;

alter table public.model_jobs alter column engine set default 'auto';

-- 8. 3D/VR Curated Experiences
CREATE TABLE IF NOT EXISTS public.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 3000),
  model_path text UNIQUE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  model_asset_id uuid REFERENCES public.product_model_assets(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS model_asset_id uuid REFERENCES public.product_model_assets(id) ON DELETE RESTRICT;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS model_path text;
ALTER TABLE public.experiences ALTER COLUMN model_path DROP NOT NULL;
ALTER TABLE public.experiences DROP CONSTRAINT IF EXISTS experience_has_model;
ALTER TABLE public.experiences ADD CONSTRAINT experience_has_model
  CHECK (model_asset_id IS NOT NULL OR model_path IS NOT NULL) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS experiences_model_asset_unique
  ON public.experiences(model_asset_id) WHERE model_asset_id IS NOT NULL;

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS experiences_published_read ON public.experiences;
CREATE POLICY experiences_published_read ON public.experiences
  FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS experiences_admin_read ON public.experiences;
CREATE POLICY experiences_admin_read ON public.experiences
  FOR SELECT TO authenticated USING (public.has_role('admin'));

DROP POLICY IF EXISTS experiences_admin_insert ON public.experiences;
CREATE POLICY experiences_admin_insert ON public.experiences
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role('admin') AND uploaded_by = auth.uid() AND status = 'draft'
  );

DROP POLICY IF EXISTS experiences_admin_update ON public.experiences;
CREATE POLICY experiences_admin_update ON public.experiences
  FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

GRANT SELECT ON public.experiences TO anon, authenticated;
GRANT INSERT, UPDATE ON public.experiences TO authenticated;

-- 9. 3D Camera Angles & Model Quality Enforcement (Migration 202610250008)
ALTER TABLE public.product_source_assets
  ADD COLUMN IF NOT EXISTS camera_direction text CHECK (camera_direction IN ('FRONT','BACK','LEFT','RIGHT','TOP','BOTTOM','CUSTOM')),
  ADD COLUMN IF NOT EXISTS camera_azimuth double precision CHECK (camera_azimuth >= 0 AND camera_azimuth < 360);

ALTER TABLE public.product_source_assets DROP CONSTRAINT IF EXISTS source_custom_angle_required;
ALTER TABLE public.product_source_assets ADD CONSTRAINT source_custom_angle_required
  CHECK (camera_direction IS DISTINCT FROM 'CUSTOM' OR camera_azimuth IS NOT NULL);

ALTER TABLE public.product_model_assets
  ADD COLUMN IF NOT EXISTS quality_report jsonb,
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'NEEDS_REVIEW'
  CHECK (review_state IN ('GENERATING','GENERATED','QUALITY_CHECKING','NEEDS_REVIEW','APPROVED','REJECTED','PUBLISHED','FAILED'));

CREATE OR REPLACE FUNCTION public.enforce_model_quality_review() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF new.status='published' AND old.status IS DISTINCT FROM new.status THEN
   IF new.origin='generated' AND (new.quality_report IS NULL
     OR new.quality_report->>'reportVersion' IS DISTINCT FROM '3'
     OR new.quality_report->>'publicationBlocked' IS DISTINCT FROM 'false') THEN
    RAISE EXCEPTION 'Generated model is not validated for publication. Review the limitations and upload a corrected GLB.';
   END IF;
   new.review_state := 'PUBLISHED';
  ELSIF new.status='rejected' THEN new.review_state := 'REJECTED';
  ELSIF new.status IN ('pending_review','archived') THEN new.review_state := 'NEEDS_REVIEW';
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS enforce_model_quality_review ON public.product_model_assets;
CREATE TRIGGER enforce_model_quality_review BEFORE UPDATE ON public.product_model_assets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_model_quality_review();

NOTIFY pgrst, 'reload schema';


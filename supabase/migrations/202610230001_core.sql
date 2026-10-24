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

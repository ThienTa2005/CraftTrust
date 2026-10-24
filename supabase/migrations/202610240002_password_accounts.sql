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

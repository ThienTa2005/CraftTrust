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

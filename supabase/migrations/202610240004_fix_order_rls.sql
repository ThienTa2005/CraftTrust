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

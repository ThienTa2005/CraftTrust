alter table public.cart_items add column personalization jsonb;
alter table public.order_items add column personalization jsonb;
alter table public.order_items add column fulfillment_status text not null default 'placed' check(fulfillment_status in ('placed','processing','fulfilled','cancelled'));

create function public.add_configured_cart_item(p_product_id uuid,p_quantity integer,p_personalization jsonb default null)
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

create function public.snapshot_order_personalization() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select ci.personalization into new.personalization from public.cart_items ci join public.carts c on c.id=ci.cart_id join public.orders o on o.user_id=c.user_id where o.id=new.order_id and c.status='active' and ci.product_id=new.product_id;
 return new;
end $$;
create trigger snapshot_order_design before insert on public.order_items for each row execute function public.snapshot_order_personalization();
create function public.immutable_order_design() returns trigger language plpgsql set search_path='' as $$
begin
 if new.personalization is distinct from old.personalization then raise exception 'order personalization is immutable' using errcode='23514'; end if;
 return new;
end $$;
create trigger protect_order_design before update on public.order_items for each row execute function public.immutable_order_design();

create function public.set_seller_fulfillment(p_order_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not(public.has_role('artisan') or public.has_role('seller')) then raise exception 'seller required' using errcode='42501'; end if;
 if p_status not in ('processing','fulfilled') then raise exception 'invalid status'; end if;
 update public.order_items oi set fulfillment_status=p_status where oi.order_id=p_order_id and exists(select 1 from public.products p join public.artisans a on a.id=p.artisan_id where p.id=oi.product_id and a.owner_id=auth.uid()) and oi.fulfillment_status in ('placed','processing');
 if not found then raise exception 'no manageable order items' using errcode='42501'; end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'seller_fulfillment','orders',p_order_id,jsonb_build_object('status',p_status));
end $$;
revoke all on function public.set_seller_fulfillment(uuid,text) from public;
grant execute on function public.set_seller_fulfillment(uuid,text) to authenticated;
notify pgrst,'reload schema';

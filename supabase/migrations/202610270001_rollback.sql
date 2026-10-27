-- Rollback Migration: 202610270001_rollback.sql
-- Description: Revert enqueue_pixal3d_job to enforce single-view only.

create or replace function public.enqueue_pixal3d_job(
  p_product_id uuid,
  p_mode text,
  p_idempotency_key uuid,
  p_resolution integer default 1024
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_owner uuid; v_job uuid; v_attempt integer; v_source_count integer;
  v_limit public.model_compute_limits%rowtype; v_daily numeric; v_monthly numeric;
  v_manifest jsonb;
begin
  if auth.uid() is null or not public.can_manage_product(p_product_id) then
    raise exception 'product ownership required' using errcode='42501';
  end if;
  if p_mode is null or p_idempotency_key is null or p_mode not in ('single','multiview') or p_resolution is distinct from 1024 then
    raise exception 'invalid Pixal3D mode or resolution';
  end if;
  if p_mode='multiview' then
    raise exception 'Multi-view disabled until calibrated camera metadata and benchmark are available';
  end if;

  select a.owner_id into v_owner from public.products p join public.artisans a on a.id=p.artisan_id
    where p.id=p_product_id;
  if v_owner is null then raise exception 'product owner unavailable'; end if;

  perform 1 from public.products where id=p_product_id for update;

  select id into v_job from public.model_jobs where seller_id=v_owner and idempotency_key=p_idempotency_key;
  if v_job is not null then
    if not exists(select 1 from public.model_jobs where id=v_job and product_id=p_product_id and mode=p_mode) then
      raise exception 'idempotency key belongs to another request';
    end if;
    return jsonb_build_object('id',v_job,'idempotent',true);
  end if;

  select count(*), jsonb_agg(jsonb_build_object(
    'storagePath',s.storage_path,'mimeType',s.mime_type,'byteSize',s.byte_size,
    'ordinal',s.ordinal,'direction',s.camera_direction,'azimuth',s.camera_azimuth
  ) order by s.ordinal) into v_source_count,v_manifest
  from public.product_source_assets s where s.product_id=p_product_id;

  if v_source_count < 1 or v_source_count > 4 then raise exception 'Pixal3D requires 1-4 source images'; end if;
  if not exists(select 1 from public.product_source_assets where product_id=p_product_id and camera_direction='FRONT') then
    raise exception 'a canonical FRONT image is required';
  end if;

  if exists(select 1 from public.model_jobs where product_id=p_product_id and engine='pixal3d'
    and status in ('queued','dispatched','validating','preprocessing','running','exporting','validating_output')) then
    raise exception 'an active Pixal3D job already exists' using errcode='23505';
  end if;

  select * into v_limit from public.model_compute_limits where seller_id=v_owner;
  if not found then
    insert into public.model_compute_limits(seller_id) values (v_owner) returning * into v_limit;
  end if;
  if v_limit.is_blocked then
    raise exception 'compute budget exceeded or administratively blocked' using errcode='EX001';
  end if;

  select coalesce(sum(estimated_cost_usd),0) into v_daily from public.model_jobs
    where seller_id=v_owner and created_at >= (now() - interval '24 hours');
  select coalesce(sum(estimated_cost_usd),0) into v_monthly from public.model_jobs
    where seller_id=v_owner and created_at >= (now() - interval '30 days');

  if (v_daily + v_limit.max_job_cost_usd) > v_limit.daily_budget_usd
     or (v_monthly + v_limit.max_job_cost_usd) > v_limit.monthly_budget_usd then
    raise exception 'compute budget limit reached' using errcode='EX002';
  end if;

  select coalesce(max(attempt_number),0)+1 into v_attempt from public.model_jobs where product_id=p_product_id;

  insert into public.model_jobs(
    seller_id, product_id, engine, mode, resolution, low_vram,
    input_manifest, status, current_step, progress,
    estimated_cost_usd, attempt_number, idempotency_key
  ) values (
    v_owner, p_product_id, 'pixal3d', p_mode, p_resolution, true,
    v_manifest, 'queued', 'queued', 0,
    v_limit.max_job_cost_usd, v_attempt, p_idempotency_key
  ) returning id into v_job;

  insert into public.model_outbox(job_id) values (v_job);
  update public.products set model_status='queued', model_error=null, updated_at=now() where id=p_product_id;

  return jsonb_build_object('id',v_job,'attempt',v_attempt,'mode',p_mode,'status','queued');
end;
$$;

revoke all on function public.enqueue_pixal3d_job(uuid,text,uuid,integer) from public;
grant execute on function public.enqueue_pixal3d_job(uuid,text,uuid,integer) to authenticated;

-- Migration: 202610270001_enable_multiview_and_web_glb.sql
-- Description: Enable Pixal3D multi-view and two-view generation pipelines for 1-4 images with correct schema contracts.
-- Rollback Plan: Execute supabase/migrations/202610270001_rollback.sql to restore single-view only constraint.

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
  if p_mode is null or p_idempotency_key is null or p_mode not in ('single','two_view','multiview') or p_resolution is distinct from 1024 then
    raise exception 'invalid Pixal3D mode or resolution';
  end if;

  select a.owner_id into v_owner from public.products p join public.artisans a on a.id=p.artisan_id
    where p.id=p_product_id;
  if v_owner is null then raise exception 'product owner unavailable'; end if;

  -- Serialize source snapshots and retries for this product.
  perform 1 from public.products where id=p_product_id for update;

  select id into v_job from public.model_jobs where seller_id=v_owner and idempotency_key=p_idempotency_key;
  if v_job is not null then
    if not exists(select 1 from public.model_jobs where id=v_job and product_id=p_product_id and mode=p_mode) then
      raise exception 'idempotency key belongs to another request';
    end if;
    return jsonb_build_object('id',v_job,'idempotent',true,'status','already_queued');
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

  if p_mode in ('two_view', 'multiview') and (v_source_count < 2 or exists(
    select 1 from public.product_source_assets where product_id=p_product_id
      and (camera_direction not in ('FRONT','RIGHT','BACK','LEFT') or camera_azimuth is null)
  )) then
    raise exception 'multi-view requires 2-4 calibrated cardinal views';
  end if;

  -- If an active job already exists, return it to allow the caller to monitor without conflict
  select id into v_job from public.model_jobs where product_id=p_product_id and engine='pixal3d'
    and status in ('queued','dispatched','validating','preprocessing','running','exporting','validating_output')
    order by created_at desc limit 1;
  if v_job is not null then
    return jsonb_build_object('id',v_job,'idempotent',true,'status','already_active');
  end if;

  select * into v_limit from public.model_compute_limits where singleton=true for update;
  if not found or not v_limit.enabled then
    raise exception 'GPU budget is disabled (fail-closed)' using errcode='P0001';
  end if;

  select coalesce(sum(case when status='finalized' then actual_usd else reserved_usd end),0)
    into v_daily from public.model_budget_ledger where status='reserved' or (status='finalized' and created_at >= date_trunc('day',now()));
  select coalesce(sum(case when status='finalized' then actual_usd else reserved_usd end),0)
    into v_monthly from public.model_budget_ledger where status='reserved' or (status='finalized' and created_at >= date_trunc('month',now()));

  if v_daily+v_limit.per_job_reservation_usd > v_limit.daily_limit_usd
     or v_monthly+v_limit.per_job_reservation_usd > v_limit.monthly_limit_usd then
    raise exception 'GPU budget exceeded' using errcode='P0001';
  end if;

  select count(*)+1 into v_attempt from public.model_jobs where product_id=p_product_id;
  if v_attempt > 10 then raise exception 'maximum generation attempts reached'; end if;

  insert into public.model_jobs(
    product_id, seller_id, status, engine, provider, mode, attempt, idempotency_key,
    input_manifest, model_revision, resolution, reserved_cost_usd, current_step, progress
  ) values (
    p_product_id, v_owner, 'queued', 'pixal3d', 'modal', p_mode, v_attempt, p_idempotency_key,
    v_manifest, 'f7cf38429b0bd264f1995f0f8743a88b1c728b94', p_resolution,
    v_limit.per_job_reservation_usd, 'queued', 0
  ) returning id into v_job;

  insert into public.model_budget_ledger(job_id, reserved_usd, status)
    values (v_job, v_limit.per_job_reservation_usd, 'reserved');

  insert into public.model_dispatch_outbox(job_id) values (v_job);

  update public.products
    set status='draft', model_status='queued', model_error=null, model_report=null,
        model_url=null, model_version=null, ar_url=null, updated_at=now()
    where id=p_product_id;

  return jsonb_build_object('id',v_job,'attempt',v_attempt,'mode',p_mode,'status','queued','idempotent',false);
end;
$$;

revoke all on function public.enqueue_pixal3d_job(uuid,text,uuid,integer) from public;
grant execute on function public.enqueue_pixal3d_job(uuid,text,uuid,integer) to authenticated;

-- CraftTrust 3D Engine V2: Pixal3D on Modal. This migration preserves legacy
-- rows but prevents the legacy CPU worker from claiming new Pixal3D jobs.
begin;

alter table public.model_jobs drop constraint if exists model_jobs_status_check;
alter table public.model_jobs add constraint model_jobs_status_check check (status in (
  'queued','dispatched','validating','preprocessing','running','exporting',
  'validating_output','needs_review','approved','published','completed','failed',
  'cancelled','budget_exceeded','processing'
));
alter table public.model_jobs
  add column if not exists seller_id uuid references auth.users(id),
  add column if not exists provider text not null default 'legacy',
  add column if not exists mode text check(mode is null or mode in ('single','multiview')),
  add column if not exists idempotency_key uuid,
  add column if not exists input_manifest jsonb,
  add column if not exists model_revision text,
  add column if not exists resolution integer check(resolution is null or resolution in (1024,1536)),
  add column if not exists dispatch_id text,
  add column if not exists dispatched_at timestamptz,
  add column if not exists error_code text,
  add column if not exists reserved_cost_usd numeric(10,4) not null default 0,
  add column if not exists actual_cost_usd numeric(10,4),
  add column if not exists estimated_cost_usd numeric(10,4),
  add column if not exists gpu_type text,
  add column if not exists gpu_runtime_ms integer,
  add column if not exists model_asset_id uuid references public.product_model_assets(id);
alter table public.product_model_assets add column if not exists preview_path text;
update storage.buckets set allowed_mime_types=array['model/gltf-binary','application/octet-stream','image/png','application/json']
  where id='product-models';
drop policy if exists product_models_storage_read on storage.objects;
create policy product_models_storage_read on storage.objects for select to anon,authenticated using(
  bucket_id='product-models' and (
    public.has_role('admin') or exists(
      select 1 from public.product_model_assets a join public.products p on p.id=a.product_id
      where (a.storage_path=name or a.preview_path=name) and (
        (a.status='published' and p.status='active') or public.can_manage_product(a.product_id)
      )
    )
  )
);

create unique index if not exists model_jobs_seller_idempotency_idx
  on public.model_jobs(seller_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists one_active_pixal3d_job_per_product
  on public.model_jobs(product_id) where engine='pixal3d' and status in
  ('queued','dispatched','validating','preprocessing','running','exporting','validating_output');

create table if not exists public.model_compute_limits (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  daily_limit_usd numeric(10,2) not null check(daily_limit_usd >= 0),
  monthly_limit_usd numeric(10,2) not null check(monthly_limit_usd >= 0),
  per_job_reservation_usd numeric(10,4) not null check(per_job_reservation_usd > 0),
  updated_at timestamptz not null default now()
);
insert into public.model_compute_limits(singleton,enabled,daily_limit_usd,monthly_limit_usd,per_job_reservation_usd)
values(true,false,1.00,25.00,1.00) on conflict(singleton) do nothing;

create table if not exists public.model_budget_ledger (
  job_id uuid primary key references public.model_jobs(id) on delete cascade,
  reserved_usd numeric(10,4) not null check(reserved_usd >= 0),
  actual_usd numeric(10,4),
  estimated_usd numeric(10,4),
  status text not null check(status in ('reserved','finalized','released')),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);
alter table public.model_compute_limits enable row level security;
alter table public.model_budget_ledger enable row level security;
create policy model_compute_limits_admin_read on public.model_compute_limits
  for select to authenticated using(public.has_role('admin'));
create policy model_budget_ledger_admin_read on public.model_budget_ledger
  for select to authenticated using(public.has_role('admin'));
grant select on public.model_compute_limits, public.model_budget_ledger to authenticated;

-- Only CPU dispatchers can consume this transactional outbox. A committed
-- 'spawning' record is never retried automatically: spawn may already have run.
create table public.model_dispatch_outbox (
  job_id uuid primary key references public.model_jobs(id),
  token uuid not null default gen_random_uuid(),
  state text not null default 'pending' check(state in ('pending','spawning','running','settled')),
  call_id text,
  result jsonb,
  result_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.model_dispatch_outbox enable row level security;
revoke all on public.model_dispatch_outbox from anon,authenticated;
grant all on public.model_dispatch_outbox to service_role;

alter table public.model_compute_limits
  add column provider_cap_reviewed boolean not null default false,
  add column gpu_usd_per_second numeric(12,8),
  add column billing_review_note text,
  add constraint reviewed_compute_required check(not enabled or (
    provider_cap_reviewed and gpu_usd_per_second is not null and gpu_usd_per_second > 0 and billing_review_note is not null
  ));

create table if not exists public.model_webhook_nonces (
  nonce uuid primary key,
  received_at timestamptz not null default now()
);
alter table public.model_webhook_nonces enable row level security;

drop policy if exists model_jobs_owner_insert on public.model_jobs;
revoke insert on public.model_jobs from authenticated;

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
  -- Serialize source snapshots and retries for this product.
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
  if p_mode='multiview' and (v_source_count < 2 or exists(
    select 1 from public.product_source_assets where product_id=p_product_id
      and (camera_direction not in ('FRONT','RIGHT','BACK','LEFT') or camera_azimuth is null)
  )) then raise exception 'multi-view requires 2-4 calibrated cardinal views'; end if;

  if exists(select 1 from public.model_jobs where product_id=p_product_id and engine='pixal3d'
    and status in ('queued','dispatched','validating','preprocessing','running','exporting','validating_output')) then
    raise exception 'an active Pixal3D job already exists' using errcode='23505';
  end if;

  select * into v_limit from public.model_compute_limits where singleton=true for update;
  if not found or not v_limit.enabled then raise exception 'GPU budget is disabled (fail-closed)' using errcode='P0001'; end if;
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

  insert into public.model_jobs(product_id,seller_id,status,engine,provider,mode,attempt,idempotency_key,
    input_manifest,model_revision,resolution,reserved_cost_usd,current_step,progress)
  values(p_product_id,v_owner,'queued','pixal3d','modal',p_mode,v_attempt,p_idempotency_key,
    v_manifest,'f7cf38429b0bd264f1995f0f8743a88b1c728b94',p_resolution,
    v_limit.per_job_reservation_usd,'queued',0) returning id into v_job;
  insert into public.model_budget_ledger(job_id,reserved_usd,status)
    values(v_job,v_limit.per_job_reservation_usd,'reserved');
  insert into public.model_dispatch_outbox(job_id) values(v_job);
  update public.products set status='draft',model_status='queued',model_error=null,model_report=null,
    model_url=null,model_version=null,ar_url=null where id=p_product_id;
  return jsonb_build_object('id',v_job,'idempotent',false);
end $$;
revoke all on function public.enqueue_pixal3d_job(uuid,text,uuid,integer) from public;
grant execute on function public.enqueue_pixal3d_job(uuid,text,uuid,integer) to authenticated;

-- Functions mark_pixal3d_dispatched and claim_pixal3d_job are defined below with transactional outbox token validation.


create or replace function public.heartbeat_pixal3d_job(p_job_id uuid,p_worker_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.model_jobs set heartbeat_at=now() where id=p_job_id and worker_id=p_worker_id
    and status in ('validating','preprocessing','running','exporting','validating_output');
  return found;
end $$;

create or replace function public.advance_pixal3d_job(
  p_job_id uuid,p_worker_id text,p_status text,p_step text,p_progress smallint
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_old text;
begin
  select status into v_old from public.model_jobs where id=p_job_id and worker_id=p_worker_id for update;
  if v_old is null then raise exception 'job is not owned by this worker'; end if;
  if not ((v_old='validating' and p_status='preprocessing') or
    (v_old='preprocessing' and p_status='running') or
    (v_old='running' and p_status='exporting') or
    (v_old='exporting' and p_status='validating_output')) then
    raise exception 'invalid job transition % -> %',v_old,p_status;
  end if;
  update public.model_jobs set status=p_status,current_step=p_step,progress=p_progress,heartbeat_at=now()
    where id=p_job_id;
  return true;
end $$;
-- Function fail_pixal3d_dispatch is defined below with reservation retention for ambiguous failures.


create or replace function public.consume_model_webhook_nonce(p_nonce uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  delete from public.model_webhook_nonces where received_at < now()-interval '1 day';
  insert into public.model_webhook_nonces(nonce) values(p_nonce);
  return true;
exception when unique_violation then return false;
end $$;

create or replace function public.complete_pixal3d_job(
  p_job_id uuid,p_worker_id text,p_storage_path text,p_preview_path text,p_file_size integer,
  p_quality_report jsonb,p_gpu_type text,p_gpu_runtime_ms integer,p_total_runtime_ms integer,
  p_actual_cost_usd numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.model_jobs%rowtype; v_asset uuid;
begin
  select * into v_job from public.model_jobs where id=p_job_id for update;
  if v_job.worker_id is distinct from p_worker_id then raise exception 'worker mismatch'; end if;
  if v_job.status='needs_review' then return jsonb_build_object('ok',true,'idempotent',true,'assetId',v_job.model_asset_id); end if;
  if v_job.engine<>'pixal3d' or v_job.worker_id is distinct from p_worker_id or v_job.status<>'validating_output' then
    raise exception 'job is not ready for completion';
  end if;
  if p_quality_report->>'engine' is distinct from 'pixal3d'
    or p_quality_report->>'engineCommit' is distinct from v_job.model_revision
    or p_quality_report->>'glbValid' is distinct from 'true'
    or p_quality_report->>'reportVersion' is distinct from '4'
    or p_quality_report->>'checkpointRevision' is distinct from 'b0cb2e1b794cab9aa0ac38a95d794a4d9337437f'
    then raise exception 'invalid Pixal3D evidence report'; end if;
  if p_storage_path is distinct from v_job.seller_id::text||'/'||v_job.product_id::text||'/'||p_job_id::text||'/pixal3d.glb'
    or p_file_size <= 0 or p_gpu_runtime_ms < 0 or p_total_runtime_ms < p_gpu_runtime_ms
    or p_actual_cost_usd < 0 then raise exception 'invalid artifact or runtime'; end if;
  if p_preview_path is not null and p_preview_path is distinct from
    v_job.seller_id::text||'/'||v_job.product_id::text||'/'||p_job_id::text||'/preview.png' then
    raise exception 'invalid preview path';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='product-models' and name=p_storage_path
    and (metadata->>'size')::bigint=p_file_size) then raise exception 'artifact unavailable'; end if;
  v_asset:=gen_random_uuid();
  insert into public.product_model_assets(id,product_id,storage_path,preview_path,original_filename,file_size,origin,status,
    settings,uploaded_by,quality_report,review_state)
  values(v_asset,v_job.product_id,p_storage_path,p_preview_path,'pixal3d-'||p_job_id::text||'.glb',p_file_size,'generated',
    'pending_review',jsonb_build_object('scale',1,'orientation',jsonb_build_array(0,0,0),'arEnabled',false,
      'previewPath',p_preview_path),v_job.seller_id,p_quality_report,'NEEDS_REVIEW');
  update public.model_jobs set status='needs_review',current_step='needs_review',progress=100,finished_at=now(),
    generation_ms=p_total_runtime_ms,gpu_runtime_ms=p_gpu_runtime_ms,gpu_type=p_gpu_type,
    estimated_cost_usd=p_actual_cost_usd,model_asset_id=v_asset,error=null,error_code=null where id=p_job_id;
  update public.products set model_status='review',model_report=p_quality_report,model_error=null,
    model_version=v_asset,model_url=null,ar_url=null where id=v_job.product_id;
  -- Keep the conservative reservation until provider billing has been reconciled.
  update public.model_budget_ledger set estimated_usd=p_actual_cost_usd
    where job_id=p_job_id;
  return jsonb_build_object('ok',true,'idempotent',false,'assetId',v_asset);
end $$;

create or replace function public.fail_pixal3d_job(
  p_job_id uuid,p_worker_id text,p_error_code text,p_error text,p_gpu_runtime_ms integer,p_actual_cost_usd numeric
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_product uuid;
begin
  update public.model_jobs set status='failed',current_step='failed',finished_at=now(),error_code=p_error_code,
    error=p_error,gpu_runtime_ms=p_gpu_runtime_ms,estimated_cost_usd=p_actual_cost_usd
    where id=p_job_id and engine='pixal3d' and worker_id=p_worker_id
      and status in ('validating','preprocessing','running','exporting','validating_output') returning product_id into v_product;
  if v_product is null then return false; end if;
  update public.products set model_status='failed',model_error=p_error where id=v_product;
  update public.model_budget_ledger set estimated_usd=p_actual_cost_usd where job_id=p_job_id;
  return true;
end $$;
-- Function reap_stale_pixal3d_jobs is defined below. It never releases an
-- ambiguous dispatch lease because Modal may have accepted the GPU call.


-- The local legacy worker may finish old rows, but can never claim a Pixal3D job.
create or replace function public.claim_model_job(p_worker_id text default 'worker-default')
returns setof public.model_jobs language plpgsql security definer set search_path='' as $$
begin
  return query update public.model_jobs set status='processing',current_step='preprocessing',worker_id=p_worker_id,
    heartbeat_at=now(),started_at=now(),error=null where id=(
      select q.id from public.model_jobs q where q.status='queued' and q.engine<>'pixal3d'
      order by q.created_at for update skip locked limit 1
    ) returning *;
end $$;


-- Generated Pixal3D assets can be published only after structural validation and
-- the existing explicit admin action. Visual fidelity remains a human decision.
create or replace function public.enforce_model_quality_review() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.status='published' and old.status is distinct from new.status then
    if new.origin='generated' and (new.quality_report is null
      or new.quality_report->>'reportVersion' is distinct from '4'
      or new.quality_report->>'engine' is distinct from 'pixal3d'
      or new.quality_report->>'glbValid' is distinct from 'true'
      or new.quality_report->>'publicationBlocked' is distinct from 'false') then
      raise exception 'Generated Pixal3D model lacks validated inference evidence.';
    end if;
    new.review_state:='PUBLISHED';
  elsif new.status='rejected' then new.review_state:='REJECTED';
  elsif new.status in ('pending_review','archived') then new.review_state:='NEEDS_REVIEW';
  end if;
  return new;
end $$;

-- Replace BOTH legacy overloads; the original zero-argument overload survives
-- CREATE OR REPLACE of the text signature.
create or replace function public.claim_model_job()
returns setof public.model_jobs language sql security definer set search_path='' as $$
  select * from public.claim_model_job('worker-default'::text);
$$;

create or replace function public.begin_pixal3d_dispatch(p_job_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_out public.model_dispatch_outbox%rowtype; v_limits public.model_compute_limits%rowtype;
begin
  select * into v_limits from public.model_compute_limits where singleton for update;
  if not v_limits.enabled or not v_limits.provider_cap_reviewed or v_limits.gpu_usd_per_second is null then return null; end if;
  -- Serialize globally across dispatchers, restarts and deployments.
  if exists(select 1 from public.model_dispatch_outbox where state in ('spawning','running')) then return null; end if;
  select o.* into v_out from public.model_dispatch_outbox o join public.model_jobs j on j.id=o.job_id
    where o.state='pending' and j.status='queued' and (p_job_id is null or o.job_id=p_job_id)
    order by o.created_at for update of o skip locked limit 1;
  if not found then return null; end if;
  update public.model_dispatch_outbox set state='spawning',updated_at=now() where job_id=v_out.job_id;
  return jsonb_build_object('jobId',v_out.job_id,'token',v_out.token);
end $$;

create or replace function public.mark_pixal3d_dispatched(p_job_id uuid,p_dispatch_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.model_dispatch_outbox set call_id=p_dispatch_id,updated_at=now()
    where job_id=p_job_id and state in ('spawning','running') and (call_id is null or call_id=p_dispatch_id);
  if not found then return false; end if;
  update public.model_jobs set dispatch_id=p_dispatch_id,dispatched_at=coalesce(dispatched_at,now()),
    status=case when status='queued' then 'dispatched' else status end where id=p_job_id;
  return true;
end $$;

create or replace function public.claim_pixal3d_job(p_job_id uuid,p_worker_id text)
returns setof public.model_jobs language plpgsql security definer set search_path='' as $$
begin
  -- One-use token checked before any weight download/model load, including
  -- platform re-execution after preemption. Never reclaim 'running'.
  update public.model_dispatch_outbox set state='running',updated_at=now()
    where job_id=p_job_id and token::text=p_worker_id and state='spawning';
  if not found then return; end if;
  return query update public.model_jobs set status='validating',current_step='validating',progress=5,
    worker_id=p_worker_id,heartbeat_at=now(),started_at=now()
    where id=p_job_id and engine='pixal3d' and status in ('queued','dispatched') returning *;
  update public.products set model_status='processing' where id=(select product_id from public.model_jobs where id=p_job_id);
end $$;

create or replace function public.record_pixal3d_result(p_job_id uuid,p_worker_id text,p_payload jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_payload->>'jobId' is distinct from p_job_id::text or p_payload->>'workerId' is distinct from p_worker_id
    or p_payload->>'outcome' not in ('completed','failed') then raise exception 'invalid result'; end if;
  update public.model_dispatch_outbox set result=p_payload,updated_at=now()
    where job_id=p_job_id and token::text=p_worker_id and state='running' and result is null;
  return found;
end $$;

create or replace function public.apply_pixal3d_result(p_job_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_payload jsonb;
begin
  select result into v_payload from public.model_dispatch_outbox
    where job_id=p_job_id and not result_applied for update;
  if v_payload is null then return false; end if;
  if v_payload->>'outcome'='completed' then
    perform public.complete_pixal3d_job(p_job_id,v_payload->>'workerId',v_payload->>'storagePath',
      v_payload->>'previewPath',(v_payload->>'fileSize')::integer,v_payload->'qualityReport',
      v_payload->>'gpuType',(v_payload->>'gpuRuntimeMs')::integer,(v_payload->>'totalRuntimeMs')::integer,
      (v_payload->>'actualCostUsd')::numeric);
  else
    perform public.fail_pixal3d_job(p_job_id,v_payload->>'workerId',v_payload->>'errorCode',v_payload->>'error',
      (v_payload->>'gpuRuntimeMs')::integer,(v_payload->>'actualCostUsd')::numeric);
  end if;
  update public.model_dispatch_outbox set result_applied=true,updated_at=now() where job_id=p_job_id;
  return true;
end $$;

-- Heartbeat expiry is evidence of uncertainty, not proof the GPU stopped.
create or replace function public.reap_stale_pixal3d_jobs(p_timeout_minutes integer default 20)
returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  -- Never clear state='spawning' automatically. A missing call_id can mean the
  -- Modal spawn succeeded but its response was lost; releasing it could launch
  -- a second GPU container for the same job.
  update public.model_jobs set error_code='HEARTBEAT_EXPIRED',error='Worker requires reconciliation; reservation retained.'
    where engine='pixal3d' and status in ('validating','preprocessing','running','exporting','validating_output')
    and heartbeat_at < now()-make_interval(mins=>greatest(p_timeout_minutes,5));
  get diagnostics v_count=row_count;
  return v_count;
end $$;

-- Manual, service-role-only escape hatch for an ambiguous spawn with no call ID.
-- The row lock serializes against claim_pixal3d_job. Once quarantined, any late
-- worker fails its one-use token before downloading weights or using the GPU.
-- The budget reservation is intentionally retained for billing reconciliation.
create or replace function public.quarantine_pixal3d_spawn(p_job_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_product uuid;
begin
  select j.product_id into v_product
    from public.model_dispatch_outbox o
    join public.model_jobs j on j.id=o.job_id
    where o.job_id=p_job_id and o.state='spawning' and o.call_id is null
      and j.status in ('queued','dispatched')
    for update of o;
  if not found then return false; end if;
  update public.model_dispatch_outbox set state='settled',updated_at=now() where job_id=p_job_id;
  update public.model_jobs set status='failed',current_step='failed',finished_at=now(),
    error_code='AMBIGUOUS_SPAWN_QUARANTINED',
    error=left(coalesce(nullif(p_reason,''),'Operator quarantined ambiguous Modal spawn.'),1000)
    where id=p_job_id and engine='pixal3d' and status in ('queued','dispatched');
  update public.products set model_status='failed',
    model_error='Ambiguous GPU dispatch quarantined; administrator review required.'
    where id=v_product;
  return true;
end $$;

-- This function is used ONLY after Modal reports that the recorded call ended.
create or replace function public.settle_pixal3d_call(p_job_id uuid,p_call_id text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_out public.model_dispatch_outbox%rowtype;
begin
  select * into v_out from public.model_dispatch_outbox where job_id=p_job_id and call_id=p_call_id for update;
  if not found then return false; end if;
  if v_out.result is not null then perform public.apply_pixal3d_result(p_job_id);
  else
    update public.model_jobs set status='failed',current_step='failed',finished_at=now(),
      error_code='MODAL_CALL_ENDED',error='Modal call ended without a durable result; private artifacts retained.'
      where id=p_job_id and status in ('queued','dispatched','validating','preprocessing','running','exporting','validating_output');
    if found then update public.products set model_status='failed',model_error='GPU call ended; administrator review required.'
      where id=(select product_id from public.model_jobs where id=p_job_id); end if;
  end if;
  update public.model_dispatch_outbox set state='settled',updated_at=now() where job_id=p_job_id;
  return true;
end $$;

-- No caller may release a reservation after a potentially successful spawn.
create or replace function public.fail_pixal3d_dispatch(p_job_id uuid,p_error_code text,p_error text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.model_jobs set error_code=p_error_code,error=left(p_error,1000)
    where id=p_job_id and engine='pixal3d' and status in ('queued','dispatched');
  return found;
end $$;

revoke all on function public.mark_pixal3d_dispatched(uuid,text) from public,anon,authenticated;
revoke all on function public.claim_pixal3d_job(uuid,text) from public,anon,authenticated;
revoke all on function public.heartbeat_pixal3d_job(uuid,text) from public,anon,authenticated;
revoke all on function public.advance_pixal3d_job(uuid,text,text,text,smallint) from public,anon,authenticated;
revoke all on function public.fail_pixal3d_dispatch(uuid,text,text) from public,anon,authenticated;
revoke all on function public.consume_model_webhook_nonce(uuid) from public,anon,authenticated;
revoke all on function public.complete_pixal3d_job(uuid,text,text,text,integer,jsonb,text,integer,integer,numeric) from public,anon,authenticated;
revoke all on function public.fail_pixal3d_job(uuid,text,text,text,integer,numeric) from public,anon,authenticated;
revoke all on function public.reap_stale_pixal3d_jobs(integer) from public,anon,authenticated;
revoke all on function public.quarantine_pixal3d_spawn(uuid,text) from public,anon,authenticated;
revoke all on function public.begin_pixal3d_dispatch(uuid) from public,anon,authenticated;
revoke all on function public.record_pixal3d_result(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.apply_pixal3d_result(uuid) from public,anon,authenticated;
revoke all on function public.settle_pixal3d_call(uuid,text) from public,anon,authenticated;

grant execute on function public.mark_pixal3d_dispatched(uuid,text) to service_role;
grant execute on function public.claim_pixal3d_job(uuid,text) to service_role;
grant execute on function public.heartbeat_pixal3d_job(uuid,text) to service_role;
grant execute on function public.advance_pixal3d_job(uuid,text,text,text,smallint) to service_role;
grant execute on function public.fail_pixal3d_dispatch(uuid,text,text) to service_role;
grant execute on function public.consume_model_webhook_nonce(uuid) to service_role;
grant execute on function public.complete_pixal3d_job(uuid,text,text,text,integer,jsonb,text,integer,integer,numeric) to service_role;
grant execute on function public.fail_pixal3d_job(uuid,text,text,text,integer,numeric) to service_role;
grant execute on function public.reap_stale_pixal3d_jobs(integer) to service_role;
grant execute on function public.quarantine_pixal3d_spawn(uuid,text) to service_role;
grant execute on function public.begin_pixal3d_dispatch(uuid) to service_role;
grant execute on function public.record_pixal3d_result(uuid,text,jsonb) to service_role;
grant execute on function public.apply_pixal3d_result(uuid) to service_role;
grant execute on function public.settle_pixal3d_call(uuid,text) to service_role;

notify pgrst,'reload schema';
commit;

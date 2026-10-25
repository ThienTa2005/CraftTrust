-- Read-only checks. Run in the Supabase SQL Editor of the SAME project as the live web app.
-- All rows should have ready = true. This does not claim, retry, or change any job.
-- One result set: SQL Editor must show RPC and column checks alongside bucket checks.
select 'table:' || name as check_name,
       to_regclass('public.' || name) is not null as ready
from unnest(array['products', 'artisans', 'product_source_assets',
                  'product_model_assets', 'model_jobs', 'passport_records']) as name

union all
select 'rpc:' || signature as check_name,
       to_regprocedure(signature) is not null as ready
from unnest(array[
  'public.claim_model_job(text)',
  'public.heartbeat_model_job(uuid,text,text,smallint)',
  'public.reap_stale_model_jobs(integer)'
]) as signature

union all
select 'rpc_execute:service_role:' || signature as check_name,
       coalesce(has_function_privilege('service_role', to_regprocedure(signature), 'EXECUTE'), false) as ready
from unnest(array[
  'public.claim_model_job(text)',
  'public.heartbeat_model_job(uuid,text,text,smallint)',
  'public.reap_stale_model_jobs(integer)'
]) as signature

union all
select 'column:model_jobs.' || name as check_name,
       exists(select 1 from information_schema.columns c
              where c.table_schema = 'public' and c.table_name = 'model_jobs'
                and c.column_name = name) as ready
from unnest(array['engine', 'worker_id', 'heartbeat_at', 'current_step', 'progress']) as name

union all
select 'bucket:' || name as check_name,
       exists(select 1 from storage.buckets b where b.id = name) as ready
from unnest(array['product-source', 'product-assets', 'product-models']) as name
order by check_name;

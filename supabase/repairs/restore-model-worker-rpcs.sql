-- Run in the Supabase SQL Editor as postgres, on the same project as the live web and worker.
-- Restores the worker section of migration 202610250004 only; no demo seed data.
-- Requires the existing products and model_jobs tables from the 3D pipeline migration.
-- Safe to rerun with the repository's function signatures. Does not invoke the RPCs or reset jobs.
-- The active worker can start claiming queued jobs once this transaction commits.
BEGIN;

-- 1. Hardening model_jobs for robust asynchronous execution, heartbeat, and step progression
ALTER TABLE public.model_jobs
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS current_step text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS progress smallint NOT NULL DEFAULT 0;

-- Function to claim the next job with worker identifier and initial heartbeat
CREATE OR REPLACE FUNCTION public.claim_model_job(p_worker_id text DEFAULT 'worker-default')
RETURNS SETOF public.model_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.model_jobs
  SET status = 'processing',
      current_step = 'preprocessing',
      worker_id = p_worker_id,
      heartbeat_at = now(),
      started_at = now(),
      error = null
  WHERE id = (
    SELECT queued.id
    FROM public.model_jobs AS queued
    WHERE queued.status = 'queued'
    ORDER BY queued.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$;

-- Function for worker heartbeat and step tracking
CREATE OR REPLACE FUNCTION public.heartbeat_model_job(
  p_job_id uuid,
  p_worker_id text,
  p_step text,
  p_progress smallint DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.model_jobs
  SET heartbeat_at = now(),
      worker_id = p_worker_id,
      current_step = p_step,
      progress = p_progress
  WHERE id = p_job_id;
  RETURN FOUND;
END;
$$;

-- Function to reap stale / abandoned jobs (timeout detection)
CREATE OR REPLACE FUNCTION public.reap_stale_model_jobs(p_timeout_minutes integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH timed_out AS (
    UPDATE public.model_jobs
    SET status = 'failed',
        finished_at = now(),
        error = 'Xử lý vượt quá giới hạn thời gian (Worker timeout hoặc mất kết nối sau ' || p_timeout_minutes || ' phút)'
    WHERE status = 'processing'
      AND (heartbeat_at < now() - (p_timeout_minutes || ' minutes')::interval)
    RETURNING product_id
  )
  UPDATE public.products p
  SET model_status = 'failed',
      model_error = 'Quá thời gian xử lý dựng mô hình 3D. Vui lòng bấm Thử tạo lại.'
  FROM timed_out t
  WHERE p.id = t.product_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_model_job(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_model_job(text) TO service_role;

REVOKE ALL ON FUNCTION public.heartbeat_model_job(uuid, text, text, smallint) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_model_job(uuid, text, text, smallint) TO service_role;

REVOKE ALL ON FUNCTION public.reap_stale_model_jobs(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_stale_model_jobs(integer) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- These checks do not claim a job. All three rows should report ready = true.
SELECT signature AS check_name,
       to_regprocedure(signature) IS NOT NULL AS ready,
       coalesce(has_function_privilege('service_role', to_regprocedure(signature), 'EXECUTE'), false) AS worker_can_execute
FROM unnest(ARRAY[
  'public.claim_model_job(text)',
  'public.heartbeat_model_job(uuid,text,text,smallint)',
  'public.reap_stale_model_jobs(integer)'
]) AS signature;

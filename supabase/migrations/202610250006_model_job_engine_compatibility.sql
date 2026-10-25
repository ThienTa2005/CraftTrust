-- The retry endpoint used to omit engine and inherit the legacy ceramic-cpu default.
-- New jobs should use the same auto selection as the seller's initial upload.
-- Preserve failed/completed records; retries create a new job through the seller API.
begin;

alter table public.model_jobs alter column engine set default 'auto';

-- Preserve the meaning of existing queued CPU jobs with the current CLI name.
update public.model_jobs
set engine = 'ceramic'
where status = 'queued' and engine = 'ceramic-cpu';

notify pgrst, 'reload schema';
commit;

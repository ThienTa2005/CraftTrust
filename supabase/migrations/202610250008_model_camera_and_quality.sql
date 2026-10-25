-- Apply through the normal reviewed deployment process. No production data rewrite.
begin;
alter table public.product_source_assets
 add column camera_direction text check(camera_direction in ('FRONT','BACK','LEFT','RIGHT','TOP','BOTTOM','CUSTOM')),
 add column camera_azimuth double precision check(camera_azimuth >= 0 and camera_azimuth < 360);
-- Existing rows deliberately remain unlabelled: upload order does not prove pose.
alter table public.product_source_assets add constraint source_custom_angle_required
 check(camera_direction is distinct from 'CUSTOM' or camera_azimuth is not null);
alter table public.product_model_assets
 add column quality_report jsonb,
 add column review_state text not null default 'NEEDS_REVIEW'
 check(review_state in ('GENERATING','GENERATED','QUALITY_CHECKING','NEEDS_REVIEW','APPROVED','REJECTED','PUBLISHED','FAILED'));

create function public.enforce_model_quality_review() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.status='published' and old.status is distinct from new.status then
  if new.origin='generated' and (new.quality_report is null
    or new.quality_report->>'reportVersion' is distinct from '3'
    or new.quality_report->>'publicationBlocked' is distinct from 'false') then
   raise exception 'Generated model is not validated for publication. Review the limitations and upload a corrected GLB.';
  end if;
  new.review_state := 'PUBLISHED';
 elsif new.status='rejected' then new.review_state := 'REJECTED';
 elsif new.status in ('pending_review','archived') then new.review_state := 'NEEDS_REVIEW';
 end if;
 return new;
end $$;
create trigger enforce_model_quality_review before update on public.product_model_assets
 for each row execute function public.enforce_model_quality_review();
notify pgrst,'reload schema';
commit;

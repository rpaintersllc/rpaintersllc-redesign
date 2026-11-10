begin;
set local lock_timeout='2s';
alter table public.platform_project_reviews
 add column qualification_checks jsonb,
 add column disposition_reason text check(disposition_reason in ('no_response','outside_coverage','service_not_offered','timing','budget','not_authorized','duplicate','invalid_contact','customer_cancelled','other')),
 add constraint qualification_checks_shape check(qualification_checks is null or (jsonb_typeof(qualification_checks)='object' and qualification_checks <@ '{"two_way":true,"authority":true,"scope":true,"coverage":true,"timing":true}'::jsonb and qualification_checks @> '{"two_way":true,"authority":true,"scope":true,"coverage":true,"timing":true}'::jsonb));
-- NULL preserves historical team assessments. New qualified reviews require all checks.
-- No claim of independent identity/phone verification is introduced.
create table public.platform_review_history (
 id bigint generated always as identity primary key,
 project_id uuid not null references public.platform_projects(id),
 business_id uuid not null references public.platform_businesses(id),
 actor uuid not null references auth.users(id),
 revision integer not null,
 qualification text not null,
 qualification_checks jsonb,
 disposition_reason text,
 notes text not null,
 created_at timestamptz not null default now(),
 unique(project_id,revision)
);
alter table public.platform_review_history enable row level security;
revoke all on public.platform_review_history from public,anon,authenticated;
grant select,insert on public.platform_review_history to service_role;
grant usage,select on sequence public.platform_review_history_id_seq to service_role;
create function public.platform_save_qualification(project uuid,business uuid,actor uuid,expected_revision integer,qualification_value text,note_value text,checks_value jsonb,reason_value text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r jsonb; saved public.platform_project_reviews;
begin
 if expected_revision is null or expected_revision<0 or expected_revision>=2147483647 then return jsonb_build_object('error','invalid');end if;
 if checks_value is not null and checks_value<>'{"two_way":true,"authority":true,"scope":true,"coverage":true,"timing":true}'::jsonb then return jsonb_build_object('error','invalid');end if;
 if qualification_value='qualified' and checks_value is null then return jsonb_build_object('error','invalid');end if;
 if qualification_value='not_fit' and (reason_value is null or reason_value not in ('no_response','outside_coverage','service_not_offered','timing','budget','not_authorized','duplicate','invalid_contact','customer_cancelled','other')) then return jsonb_build_object('error','invalid');end if;
 if qualification_value<>'not_fit' and reason_value is not null then return jsonb_build_object('error','invalid');end if;
 if qualification_value<>'qualified' and checks_value is not null then return jsonb_build_object('error','invalid');end if;
 if qualification_value='not_fit' and reason_value='other' and coalesce(length(trim(note_value)),0)=0 then return jsonb_build_object('error','invalid');end if;
 r:=public.platform_save_review(project,business,actor,expected_revision,qualification_value,note_value);
 if r ? 'error' then return r;end if;
 update public.platform_project_reviews set qualification_checks=checks_value,disposition_reason=reason_value where project_id=project and business_id=business returning * into saved;
 insert into public.platform_review_history(project_id,business_id,actor,revision,qualification,qualification_checks,disposition_reason,notes)
 values(project,business,actor,saved.revision,saved.qualification,saved.qualification_checks,saved.disposition_reason,saved.notes);
 return r||jsonb_build_object('qualification_checks',saved.qualification_checks,'disposition_reason',saved.disposition_reason);
end $$;
revoke all on function public.platform_save_qualification(uuid,uuid,uuid,integer,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.platform_save_qualification(uuid,uuid,uuid,integer,text,text,jsonb,text) to service_role;
commit;

begin;
alter table public.platform_businesses add column accepting_requests boolean not null default true;
create table public.platform_project_reviews (
 project_id uuid primary key references public.platform_projects(id),
 business_id uuid not null references public.platform_businesses(id),
 qualification text not null check(qualification in ('unreviewed','qualified','not_fit')),
 notes text not null default '' check(length(notes)<=4000),
 revision integer not null check(revision>0),
 updated_at timestamptz not null default now(),updated_by uuid not null references auth.users(id)
);
create index platform_project_reviews_business on public.platform_project_reviews(business_id);
alter table public.platform_project_reviews enable row level security;
revoke all on public.platform_project_reviews from public,anon,authenticated;
grant all on public.platform_project_reviews to service_role;

create function public.platform_save_review(project uuid,business uuid,actor uuid,expected_revision integer,qualification_value text,note_value text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous public.platform_project_reviews; saved public.platform_project_reviews;
begin
 if not exists(select 1 from public.platform_business_members where business_id=business and user_id=actor) then return jsonb_build_object('error','forbidden');end if;
 perform 1 from public.platform_projects where id=project and business_id=business for update;
 if not found then return jsonb_build_object('error','not_found');end if;
 if expected_revision is null or expected_revision<0 or qualification_value is null or qualification_value not in ('unreviewed','qualified','not_fit') or note_value is null or length(note_value)>4000 then return jsonb_build_object('error','invalid');end if;
 select * into previous from public.platform_project_reviews where project_id=project;
 if coalesce(previous.revision,0)<>expected_revision then return jsonb_build_object('error','conflict');end if;
 insert into public.platform_project_reviews(project_id,business_id,qualification,notes,revision,updated_by)
 values(project,business,qualification_value,note_value,expected_revision+1,actor)
 on conflict(project_id) do update set qualification=excluded.qualification,notes=excluded.notes,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now()
 returning * into saved;
 return jsonb_build_object('qualification',saved.qualification,'notes',saved.notes,'revision',saved.revision,'updated_at',saved.updated_at);
end $$;
revoke all on function public.platform_save_review(uuid,uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.platform_save_review(uuid,uuid,uuid,integer,text,text) to service_role;

create function public.platform_set_availability(business uuid,actor uuid,accepting boolean,expected_current boolean) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare b public.platform_businesses;
begin
 if not exists(select 1 from public.platform_business_members where business_id=business and user_id=actor and role='owner') then return jsonb_build_object('error','forbidden');end if;
 if accepting is null or expected_current is null then return jsonb_build_object('error','invalid');end if;
 -- Use the routing lock so an owner pause and new assignments have a clear order.
 perform pg_advisory_xact_lock(72642200);
 select * into b from public.platform_businesses where id=business for update;
 if not found then return jsonb_build_object('error','not_found');end if;
 if b.accepting_requests<>expected_current then return jsonb_build_object('error','conflict');end if;
 update public.platform_businesses set accepting_requests=accepting where id=business;
 return jsonb_build_object('accepting_requests',accepting);
end $$;
revoke all on function public.platform_set_availability(uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.platform_set_availability(uuid,uuid,boolean,boolean) to service_role;
create or replace function public.platform_create_project(payload jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare prior public.platform_projects;business public.platform_businesses;lead uuid;project uuid;
begin
 perform pg_advisory_xact_lock(72642200);
 select p.* into prior from public.platform_projects p join public.leads l on l.id=p.lead_id where l.request_key=(payload->>'request_key')::uuid;
 if found then
  if prior.access_hash<>payload->>'access_hash' then return jsonb_build_object('error','request_conflict');end if;
  return jsonb_build_object('id',prior.id,'duplicate',true);
 end if;
 if (select count(*) from public.platform_projects where created_at>now()-interval '24 hours')>=30
 or (select count(*) from public.platform_projects where created_at>now()-interval '1 hour' and ip_hash=payload->>'ip_hash')>=5
 or (select count(*) from public.leads where created_at>now()-interval '1 hour' and (email=payload->>'email' or phone=payload->>'phone'))>=2
 then return jsonb_build_object('error','rate_limited');end if;
 select * into business from public.platform_businesses b where b.active and b.accepting_requests and b.slug=payload->>'provider_slug'
 and b.state=payload->>'state' and left(payload->>'zip',length(b.zip_prefix))=b.zip_prefix
 and exists(select 1 from unnest(b.cities) as areas(city_name) where lower(city_name)=lower(payload->>'city'));
 if not found then return jsonb_build_object('error','outside_pilot_area');end if;
 insert into public.leads(request_key,full_name,email,phone,city,zip,service,details,consent_at,source,utm_source,utm_campaign)
 values((payload->>'request_key')::uuid,payload->>'full_name',payload->>'email',payload->>'phone',payload->>'city',payload->>'zip',payload->>'service',payload->>'details',now(),'platform',nullif(payload->>'utm_source',''),nullif(payload->>'utm_campaign','')) returning id into lead;
 insert into public.platform_projects(lead_id,business_id,access_hash,property_type,timing,budget,ip_hash)
 values(lead,business.id,payload->>'access_hash',payload->>'property_type',payload->>'timing',payload->>'budget',payload->>'ip_hash') returning id into project;
 insert into public.platform_events(project_id,status) values(project,'new');
 return jsonb_build_object('id',project,'duplicate',false);
end $$;
revoke all on function public.platform_create_project(jsonb) from public,anon,authenticated;
grant execute on function public.platform_create_project(jsonb) to service_role;

commit;

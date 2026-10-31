-- Additive change; old requests and clients retain NULL = no recorded preference.
-- Keep private table grants, the active-session gate, routing and notification behavior unchanged.
alter table public.platform_projects
 add column contact_method text constraint platform_projects_contact_method_check check (contact_method in ('phone','email','either')),
 add column contact_window text constraint platform_projects_contact_window_check check (contact_window in ('no_preference','weekday_morning','weekday_afternoon','weekday_evening'));
CREATE OR REPLACE FUNCTION public.platform_create_project(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare prior public.platform_projects;business public.platform_businesses;lead uuid;project uuid;
begin
 if (payload->>'contact_method' is not null and payload->>'contact_method' not in ('phone','email','either'))
 or (payload->>'contact_window' is not null and payload->>'contact_window' not in ('no_preference','weekday_morning','weekday_afternoon','weekday_evening'))
 then return jsonb_build_object('error','invalid_contact_preference');end if;
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
 insert into public.platform_projects(lead_id,business_id,access_hash,property_type,timing,budget,ip_hash,contact_method,contact_window)
 values(lead,business.id,payload->>'access_hash',payload->>'property_type',payload->>'timing',payload->>'budget',payload->>'ip_hash',payload->>'contact_method',payload->>'contact_window') returning id into project;
 insert into public.platform_events(project_id,status) values(project,'new');
 return jsonb_build_object('id',project,'duplicate',false);
end $function$;

revoke execute on function public.platform_create_project(jsonb) from public,anon,authenticated;
grant execute on function public.platform_create_project(jsonb) to service_role;

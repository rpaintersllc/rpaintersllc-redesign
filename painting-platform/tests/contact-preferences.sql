-- Authorized isolated-pilot operator only. Whole transaction, synthetic data only.
-- Review the migration/RPC and enqueue trigger before running. Never replace ROLLBACK.
begin;
set local statement_timeout='15s';
set local lock_timeout='2s';
do $$ begin
 if exists(select 1 from pg_trigger t where not t.tgisinternal and t.tgrelid in ('public.platform_businesses'::regclass,'public.platform_projects'::regclass,'public.leads'::regclass,'public.lead_notifications'::regclass,'public.platform_events'::regclass) and (t.tgrelid,t.tgname) not in (('public.leads'::regclass,'enqueue_lead_notification'),('public.leads'::regclass,'platform_lead_status_event'))) then raise exception 'Unexpected fixture triggers';end if;
 assert md5(regexp_replace((select prosrc from pg_proc where oid='public.enqueue_lead_notification()'::regprocedure),'[[:space:]]','','g'))='2820ba6299e3a9e11705b04671d22465','Unreviewed notification trigger';
 assert md5(regexp_replace((select prosrc from pg_proc where oid='public.platform_create_project(jsonb)'::regprocedure),'[[:space:]]','','g'))='8719476dfc1c9ebfedf31da56d88e892','Unreviewed preference RPC';
end $$;
set local role service_role;
do $$
declare
 marker text:='buzzie-contact-rollback-'||gen_random_uuid()::text;
 business uuid:=gen_random_uuid(); first_project uuid; last_project uuid; saved uuid;
 payload jsonb; first_payload jsonb; r jsonb; patch jsonb; method text; window_value text;
 passed integer:=0; rejected boolean;
begin
 assert (select count(*) from public.platform_projects where created_at>now()-interval '24 hours')<25,'No fixture headroom; do not change limits';
 insert into public.platform_businesses(id,slug,name,website,phone,active,state,cities,zip_prefix,accepting_requests)
 values(business,marker,'BUZZIE CONTACT ROLLBACK TEST','https://example.invalid','2025550160',true,'SC',array['Summerville'],'294',true);
 for i in 0..4 loop
  method:=case i when 0 then 'email' when 1 then 'phone' when 2 then 'either' when 3 then 'phone' else null end;
  window_value:=case i when 0 then 'weekday_morning' when 1 then 'weekday_afternoon' when 2 then 'weekday_evening' when 3 then 'no_preference' else null end;
  payload:=jsonb_build_object('request_key',gen_random_uuid(),'access_hash',repeat('a',64),'ip_hash',marker||i,'provider_slug',marker,'full_name','BUZZIE ROLLBACK ONLY','email',marker||i||'@example.invalid','phone','202555016'||i,'city','Summerville','state','SC','zip','29483','service','Interior painting','property_type','Home','timing','Just planning','details','Rollback-only contact preference fixture','contact_method',method,'contact_window',window_value);
  r:=public.platform_create_project(payload);assert r->>'id' is not null and not r ? 'error','Create denied';passed:=passed+1;
  saved:=(r->>'id')::uuid;
  assert exists(select 1 from public.platform_projects p where p.id=saved and p.contact_method is not distinct from method and p.contact_window is not distinct from window_value),'Preferences not persisted';passed:=passed+1;
  if i=0 then first_project:=saved;first_payload:=payload;end if;
  last_project:=saved;
 end loop;
 r:=public.platform_create_project(first_payload||jsonb_build_object('contact_method','phone','contact_window','weekday_evening'));
 assert (r->>'id')::uuid=first_project and (r->>'duplicate')::boolean,'Duplicate receipt changed';passed:=passed+1;
 assert exists(select 1 from public.platform_projects where id=first_project and contact_method='email' and contact_window='weekday_morning'),'Duplicate overwrote saved preference';passed:=passed+1;
 r:=public.platform_create_project(first_payload||jsonb_build_object('access_hash',repeat('b',64)));assert r->>'error'='request_conflict','Private key conflict bypassed';passed:=passed+1;
 for patch in select value from jsonb_array_elements('[{"contact_method":"sms"},{"contact_method":""},{"contact_method":1},{"contact_method":{}},{"contact_window":"night"},{"contact_window":""},{"contact_window":1},{"contact_window":[]}]'::jsonb) loop
  r:=public.platform_create_project(first_payload||jsonb_build_object('request_key',gen_random_uuid())||patch);assert r->>'error'='invalid_contact_preference','Invalid preference reached insertion';passed:=passed+1;
 end loop;
 foreach method in array array['phone','email','either'] loop
  foreach window_value in array array['no_preference','weekday_morning','weekday_afternoon','weekday_evening'] loop
   update public.platform_projects set contact_method=method,contact_window=window_value where id=first_project;
   assert found,'Valid preference table update failed';passed:=passed+1;
  end loop;
 end loop;
 rejected:=false;begin update public.platform_projects set contact_method='sms' where id=first_project;exception when check_violation then rejected:=true;end;assert rejected,'Method constraint missing';passed:=passed+1;
 rejected:=false;begin update public.platform_projects set contact_window='night' where id=first_project;exception when check_violation then rejected:=true;end;assert rejected,'Time constraint missing';passed:=passed+1;
 assert (select relrowsecurity from pg_class where oid='public.platform_projects'::regclass);passed:=passed+1;
 assert not has_function_privilege('anon','public.platform_create_project(jsonb)','execute');passed:=passed+1;
 assert not has_function_privilege('authenticated','public.platform_create_project(jsonb)','execute');passed:=passed+1;
 assert has_function_privilege('service_role','public.platform_create_project(jsonb)','execute');passed:=passed+1;
 assert not has_table_privilege('anon','public.platform_projects','select') and not has_table_privilege('authenticated','public.platform_projects','select');passed:=passed+1;
 assert passed=40,'Unexpected assertion coverage';
end $$;
reset role;
rollback;
select '40 contact preference assertions completed; transaction rolled back' as verification;

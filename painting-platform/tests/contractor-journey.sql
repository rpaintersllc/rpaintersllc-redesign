-- Operator-only acceptance journey. Run WHOLE file; never remove ROLLBACK.
-- Isolated BUZZIE pilot only. No HTTP intake, Auth API, Storage or dispatcher.
begin;
set local statement_timeout='10s';
set local lock_timeout='2s';
do $$
declare
 marker text := 'buzzie-journey-rollback-'||gen_random_uuid()::text;
 k1 uuid:=gen_random_uuid(); k2 uuid:=gen_random_uuid();
 h text:=repeat('d',64); b uuid; actor uuid; p1 uuid; p2 uuid; l1 uuid; l2 uuid;
 r jsonb; payload jsonb; visit uuid; events_before integer; allowed boolean;
 tomorrow date:=(now() at time zone 'America/New_York')::date+1;
begin
 -- Only the reviewed transactional lead outbox/status triggers are allowed.
 if exists(
  select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace join pg_proc f on f.oid=t.tgfoid
  join pg_namespace fn on fn.oid=f.pronamespace
  where not t.tgisinternal and n.nspname='public' and c.relname in
   ('leads','lead_notifications','platform_projects','platform_events','platform_project_reviews','platform_visits')
  and (c.relname,t.tgname,fn.nspname,f.proname) not in (
   ('leads','enqueue_lead_notification','public','enqueue_lead_notification'),
   ('leads','platform_lead_status_event','public','platform_lead_event')
  )
 ) then raise exception 'Unreviewed trigger: stop and inspect side effects'; end if;
 select id into b from public.platform_businesses where slug='r-painters-llc' and active and accepting_requests;
 if b is null then raise exception 'Pilot provider is not accepting requests; do not change its availability'; end if;
 select user_id into actor from public.platform_business_members where business_id=b and role='owner' limit 1;
 if actor is null then raise exception 'No existing pilot owner; do not create one'; end if;
 payload:=jsonb_build_object('request_key',k1,'access_hash',h,'ip_hash',marker,
  'provider_slug','r-painters-llc','full_name','ROLLBACK ONLY - acceptance journey',
  'email',marker||'-a@example.invalid','phone','2025550149','city','Summerville',
  'state','SC','zip','29483','service','Interior painting','details',marker,
  'property_type','Home','timing','Just planning','budget','Not a real estimate');
 -- 1: unsupported coverage rejects before persistence.
 r:=public.platform_create_project(payload||jsonb_build_object('request_key',gen_random_uuid(),'state','CA','zip','90210','city','Los Angeles'));
 if (r->>'error'='outside_pilot_area' and not exists(select 1 from public.leads where email=marker||'-a@example.invalid')) is distinct from true then raise exception 'Check 1: coverage rejection'; end if;
 -- 2: genuine stored assignment (inside this reverted transaction only).
 r:=public.platform_create_project(payload);p1:=(r->>'id')::uuid;
 select lead_id into l1 from public.platform_projects where id=p1;
 if (p1 is not null and (select business_id=b and access_hash=h from public.platform_projects where id=p1)) is distinct from true then raise exception 'Check 2: pilot assignment'; end if;
 -- 3: transactional outbox is pending and not yet visible to any worker.
 if ((select count(*)=1 from public.lead_notifications where lead_id=l1 and status='pending')) is distinct from true then raise exception 'Check 3: transactional outbox'; end if;
 -- 4/5: retries preserve the same project; wrong capability cannot take it over.
 r:=public.platform_create_project(payload);
 if (r->>'duplicate'='true' and (r->>'id')::uuid=p1 and (select count(*)=1 from public.leads where email=marker||'-a@example.invalid')) is distinct from true then raise exception 'Check 4: create retry'; end if;
 r:=public.platform_create_project(payload||jsonb_build_object('access_hash',repeat('e',64)));
 if (r->>'error'='request_conflict') is distinct from true then raise exception 'Check 5: retry capability'; end if;
 -- 6: a separate fixture project supports the lost path without overwriting the won path.
 r:=public.platform_create_project(payload||jsonb_build_object('request_key',k2,'email',marker||'-b@example.invalid','phone','2025550150'));
 p2:=(r->>'id')::uuid;select lead_id into l2 from public.platform_projects where id=p2;
 if (p2 is not null and p2<>p1 and (select business_id=b from public.platform_projects where id=p2)) is distinct from true then raise exception 'Check 6: independent project'; end if;
 -- 7/8: business scoping and status vocabulary deny invalid writes.
 if (not public.platform_set_status(p1,gen_random_uuid(),'won') and (select status='new' from public.leads where id=l1)) is distinct from true then raise exception 'Check 7: foreign status'; end if;
 if (not public.platform_set_status(p1,b,'paid') and (select status='new' from public.leads where id=l1)) is distinct from true then raise exception 'Check 8: invalid status'; end if;
 -- 9: contractor begins the normal pipeline.
 allowed:=public.platform_set_status(p1,b,'contacted');
 if (allowed and (select status='contacted' from public.leads where id=l1)) is distinct from true then raise exception 'Check 9: contacted'; end if;
 -- 10/11: qualified review persists; stale edits cannot overwrite it.
 r:=public.platform_save_review(p1,b,actor,0,'qualified','Rollback-only review; no customer note');
 if (r->>'revision'='1') is distinct from true then raise exception 'Check 10: qualification'; end if;
 r:=public.platform_save_review(p1,b,actor,0,'not_fit','Stale');
 if (r->>'error'='conflict' and (select qualification='qualified' from public.platform_project_reviews where project_id=p1)) is distinct from true then raise exception 'Check 11: review concurrency'; end if;
 -- 12/13: homeowner requests; assigned company confirms and pipeline advances.
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h,'action','visit-request','request_key',gen_random_uuid(),'preferred_date',tomorrow,'time_window','Flexible'));
 visit:=(r->>'id')::uuid;
 if (visit is not null and (select status='requested' from public.platform_visits where id=visit)) is distinct from true then raise exception 'Check 12: visit request'; end if;
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'business_id',b,'action','visit-update','visit_id',visit,'decision','confirmed'));
 if (r ? 'id' and (select status='visit_scheduled' from public.leads where id=l1)) is distinct from true then raise exception 'Check 13: visit confirmation'; end if;
 -- 14/15: budget stage and a no-op retry produce exactly one quoted event.
 allowed:=public.platform_set_status(p1,b,'quoted');
 if (allowed and (select status='quoted' from public.leads where id=l1)) is distinct from true then raise exception 'Check 14: quoted'; end if;
 select count(*) into events_before from public.platform_events where project_id=p1;
 allowed:=public.platform_set_status(p1,b,'quoted');
 if (allowed and (select count(*)=events_before from public.platform_events where project_id=p1)) is distinct from true then raise exception 'Check 15: quoted retry history'; end if;
 -- 16: won stage persists and is recorded.
 allowed:=public.platform_set_status(p1,b,'won');
 if (allowed and (select status='won' from public.leads where id=l1) and (select count(*)=1 from public.platform_events where project_id=p1 and status='won')) is distinct from true then raise exception 'Check 16: won'; end if;
 -- 17: cancelling an old confirmed visit cannot reverse a won job.
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h,'action','visit-update','visit_id',visit,'decision','cancelled'));
 if (r ? 'id' and (select status='won' from public.leads where id=l1)) is distinct from true then raise exception 'Check 17: won stays won'; end if;
 -- 18: complete the independent lost pipeline.
 allowed:=public.platform_set_status(p2,b,'contacted');
 if not allowed then raise exception 'Check 18: lost path contact'; end if;
 allowed:=public.platform_set_status(p2,b,'quoted');
 if not allowed then raise exception 'Check 18: lost path quote'; end if;
 allowed:=public.platform_set_status(p2,b,'lost');
 if (allowed and (select status='lost' from public.leads where id=l2)) is distinct from true then raise exception 'Check 18: lost path'; end if;
 -- 19: each project has its own complete status multiset; no cross-project events.
 if ((select array_agg(status order by status) from public.platform_events where project_id=p1)=array['contacted','new','quoted','visit_scheduled','won']::text[]
  and (select array_agg(status order by status) from public.platform_events where project_id=p2)=array['contacted','lost','new','quoted']::text[]) is distinct from true then raise exception 'Check 19: status history'; end if;
 -- 20: retries and every workflow change have not duplicated/claimed the outbox.
 if ((select count(*)=2 from public.lead_notifications where lead_id in(l1,l2) and status='pending') and (select count(*)=2 from public.leads where email like marker||'%@example.invalid')) is distinct from true then raise exception 'Check 20: outbox remains private'; end if;
 -- 21/22: browser roles cannot invoke the privileged status RPC directly.
 if has_function_privilege('anon','public.platform_set_status(uuid,uuid,text)','execute') then raise exception 'Check 21: anonymous status RPC privilege'; end if;
 if has_function_privilege('authenticated','public.platform_set_status(uuid,uuid,text)','execute') then raise exception 'Check 22: authenticated status RPC privilege'; end if;
end $$;
rollback;
-- Runs only if every preceding assertion succeeded. No fixture may remain.
select 22 as database_checks_passed,
 (select count(*) from public.leads where email like 'buzzie-journey-rollback-%@example.invalid') as remaining_fixture_leads,
 (select count(*) from public.platform_projects p join public.leads l on l.id=p.lead_id where l.email like 'buzzie-journey-rollback-%@example.invalid') as remaining_fixture_projects,
 (select count(*) from public.lead_notifications n join public.leads l on l.id=n.lead_id where l.email like 'buzzie-journey-rollback-%@example.invalid') as remaining_fixture_notifications;

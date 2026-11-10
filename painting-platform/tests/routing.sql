-- Authorized operator only, project ocmgrgvzhuhyigaddhue. Run ENTIRE file.
-- Synthetic active providers exist only inside this transaction, never committed.
-- No public intake/Auth/Storage/worker endpoint is called. Never replace ROLLBACK.
begin;
set local statement_timeout='10s';
set local lock_timeout='2s';
do $$
declare
 b1 uuid:=gen_random_uuid(); b2 uuid:=gen_random_uuid(); k uuid:=gen_random_uuid();
 marker text:='buzzie-routing-rollback-'||gen_random_uuid()::text;
 payload jsonb; r jsonb; saved_project uuid; passed integer:=0;
begin
 -- Fail closed if new row triggers could introduce unreviewed side effects.
 -- The two allowed lead triggers only enqueue a transactional row / status event.
 if exists (
  select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace join pg_proc f on f.oid=t.tgfoid
  join pg_namespace fn on fn.oid=f.pronamespace
  where not t.tgisinternal and (
   (n.nspname='auth' and c.relname='users') or
   (n.nspname='public' and c.relname in ('leads','lead_notifications',
    'platform_businesses','platform_business_members','platform_projects',
    'platform_project_reviews','platform_events','platform_photos','platform_messages','platform_visits'))
  ) and (n.nspname,c.relname,t.tgname,fn.nspname,f.proname) not in (
   ('public','leads','enqueue_lead_notification','public','enqueue_lead_notification'),
   ('public','leads','platform_lead_status_event','public','platform_lead_event')
  )
 ) then raise exception 'Unexpected fixture trigger: review before running'; end if;

 -- Review the exact RPC/trigger implementation before any fixture insertion.
 if exists (
  select 1 from (values
   ('public.platform_create_project(jsonb)','8719476dfc1c9ebfedf31da56d88e892'),
   ('public.enqueue_lead_notification()','2820ba6299e3a9e11705b04671d22465'),
   ('public.platform_lead_event()','e9b236a9afa67579d4c7c7c21af8e1ba')
  ) as expected(signature,body_hash)
  left join pg_proc p on p.oid=to_regprocedure(expected.signature)
  where md5(regexp_replace(p.prosrc,'[[:space:]]','','g')) is distinct from expected.body_hash
 ) then raise exception 'Reviewed routing/trigger body changed: inspect before replay';end if;
 if (select count(*) from public.platform_projects where created_at>now()-interval '24 hours')>=28
 or (select count(*) from public.leads where created_at>now()-interval '1 hour' and phone='2025550149')>=2
 then raise exception 'Insufficient existing pilot rate-limit headroom; do not change live limits';end if;

 insert into public.platform_businesses(id,slug,name,website,phone,active,state,cities,zip_prefix,accepting_requests)
 values(b1,marker||'-a','Synthetic rollback A','https://example.invalid','2025550149',false,'SC',array['Summerville'],'294',true),
       (b2,marker||'-b','Synthetic rollback B','https://example.invalid','2025550149',true,'SC',array['Summerville'],'294',true);
 payload:=jsonb_build_object('request_key',k,'access_hash',repeat('a',64),'ip_hash',marker,
  'provider_slug',marker||'-a','full_name','Synthetic rollback homeowner',
  'email',marker||'@example.invalid','phone','2025550149','city','Summerville','state','SC','zip','29483',
  'service','Interior painting','property_type','Home','timing','Just planning','details','Rollback-only routing fixture');

r:=public.platform_create_project(payload||jsonb_build_object('provider_slug',marker||'-missing'));
 if (r->>'error'='outside_pilot_area') is distinct from true then raise exception 'Routing 1: unknown slug cannot fall back';end if;
 passed:=passed+1;

r:=public.platform_create_project(payload);
 if (r->>'error'='outside_pilot_area') is distinct from true then raise exception 'Routing 2: inactive provider rejected despite active alternate';end if;
 passed:=passed+1;

update public.platform_businesses set active=true,accepting_requests=false where id=b1;
 r:=public.platform_create_project(payload);
 if (r->>'error'='outside_pilot_area') is distinct from true then raise exception 'Routing 3: paused provider rejected';end if;
 passed:=passed+1;

update public.platform_businesses set accepting_requests=true where id=b1;
 r:=public.platform_create_project(payload||jsonb_build_object('state','NC'));
 if (r->>'error'='outside_pilot_area') is distinct from true then raise exception 'Routing 4: wrong state rejected';end if;
 passed:=passed+1;

r:=public.platform_create_project(payload||jsonb_build_object('zip','29583'));
 if (r->>'error'='outside_pilot_area') is distinct from true then raise exception 'Routing 5: ZIP outside configured prefix rejected';end if;
 passed:=passed+1;

r:=public.platform_create_project(payload||jsonb_build_object('city','Outside fixture city'));
 if (r->>'error'='outside_pilot_area') is distinct from true then raise exception 'Routing 6: city outside configured list rejected';end if;
 passed:=passed+1;

 if (not exists(select 1 from public.platform_projects where business_id in (b1,b2)) and not exists(select 1 from public.leads where email=marker||'@example.invalid')) is distinct from true then raise exception 'Routing 7: coverage denials create no leads or assignments';end if;
 passed:=passed+1;

r:=public.platform_create_project(payload||jsonb_build_object('city','sUmMeRvIlLe'));
 saved_project:=(r->>'id')::uuid;
 if (r ? 'id' and coalesce((r->>'duplicate')::boolean,true)=false and (select business_id=b1 from public.platform_projects where id=saved_project)) is distinct from true then raise exception 'Routing 8: matching city case routes only to selected provider';end if;
 passed:=passed+1;

 if ((select not contact_verified and owner_user_id is null from public.platform_projects where id=saved_project)) is distinct from true then raise exception 'Routing 9: assignment does not imply verified contact or account ownership';end if;
 passed:=passed+1;

 if ((select count(*)=1 from public.lead_notifications n join public.platform_projects p on p.lead_id=n.lead_id where p.id=saved_project and n.status='pending' and n.attempts=0)) is distinct from true then raise exception 'Routing 10: outbox stays unclaimed inside transaction';end if;
 passed:=passed+1;

update public.platform_businesses set accepting_requests=false where id=b1;
 r:=public.platform_create_project(payload||jsonb_build_object('request_key',gen_random_uuid()));
 if (r->>'error'='outside_pilot_area' and not exists(select 1 from public.platform_projects where business_id=b2)) is distinct from true then raise exception 'Routing 11: paused new request never reroutes to alternate provider';end if;
 passed:=passed+1;

r:=public.platform_create_project(payload);
 if (r->>'duplicate'='true' and r->>'id'=saved_project::text) is distinct from true then raise exception 'Routing 12: existing retry survives intake pause';end if;
 passed:=passed+1;

r:=public.platform_create_project(payload||jsonb_build_object('access_hash',repeat('b',64)));
 if (r->>'error'='request_conflict' and (select business_id=b1 from public.platform_projects where id=saved_project)) is distinct from true then raise exception 'Routing 13: different private key cannot replay or reassign';end if;
 passed:=passed+1;

update public.platform_businesses set active=false where id=b1;
 r:=public.platform_create_project(payload);
 if (r->>'duplicate'='true' and r->>'id'=saved_project::text) is distinct from true then raise exception 'Routing 14: existing retry survives provider deactivation';end if;
 passed:=passed+1;

update public.platform_businesses set cities=array['Changed fixture city'],state='NC',zip_prefix='999' where id=b1;
 r:=public.platform_create_project(payload);
 if (r->>'duplicate'='true' and r->>'id'=saved_project::text) is distinct from true then raise exception 'Routing 15: coverage edits do not move existing project';end if;
 passed:=passed+1;

 if ((select count(*)=1 from public.platform_projects where business_id in (b1,b2)) and (select count(*)=1 from public.leads where email=marker||'@example.invalid') and (select count(*)=1 from public.platform_events where platform_events.project_id=saved_project)) is distinct from true then raise exception 'Routing 16: retries and denials leave exactly one fixture lead project and event';end if;
 passed:=passed+1;

 perform set_config('buzzie.routing_checks_passed',passed::text,true);
end $$;
select current_setting('buzzie.routing_checks_passed')::integer as checks_passed;
rollback;
-- Outside the transaction: all three counts must be zero.
select
 (select count(*) from public.leads where email like 'buzzie-routing-rollback-%@example.invalid') as remaining_fixture_leads,
 (select count(*) from public.platform_businesses where slug like 'buzzie-routing-rollback-%') as remaining_fixture_businesses,
 (select count(*) from public.platform_projects where ip_hash like 'buzzie-routing-rollback-%') as remaining_fixture_projects;

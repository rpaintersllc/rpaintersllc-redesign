-- Operator-only, isolated pilot. Run complete file including ROLLBACK.
begin;
set local statement_timeout='10s';
set local lock_timeout='2s';
do $$
declare
 b1 uuid:=gen_random_uuid();b2 uuid:=gen_random_uuid();u1 uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();staff uuid:=gen_random_uuid();
 l1 uuid:=gen_random_uuid();l2 uuid:=gen_random_uuid();p1 uuid:=gen_random_uuid();p2 uuid:=gen_random_uuid();
 marker text:='buzzie-estimate-rollback-'||gen_random_uuid()::text;r jsonb;
begin
 if exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc f on f.oid=t.tgfoid where not t.tgisinternal and ((n.nspname='auth' and c.relname='users') or (n.nspname='public' and c.relname in ('platform_businesses','platform_business_members','platform_projects','platform_project_estimates','lead_notifications','platform_events')))) then raise exception 'Unreviewed fixture trigger';end if;
 if exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc f on f.oid=t.tgfoid where not t.tgisinternal and n.nspname='public' and c.relname='leads' and (t.tgname,f.proname) not in (('enqueue_lead_notification','enqueue_lead_notification'),('platform_lead_status_event','platform_lead_event'))) then raise exception 'Unreviewed lead trigger';end if;
 insert into auth.users(id,email,email_confirmed_at) values(u1,marker||'-a@example.invalid',now()),(u2,marker||'-b@example.invalid',now()),(staff,marker||'-staff@example.invalid',now());
 insert into public.platform_businesses(id,slug,name,website,phone,active,state,cities,accepting_requests) values
 (b1,marker||'-a','Inactive estimate fixture A','https://example.invalid','2025550149',false,'SC',array['Summerville'],false),
 (b2,marker||'-b','Inactive estimate fixture B','https://example.invalid','2025550150',false,'SC',array['Summerville'],false);
 insert into public.platform_business_members(business_id,user_id,role) values(b1,u1,'owner'),(b1,staff,'staff'),(b2,u2,'owner');
 insert into public.leads(id,request_key,full_name,email,phone,city,zip,service,details,consent_at,source) values
 (l1,gen_random_uuid(),'Rollback fixture',marker||'-a@example.invalid','2025550149','Summerville','29483','Interior','Reverted estimate fixture',now(),'buzzie-estimate-rollback-test'),
 (l2,gen_random_uuid(),'Rollback fixture',marker||'-b@example.invalid','2025550150','Summerville','29483','Interior','Reverted estimate fixture',now(),'buzzie-estimate-rollback-test');
 insert into public.platform_projects(id,lead_id,business_id,access_hash,property_type,timing,ip_hash) values
 (p1,l1,b1,repeat('a',64),'Home','Planning',marker),(p2,l2,b2,repeat('b',64),'Home','Planning',marker);
 r:=public.platform_save_estimate(p1,b1,u2,0,250000);if (r->>'error'='forbidden') is distinct from true then raise exception 'Check 1 foreign actor';end if;
 r:=public.platform_save_estimate(p2,b1,u1,0,250000);if (r->>'error'='not_found') is distinct from true then raise exception 'Check 2 foreign project';end if;
 r:=public.platform_save_estimate(p1,b1,u1,0,0);if (r->>'error'='invalid') is distinct from true then raise exception 'Check 3 zero';end if;
 r:=public.platform_save_estimate(p1,b1,u1,0,-1);if (r->>'error'='invalid') is distinct from true then raise exception 'Check 4 negative';end if;
 r:=public.platform_save_estimate(p1,b1,u1,0,1000000000);if (r->>'error'='invalid') is distinct from true then raise exception 'Check 5 over limit';end if;
 r:=public.platform_save_estimate(p1,b1,u1,0,null);if (r->>'error'='invalid') is distinct from true then raise exception 'Check 6 missing amount';end if;
 r:=public.platform_save_estimate(p1,b1,u1,null,250000);if (r->>'error'='invalid') is distinct from true then raise exception 'Check 7 missing revision';end if;
 r:=public.platform_save_estimate(p1,b1,u1,2147483647,250000);if (r->>'error'='invalid') is distinct from true then raise exception 'Check 8 revision overflow';end if;
 r:=public.platform_save_estimate(p1,b1,u1,0,250001);if (r->>'amount_cents'='250001' and r->>'currency'='USD' and r->>'revision'='1' and (select updated_by=u1 from public.platform_project_estimates where project_id=p1)) is distinct from true then raise exception 'Check 9 exact cents';end if;
 r:=public.platform_save_estimate(p1,b1,staff,1,350000);if (r->>'revision'='2' and (select amount_cents=350000 and updated_by=staff from public.platform_project_estimates where project_id=p1)) is distinct from true then raise exception 'Check 10 staff revision';end if;
 r:=public.platform_save_estimate(p1,b1,u1,1,999);if (r->>'error'='conflict' and (select amount_cents=350000 from public.platform_project_estimates where project_id=p1)) is distinct from true then raise exception 'Check 11 stale overwrite';end if;
 r:=public.platform_save_estimate(p1,b2,u2,0,999);if (r->>'error'='not_found' and (select business_id=b1 from public.platform_project_estimates where project_id=p1)) is distinct from true then raise exception 'Check 12 foreign business';end if;
 if exists(select 1 from public.platform_project_estimates where project_id=p2) then raise exception 'Check 13 untouched foreign fixture';end if;
 if has_table_privilege('anon','public.platform_project_estimates','select') then raise exception 'Check 14 anonymous read';end if;
 if has_table_privilege('authenticated','public.platform_project_estimates','update') then raise exception 'Check 15 authenticated write';end if;
 if has_function_privilege('anon','public.platform_save_estimate(uuid,uuid,uuid,integer,bigint)','execute') then raise exception 'Check 16 anonymous RPC';end if;
 if has_function_privilege('authenticated','public.platform_save_estimate(uuid,uuid,uuid,integer,bigint)','execute') then raise exception 'Check 17 authenticated RPC';end if;
 if (select relrowsecurity from pg_class where oid='public.platform_project_estimates'::regclass) is distinct from true then raise exception 'Check 18 RLS';end if;
 r:=public.platform_save_estimate(p1,b1,u1,2,999999999);if (r->>'amount_cents'='999999999' and r->>'revision'='3' and (select status='new' from public.leads where id=l1)) is distinct from true then raise exception 'Check 19 upper boundary and status unchanged';end if;
 r:=public.platform_save_estimate(p1,b1,u1,2,999999999);if (r->>'error'='conflict' and (select count(*)=1 from public.platform_project_estimates where project_id=p1) and (select count(*)=2 from public.lead_notifications where lead_id in(l1,l2) and status='pending')) is distinct from true then raise exception 'Check 20 retry and outbox';end if;
end $$;
rollback;
select 20 as checks_passed,
(select count(*) from public.leads where source='buzzie-estimate-rollback-test') as remaining_fixture_leads,
(select count(*) from public.platform_businesses where slug like 'buzzie-estimate-rollback-%') as remaining_fixture_businesses,
(select count(*) from auth.users where email like 'buzzie-estimate-rollback-%@example.invalid') as remaining_fixture_users;

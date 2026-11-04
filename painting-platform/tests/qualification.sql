-- Operator-only, isolated pilot. Run complete file including ROLLBACK.
begin;
set local statement_timeout='10s';
set local lock_timeout='2s';
do $$
declare
 b1 uuid:=gen_random_uuid();b2 uuid:=gen_random_uuid();u1 uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();staff uuid:=gen_random_uuid();
 l1 uuid:=gen_random_uuid();l2 uuid:=gen_random_uuid();p1 uuid:=gen_random_uuid();p2 uuid:=gen_random_uuid();
 checks jsonb:='{"two_way":true,"authority":true,"scope":true,"coverage":true,"timing":true}';
 marker text:='buzzie-qualification-rollback-'||gen_random_uuid()::text;r jsonb;
begin
 if exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc f on f.oid=t.tgfoid where not t.tgisinternal and ((n.nspname='auth' and c.relname='users') or (n.nspname='public' and c.relname in ('platform_businesses','platform_business_members','platform_projects','platform_project_reviews','lead_notifications','platform_events')))) then raise exception 'Unreviewed fixture trigger';end if;
 if exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc f on f.oid=t.tgfoid where not t.tgisinternal and n.nspname='public' and c.relname='leads' and (t.tgname,f.proname) not in (('enqueue_lead_notification','enqueue_lead_notification'),('platform_lead_status_event','platform_lead_event'))) then raise exception 'Unreviewed lead trigger';end if;
 insert into auth.users(id,email,email_confirmed_at) values(u1,marker||'-a@example.invalid',now()),(u2,marker||'-b@example.invalid',now()),(staff,marker||'-staff@example.invalid',now());
 insert into public.platform_businesses(id,slug,name,website,phone,active,state,cities,accepting_requests) values
 (b1,marker||'-a','Inactive estimate fixture A','https://example.invalid','2025550149',false,'SC',array['Summerville'],false),
 (b2,marker||'-b','Inactive estimate fixture B','https://example.invalid','2025550150',false,'SC',array['Summerville'],false);
 insert into public.platform_business_members(business_id,user_id,role) values(b1,u1,'owner'),(b1,staff,'staff'),(b2,u2,'owner');
 insert into public.leads(id,request_key,full_name,email,phone,city,zip,service,details,consent_at,source) values
 (l1,gen_random_uuid(),'Rollback fixture',marker||'-a@example.invalid','2025550149','Summerville','29483','Interior','Reverted estimate fixture',now(),'buzzie-qualification-rollback-test'),
 (l2,gen_random_uuid(),'Rollback fixture',marker||'-b@example.invalid','2025550150','Summerville','29483','Interior','Reverted estimate fixture',now(),'buzzie-qualification-rollback-test');
 insert into public.platform_projects(id,lead_id,business_id,access_hash,property_type,timing,ip_hash) values
 (p1,l1,b1,repeat('a',64),'Home','Planning',marker),(p2,l2,b2,repeat('b',64),'Home','Planning',marker);

 execute 'set local role service_role';
 r:=public.platform_save_qualification(p1,b1,u2,0,'qualified','deny',checks,null);assert r->>'error'='forbidden','Foreign actor';
 r:=public.platform_save_qualification(p2,b1,u1,0,'qualified','deny',checks,null);assert r->>'error'='not_found','Foreign project';
 r:=public.platform_save_qualification(p1,b1,u1,0,'qualified','missing',null,null);assert r->>'error'='invalid','Missing checks';
 r:=public.platform_save_qualification(p1,b1,u1,0,'qualified','false',checks||'{"scope":false}',null);assert r->>'error'='invalid','False check';
 r:=public.platform_save_qualification(p1,b1,u1,0,'qualified','extra',checks||'{"extra":true}',null);assert r->>'error'='invalid','Extra check';
 r:=public.platform_save_qualification(p1,b1,u1,0,'not_fit','missing reason',null,null);assert r->>'error'='invalid','Missing reason';
 r:=public.platform_save_qualification(p1,b1,u1,0,'not_fit','unknown',null,'unknown');assert r->>'error'='invalid','Unknown reason';
 r:=public.platform_save_qualification(p1,b1,u1,0,'not_fit',' ',null,'other');assert r->>'error'='invalid','Empty other';
 r:=public.platform_save_qualification(p1,b1,u1,0,'unreviewed','stale',checks,null);assert r->>'error'='invalid','Stale checks';
 r:=public.platform_save_qualification(p1,b1,u1,0,'qualified','confirmed',checks,null);assert r->>'revision'='1' and r->'qualification_checks'=checks,'Qualified saved';
 assert exists(select 1 from public.platform_review_history where project_id=p1 and actor=u1 and revision=1 and qualification_checks=checks),'Audit missing';
 r:=public.platform_save_qualification(p1,b1,u1,0,'not_fit','stale',null,'timing');assert r->>'error'='conflict','Stale revision';
 assert (select count(*)=1 from public.platform_review_history where project_id=p1),'Rejected write audited';
 r:=public.platform_save_qualification(p1,b1,staff,1,'not_fit','Timing changed',null,'timing');assert r->>'revision'='2' and r->>'disposition_reason'='timing' and r->'qualification_checks'='null','Staff saves reason and clears evidence';
 assert (select count(*)=2 from public.platform_review_history where project_id=p1),'History lost';
 r:=public.platform_save_qualification(p1,b1,u1,2,'unreviewed','reopened',null,null);assert r->>'revision'='3' and r->'disposition_reason'='null','Reopened clears reason';
 assert (select status='new' from public.leads where id=l1),'Qualification changed customer-visible status';
 assert not exists(select 1 from public.platform_project_reviews where project_id=p2),'Foreign fixture changed';
 assert not has_table_privilege('anon','public.platform_review_history','select'),'Public history';
 assert not has_table_privilege('authenticated','public.platform_review_history','insert'),'Client history writes';
 assert not has_function_privilege('anon','public.platform_save_qualification(uuid,uuid,uuid,integer,text,text,jsonb,text)','execute'),'Public RPC';
 assert not has_function_privilege('authenticated','public.platform_save_qualification(uuid,uuid,uuid,integer,text,text,jsonb,text)','execute'),'Client RPC';
 assert (select relrowsecurity from pg_class where oid='public.platform_review_history'::regclass),'RLS missing';
end $$;
rollback;
select 23 as assertions_passed,
(select count(*) from public.leads where source='buzzie-qualification-rollback-test') as remaining_fixture_leads,
(select count(*) from public.platform_businesses where slug like 'buzzie-qualification-rollback-%') as remaining_fixture_businesses,
(select count(*) from auth.users where email like 'buzzie-qualification-rollback-%@example.invalid') as remaining_fixture_users;

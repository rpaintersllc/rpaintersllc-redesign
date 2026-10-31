-- Operator-only, isolated pilot: run this entire file, including final ROLLBACK.
-- Synthetic rows never commit; no Auth API, Storage, intake endpoint or dispatcher.
-- Requires the reviewed migrations; does not depend on pre-existing test records.
begin;
set local statement_timeout = '10s';
set local lock_timeout = '2s';
do $$
declare
 b1 uuid := gen_random_uuid(); b2 uuid := gen_random_uuid();
 u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); staff uuid := gen_random_uuid();
 l1 uuid := gen_random_uuid(); l2 uuid := gen_random_uuid();
 p1 uuid := gen_random_uuid(); p2 uuid := gen_random_uuid();
 message_key uuid := gen_random_uuid(); visit_key uuid := gen_random_uuid();
 visit_id uuid; slot_id uuid; boundary_key uuid; r jsonb; allowed boolean; passed integer := 0;
 marker text := 'buzzie-rpc-rollback-' || gen_random_uuid()::text;
 h1 text := repeat('a',64); h2 text := repeat('b',64);
 tomorrow date := (now() at time zone 'America/New_York')::date + 1;
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

 insert into auth.users(id,email,email_confirmed_at) values
  (u1,marker||'-owner@example.invalid',now()),
  (u2,marker||'-other@example.invalid',now()),
  (staff,marker||'-staff@example.invalid',now());
 -- Both companies stay INACTIVE, even when their intake flag is tested.
 insert into public.platform_businesses(id,slug,name,website,phone,active,state,cities,accepting_requests)
 values (b1,marker||'-a','Rollback fixture A','https://example.invalid','2025550149',false,'SC',array['Summerville'],false),
        (b2,marker||'-b','Rollback fixture B','https://example.invalid','2025550149',false,'SC',array['Summerville'],false);
 insert into public.platform_business_members(business_id,user_id,role)
 values (b1,u1,'owner'),(b1,staff,'staff'),(b2,u2,'owner');
 insert into public.leads(id,request_key,full_name,email,phone,city,zip,service,details,consent_at,source)
 values (l1,gen_random_uuid(),'Rollback fixture A',marker||'-owner@example.invalid','2025550149','Summerville','29483','Interior','Rollback-only fixture',now(),'buzzie-rpc-rollback-test'),
        (l2,gen_random_uuid(),'Rollback fixture B',marker||'-other@example.invalid','2025550149','Summerville','29483','Interior','Rollback-only fixture',now(),'buzzie-rpc-rollback-test');
 insert into public.platform_projects(id,lead_id,business_id,access_hash,property_type,timing,ip_hash)
 values (p1,l1,b1,h1,'Home','Planning',marker),(p2,l2,b2,h2,'Home','Planning',marker);

 if (not public.platform_claim_project(p1,h2,u1)) is distinct from true then
  raise exception 'Check 1: wrong capability cannot claim';
 end if;
 passed := passed + 1;

 if (not public.platform_claim_project(p1,h1,u2)) is distinct from true then
  raise exception 'Check 2: different email cannot claim';
 end if;
 passed := passed + 1;

update auth.users set email_confirmed_at=null where id=u1;
 if (not public.platform_claim_project(p1,h1,u1)) is distinct from true then
  raise exception 'Check 3: unconfirmed email cannot claim';
 end if;
 passed := passed + 1;

 if ((select owner_user_id is null from public.platform_projects where id=p1)) is distinct from true then
  raise exception 'Check 4: denied claims preserve unowned project';
 end if;
 passed := passed + 1;

update auth.users set email_confirmed_at=now() where id=u1;
 if (public.platform_claim_project(p1,h1,u1)) is distinct from true then
  raise exception 'Check 5: confirmed matching owner can claim';
 end if;
 passed := passed + 1;

 if (public.platform_claim_project(p1,h1,u1)) is distinct from true then
  raise exception 'Check 6: owner claim is idempotent';
 end if;
 passed := passed + 1;

update auth.users set email=marker||'-former@example.invalid' where id=u1;
 update auth.users set email=marker||'-owner@example.invalid' where id=u2;
 if (not public.platform_claim_project(p1,h1,u2) and (select owner_user_id=u1 from public.platform_projects where id=p1)) is distinct from true then
  raise exception 'Check 7: matching email cannot reassign existing owner';
 end if;
 passed := passed + 1;

 r:=public.platform_save_review(p1,b1,u2,0,'qualified','Denied');
 if (r->>'error'='forbidden') is distinct from true then
  raise exception 'Check 8: foreign member cannot save review';
 end if;
 passed := passed + 1;

 r:=public.platform_save_review(p2,b1,u1,0,'qualified','Denied');
 if (r->>'error'='not_found' and not exists(select 1 from public.platform_project_reviews where project_id in (p1,p2))) is distinct from true then
  raise exception 'Check 9: valid member cannot review foreign project';
 end if;
 passed := passed + 1;

 r:=public.platform_save_review(p1,b1,u1,0,'qualified','Owner review');
 if (r->>'revision'='1' and (select notes='Owner review' and updated_by=u1 from public.platform_project_reviews where project_id=p1)) is distinct from true then
  raise exception 'Check 10: owner review persists inside transaction';
 end if;
 passed := passed + 1;

 r:=public.platform_save_review(p1,b1,u1,0,'not_fit','Stale');
 if (r->>'error'='conflict' and (select revision=1 and notes='Owner review' from public.platform_project_reviews where project_id=p1)) is distinct from true then
  raise exception 'Check 11: stale review cannot overwrite';
 end if;
 passed := passed + 1;

 r:=public.platform_save_review(p1,b1,staff,1,'unreviewed','Staff review');
 if (r->>'revision'='2' and (select updated_by=staff from public.platform_project_reviews where project_id=p1)) is distinct from true then
  raise exception 'Check 12: staff can review own project';
 end if;
 passed := passed + 1;

 r:=public.platform_set_availability(b1,staff,true,false);
 if (r->>'error'='forbidden') is distinct from true then
  raise exception 'Check 13: staff cannot change availability';
 end if;
 passed := passed + 1;

 r:=public.platform_set_availability(b1,u2,true,false);
 if (r->>'error'='forbidden' and (select not accepting_requests from public.platform_businesses where id=b1)) is distinct from true then
  raise exception 'Check 14: foreign owner cannot change availability';
 end if;
 passed := passed + 1;

 r:=public.platform_set_availability(b1,u1,true,true);
 if (r->>'error'='conflict') is distinct from true then
  raise exception 'Check 15: stale availability does not apply';
 end if;
 passed := passed + 1;

 r:=public.platform_set_availability(b1,u1,true,false);
 if (r->>'accepting_requests'='true' and (select accepting_requests and not active from public.platform_businesses where id=b1)) is distinct from true then
  raise exception 'Check 16: owner changes only inactive fixture intake flag';
 end if;
 passed := passed + 1;

 if (not public.platform_set_status(p1,b2,'quoted') and (select status='new' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 17: foreign company cannot change status';
 end if;
 passed := passed + 1;

 allowed:=public.platform_set_status(p1,b1,'contacted');
 if (allowed and (select status='contacted' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 18: correct company changes status';
 end if;
 passed := passed + 1;

 r:=public.platform_reserve_photo(p1,h2,'image/jpeg',100);
 if (r is null and not exists(select 1 from public.platform_photos where project_id=p1)) is distinct from true then
  raise exception 'Check 19: wrong capability cannot reserve photo';
 end if;
 passed := passed + 1;

 r:=public.platform_reserve_photo(p1,h1,'text/html',100);
 if (r is null and not exists(select 1 from public.platform_photos where project_id=p1)) is distinct from true then
  raise exception 'Check 20: invalid photo MIME rejected';
 end if;
 passed := passed + 1;

 r:=public.platform_reserve_photo(p1,h1,'image/jpeg',100);
 if (r ? 'id' and (select count(*)=1 from public.platform_photos where project_id=p1 and status='pending')) is distinct from true then
  raise exception 'Check 21: valid photo reserves metadata only';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'action','message','request_key',message_key,'body','Rollback message','access_hash',h2));
 if (r->>'error'='not_found') is distinct from true then
  raise exception 'Check 22: wrong capability cannot message';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'action','message','request_key',message_key,'body','Rollback message','business_id',b2));
 if (r->>'error'='not_found' and not exists(select 1 from public.platform_messages where project_id=p1)) is distinct from true then
  raise exception 'Check 23: foreign company cannot message';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'action','message','request_key',message_key,'body','Rollback message','access_hash',h1));
 if (r ? 'id' and (select count(*)=1 from public.platform_messages where project_id=p1 and author='homeowner')) is distinct from true then
  raise exception 'Check 24: valid homeowner message persists inside transaction';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'action','message','request_key',message_key,'body','Rollback message','access_hash',h1));
 if (r->>'duplicate'='true' and (select count(*)=1 from public.platform_messages where project_id=p1)) is distinct from true then
  raise exception 'Check 25: message retry does not duplicate';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'action','message','request_key',message_key,'body','Rollback message','access_hash',h1,'body','Changed'));
 if (r->>'error'='conflict' and (select body='Rollback message' from public.platform_messages where project_id=p1)) is distinct from true then
  raise exception 'Check 26: message key cannot overwrite body';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-request','request_key',visit_key,'preferred_date',tomorrow,'time_window','Flexible'));
 visit_id:=(r->>'id')::uuid;
 if (r ? 'id') is distinct from true then
  raise exception 'Check 27: homeowner can request visit';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'business_id',b2,'action','visit-update','visit_id',visit_id,'decision','confirmed'));
 if (r->>'error'='not_found' and (select status='requested' from public.platform_visits where id=visit_id)) is distinct from true then
  raise exception 'Check 28: visit update is scoped to project';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-update','visit_id',visit_id,'decision','confirmed'));
 if (r->>'error'='forbidden' and (select status='requested' from public.platform_visits where id=visit_id)) is distinct from true then
  raise exception 'Check 29: homeowner cannot confirm contractor decision';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'business_id',b1,'action','visit-update','visit_id',visit_id,'decision','confirmed'));
 if (r ? 'id' and (select status='confirmed' from public.platform_visits where id=visit_id) and (select status='visit_scheduled' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 30: assigned company confirms and advances status';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-update','visit_id',visit_id,'decision','cancelled'));
 if (r ? 'id' and (select status='cancelled' from public.platform_visits where id=visit_id) and (select status='contacted' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 31: homeowner cancellation restores early pipeline';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'business_id',b1,'action','visit-update','visit_id',visit_id,'decision','confirmed'));
 if (r->>'error'='conflict' and (select status='cancelled' from public.platform_visits where id=visit_id)) is distinct from true then
  raise exception 'Check 32: cancelled visit cannot be reopened';
 end if;
 passed := passed + 1;

 if ((select status='new' from public.leads where id=l2) and not exists(select 1 from public.platform_messages where project_id=p2) and not exists(select 1 from public.platform_project_reviews where project_id=p2)) is distinct from true then
  raise exception 'Check 33: foreign fixture remains unchanged';
 end if;
 passed := passed + 1;

 if ((select count(*)=2 from public.lead_notifications where lead_id in (l1,l2) and status='pending')) is distinct from true then
  raise exception 'Check 34: outbox rows remain unclaimed within transaction';
 end if;
 passed := passed + 1;

 -- Photo byte/capacity/expiry boundaries; metadata only, never Storage.

 r:=public.platform_reserve_photo(p1,h1,'image/jpeg',0);
 if (r is null and (select count(*)=1 from public.platform_photos where project_id=p1)) is distinct from true then
  raise exception 'Check 35: zero-byte photo rejected';
 end if;
 passed := passed + 1;

 r:=public.platform_reserve_photo(p1,h1,'image/jpeg',5242881);
 if (r is null and (select count(*)=1 from public.platform_photos where project_id=p1)) is distinct from true then
  raise exception 'Check 36: over-5-MiB photo rejected';
 end if;
 passed := passed + 1;

 r:=public.platform_reserve_photo(p1,h1,'image/png',5242880);
 if (r ? 'id' and (select bytes=5242880 from public.platform_photos where id=(r->>'id')::uuid)) is distinct from true then
  raise exception 'Check 37: exact 5-MiB photo accepted';
 end if;
 passed := passed + 1;

 perform public.platform_reserve_photo(p1,h1,'image/jpeg',100);
 perform public.platform_reserve_photo(p1,h1,'image/jpeg',100);
 r:=public.platform_reserve_photo(p1,h1,'image/webp',100);
 slot_id:=(r->>'id')::uuid;
 if ((select count(*)=5 from public.platform_photos where project_id=p1 and status='pending')) is distinct from true then
  raise exception 'Check 38: five pending reservations permitted';
 end if;
 passed := passed + 1;

 r:=public.platform_reserve_photo(p1,h1,'image/jpeg',100);
 if (r->>'error'='photo_limit' and (select count(*)=5 from public.platform_photos where project_id=p1)) is distinct from true then
  raise exception 'Check 39: sixth reservation blocked';
 end if;
 passed := passed + 1;

 update public.platform_photos set created_at=now()-interval '5 minutes' where id=slot_id;
 r:=public.platform_reserve_photo(p1,h1,'image/jpeg',100);
 if (r->>'error'='photo_limit' and (select status='pending' from public.platform_photos where id=slot_id)) is distinct from true then
  raise exception 'Check 40: exactly five-minute-old pending slot still counts';
 end if;
 passed := passed + 1;

 update public.platform_photos set created_at=now()-interval '5 minutes 1 microsecond' where id=slot_id;
 r:=public.platform_reserve_photo(p1,h1,'image/jpeg',100);
 if (r ? 'id' and (select status='failed' from public.platform_photos where id=slot_id) and (select count(*)=5 from public.platform_photos where project_id=p1 and status in ('ready','pending')) and (select count(*)=6 from public.platform_photos where project_id=p1)) is distinct from true then
  raise exception 'Check 41: older pending slot expires and frees exactly one place';
 end if;
 passed := passed + 1;

 insert into public.platform_photos(project_id,storage_path,mime,bytes,status,created_at)
 values(p2,p2::text||'/'||gen_random_uuid()::text||'.jpg','image/jpeg',100,'pending',now()-interval '6 minutes') returning id into slot_id;
 r:=public.platform_reserve_photo(p2,h1,'image/jpeg',100);
 if (r is null and (select status='pending' from public.platform_photos where id=slot_id)) is distinct from true then
  raise exception 'Check 42: wrong capability cannot expire another project slot';
 end if;
 passed := passed + 1;

 r:=public.platform_reserve_photo(p2,h2,'text/html',100);
 if (r is null and (select status='pending' from public.platform_photos where id=slot_id)) is distinct from true then
  raise exception 'Check 43: invalid MIME does not mutate stale slots';
 end if;
 passed := passed + 1;

 update public.platform_photos set status='ready',created_at=now()-interval '1 day'
 where id=(select id from public.platform_photos where project_id=p1 and status='pending' order by id limit 1);
 r:=public.platform_reserve_photo(p1,h1,'image/jpeg',100);
 if (r->>'error'='photo_limit' and (select count(*)=1 from public.platform_photos where project_id=p1 and status='ready')) is distinct from true then
  raise exception 'Check 44: ready photos never expire as pending reservations';
 end if;
 passed := passed + 1;

 -- Message caps: 40 per author per rolling 24h, 500 total; retries precede caps.

 insert into public.platform_messages(project_id,request_key,author,body)
 select p2,gen_random_uuid(),'homeowner','Synthetic rate fixture' from generate_series(1,39);
 insert into public.platform_messages(project_id,request_key,author,body,created_at)
 values(p2,gen_random_uuid(),'homeowner','Exactly 24 hours old',now()-interval '24 hours');
 boundary_key:=gen_random_uuid();
 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','message','request_key',boundary_key,'body','Boundary message'));
 if (r ? 'id' and (select count(*)=40 from public.platform_messages where project_id=p2 and author='homeowner' and created_at>now()-interval '24 hours')) is distinct from true then
  raise exception 'Check 45: 40th recent message allowed; exact 24h boundary excluded';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','message','request_key',gen_random_uuid(),'body','Boundary message'));
 if (r->>'error'='limit' and (select count(*)=41 from public.platform_messages where project_id=p2)) is distinct from true then
  raise exception 'Check 46: 41st recent message rejected without insertion';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','message','request_key',boundary_key,'body','Boundary message'));
 if (r->>'duplicate'='true' and (select count(*)=41 from public.platform_messages where project_id=p2)) is distinct from true then
  raise exception 'Check 47: same message retry allowed at daily cap';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'business_id',b2,'action','message','request_key',gen_random_uuid(),'body','Company boundary message'));
 if (r ? 'id' and (select count(*)=1 from public.platform_messages where project_id=p2 and author='business')) is distinct from true then
  raise exception 'Check 48: daily cap is per author side';
 end if;
 passed := passed + 1;

 insert into public.platform_messages(project_id,request_key,author,body,created_at)
 select p2,gen_random_uuid(),'business','Synthetic historical rate fixture',now()-interval '2 days' from generate_series(1,458);
 r:=public.platform_interact(jsonb_build_object('project_id',p2,'business_id',b2,'action','message','request_key',gen_random_uuid(),'body','Over total cap'));
 if (r->>'error'='limit' and (select count(*)=500 from public.platform_messages where project_id=p2)) is distinct from true then
  raise exception 'Check 49: 500 total cap rejects either author';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','message','request_key',boundary_key,'body','Boundary message'));
 if (r->>'duplicate'='true' and (select count(*)=500 from public.platform_messages where project_id=p2)) is distinct from true then
  raise exception 'Check 50: same message retry allowed at total cap';
 end if;
 passed := passed + 1;

 -- Visit date/open/history limits and preservation of later pipeline statuses.

 boundary_key:=gen_random_uuid();
 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-request','request_key',boundary_key,'preferred_date',tomorrow-2,'time_window','Flexible'));
 if (r->>'error'='invalid' and not exists(select 1 from public.platform_visits where project_id=p2)) is distinct from true then
  raise exception 'Check 51: past visit day rejected';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-request','request_key',boundary_key,'preferred_date',tomorrow+180,'time_window','Flexible'));
 if (r->>'error'='invalid' and not exists(select 1 from public.platform_visits where project_id=p2)) is distinct from true then
  raise exception 'Check 52: day 181 rejected';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-request','request_key',boundary_key,'preferred_date',tomorrow-1,'time_window','Night'));
 if (r->>'error'='invalid' and not exists(select 1 from public.platform_visits where project_id=p2)) is distinct from true then
  raise exception 'Check 53: unknown visit window rejected';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-request','request_key',boundary_key,'preferred_date',tomorrow-1,'time_window','Flexible'));
 visit_id:=(r->>'id')::uuid;
 if (r ? 'id' and (select preferred_date=tomorrow-1 from public.platform_visits where id=(r->>'id')::uuid)) is distinct from true then
  raise exception 'Check 54: today accepted using New York business date';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-request','request_key',gen_random_uuid(),'preferred_date',tomorrow-1,'time_window','Flexible'));
 if (r->>'error'='open_visit' and (select count(*)=1 from public.platform_visits where project_id=p2)) is distinct from true then
  raise exception 'Check 55: second open visit rejected';
 end if;
 passed := passed + 1;

 perform public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-update','visit_id',visit_id,'decision','cancelled'));
 boundary_key:=gen_random_uuid();
 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-request','request_key',boundary_key,'preferred_date',tomorrow+179,'time_window','Flexible'));
 visit_id:=(r->>'id')::uuid;
 if (r ? 'id' and (select preferred_date=tomorrow+179 from public.platform_visits where id=(r->>'id')::uuid)) is distinct from true then
  raise exception 'Check 56: day 180 accepted after cancellation';
 end if;
 passed := passed + 1;

 update public.platform_visits set preferred_date=tomorrow-2 where id=visit_id;
 r:=public.platform_interact(jsonb_build_object('project_id',p2,'business_id',b2,'action','visit-update','visit_id',visit_id,'decision','confirmed'));
 if (r->>'error'='invalid' and (select status='requested' from public.platform_visits where id=visit_id)) is distinct from true then
  raise exception 'Check 57: contractor cannot confirm elapsed visit date';
 end if;
 passed := passed + 1;

 perform public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-update','visit_id',visit_id,'decision','cancelled'));

 update public.leads set status='quoted' where id=l1;
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-request','request_key',gen_random_uuid(),'preferred_date',tomorrow,'time_window','Morning'));
 visit_id:=(r->>'id')::uuid;
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'business_id',b1,'action','visit-update','visit_id',visit_id,'decision','confirmed'));
 if (r ? 'id' and (select status='quoted' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 58: confirmation preserves quoted pipeline status';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-update','visit_id',visit_id,'decision','cancelled'));
 if (r ? 'id' and (select status='cancelled' from public.platform_visits where id=visit_id) and (select status='quoted' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 59: cancellation preserves quoted pipeline status';
 end if;
 passed := passed + 1;

 update public.leads set status='won' where id=l1;
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-request','request_key',gen_random_uuid(),'preferred_date',tomorrow,'time_window','Morning'));
 visit_id:=(r->>'id')::uuid;
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'business_id',b1,'action','visit-update','visit_id',visit_id,'decision','confirmed'));
 if (r ? 'id' and (select status='won' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 60: confirmation preserves won pipeline status';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-update','visit_id',visit_id,'decision','cancelled'));
 if (r ? 'id' and (select status='cancelled' from public.platform_visits where id=visit_id) and (select status='won' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 61: cancellation preserves won pipeline status';
 end if;
 passed := passed + 1;

 update public.leads set status='lost' where id=l1;
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-request','request_key',gen_random_uuid(),'preferred_date',tomorrow,'time_window','Morning'));
 visit_id:=(r->>'id')::uuid;
 r:=public.platform_interact(jsonb_build_object('project_id',p1,'business_id',b1,'action','visit-update','visit_id',visit_id,'decision','confirmed'));
 if (r ? 'id' and (select status='lost' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 62: confirmation preserves lost pipeline status';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p1,'access_hash',h1,'action','visit-update','visit_id',visit_id,'decision','cancelled'));
 if (r ? 'id' and (select status='cancelled' from public.platform_visits where id=visit_id) and (select status='lost' from public.leads where id=l1)) is distinct from true then
  raise exception 'Check 63: cancellation preserves lost pipeline status';
 end if;
 passed := passed + 1;

 insert into public.platform_visits(project_id,request_key,preferred_date,time_window,status)
 select p2,gen_random_uuid(),tomorrow,'Flexible','cancelled' from generate_series(1,8);
 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-request','request_key',gen_random_uuid(),'preferred_date',tomorrow-1,'time_window','Flexible'));
 if (r->>'error'='limit' and (select count(*)=10 from public.platform_visits where project_id=p2)) is distinct from true then
  raise exception 'Check 64: eleventh visit rejected even with no open visit';
 end if;
 passed := passed + 1;

 r:=public.platform_interact(jsonb_build_object('project_id',p2,'access_hash',h2,'action','visit-request','request_key',boundary_key,'preferred_date',tomorrow-1,'time_window','Flexible'));
 if (r->>'duplicate'='true' and (select count(*)=10 from public.platform_visits where project_id=p2)) is distinct from true then
  raise exception 'Check 65: existing visit retry allowed at history cap';
 end if;
 passed := passed + 1;

 perform set_config('buzzie.rpc_checks_passed',passed::text,true);
end $$;
select current_setting('buzzie.rpc_checks_passed')::integer as checks_passed,
 'synthetic_only_rollback_required' as scope;
rollback;
-- This final statement runs OUTSIDE the reverted transaction. Each count must be 0.
select
 (select count(*) from public.leads where source='buzzie-rpc-rollback-test') as remaining_fixture_leads,
 (select count(*) from auth.users where email like 'buzzie-rpc-rollback-%@example.invalid') as remaining_fixture_users,
 (select count(*) from public.platform_businesses where slug like 'buzzie-rpc-rollback-%') as remaining_fixture_businesses;

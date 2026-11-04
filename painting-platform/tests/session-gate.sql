-- Isolated pilot only. Synthetic identities; no Auth HTTP or real tokens.
-- REVIEW REQUIRED before execution: previous attempts returned no completed result.
-- Stop if auth triggers exist. Everything below is inside one rolled-back transaction.
begin;
do $$ begin
 assert not exists (select 1 from information_schema.triggers where event_object_schema='auth' and event_object_table in ('users','sessions')),'Review auth trigger side effects';
end $$;
select set_config('buzzie.test_user',gen_random_uuid()::text,true),set_config('buzzie.test_other',gen_random_uuid()::text,true),set_config('buzzie.test_session',gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('buzzie.test_user')::uuid,'buzzie-session-fixture@example.invalid'),(current_setting('buzzie.test_other')::uuid,'buzzie-session-other@example.invalid');
insert into auth.sessions(id,user_id,created_at,updated_at) values(current_setting('buzzie.test_session')::uuid,current_setting('buzzie.test_user')::uuid,now(),now());
set local role service_role;
do $$
declare u uuid:=current_setting('buzzie.test_user')::uuid; s uuid:=current_setting('buzzie.test_session')::uuid; o uuid:=current_setting('buzzie.test_other')::uuid;
begin
 assert public.platform_active_session(u,s),'Active own session denied';
 assert not public.platform_active_session(o,s),'Foreign account accepted';
 assert not public.platform_active_session(u,gen_random_uuid()),'Missing session accepted';
 assert not public.platform_active_session(null,s),'Null user accepted';
 assert not public.platform_active_session(u,null),'Null session accepted';
 assert not has_table_privilege('service_role','auth.sessions','select'),'Broad service auth access';
 assert not has_function_privilege('anon','public.platform_active_session(uuid,uuid)','execute'),'Anonymous execute';
 assert not has_function_privilege('authenticated','public.platform_active_session(uuid,uuid)','execute'),'Authenticated execute';
end $$;
reset role;
update auth.sessions set not_after=now()-interval '1 second' where id=current_setting('buzzie.test_session')::uuid;
set local role service_role;
do $$ begin assert not public.platform_active_session(current_setting('buzzie.test_user')::uuid,current_setting('buzzie.test_session')::uuid),'Expired session accepted';end $$;
reset role;
update auth.sessions set not_after=now()+interval '1 hour' where id=current_setting('buzzie.test_session')::uuid;
set local role service_role;
do $$ begin assert public.platform_active_session(current_setting('buzzie.test_user')::uuid,current_setting('buzzie.test_session')::uuid),'Future expiry denied';end $$;
reset role;
delete from auth.sessions where id=current_setting('buzzie.test_session')::uuid;
set local role service_role;
do $$ begin assert not public.platform_active_session(current_setting('buzzie.test_user')::uuid,current_setting('buzzie.test_session')::uuid),'Removed session accepted';end $$;
reset role;
rollback;
select '11 active-session assertions completed and transaction rolled back' as verification;

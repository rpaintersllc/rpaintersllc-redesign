-- Run only in the isolated development project. All test inserts roll back.
begin;
do $$
declare p jsonb; result jsonb; i int;
begin
 p=jsonb_build_object('request_key',gen_random_uuid(),'full_name','MVP TEST ONLY','email','mvp-test@example.invalid','phone','8435550199','city','Summerville','zip','29483','service','Interior painting','details','Disposable transaction test, no actual customer.');
 result=public.submit_lead_safe(p);
 if result->>'id' is null then raise exception 'First insert failed'; end if;
 result=public.submit_lead_safe(p);
 if result->>'duplicate' is distinct from 'true' then raise exception 'Duplicate guard failed'; end if;
 for i in 1..2 loop
 p=jsonb_set(p,'{request_key}',to_jsonb(gen_random_uuid()));perform public.submit_lead_safe(p);
 end loop;
 p=jsonb_set(p,'{request_key}',to_jsonb(gen_random_uuid()));result=public.submit_lead_safe(p);
 if result->>'throttled' is distinct from 'true' then raise exception 'Throttle failed'; end if;
 if has_function_privilege('anon','public.submit_lead_safe(jsonb)','execute') or has_function_privilege('authenticated','public.submit_lead_safe(jsonb)','execute') then raise exception 'RPC exposed'; end if;
end $$;
rollback;
select 'PASS: insert, duplicate, throttle and RPC permissions; test data rolled back' as result;

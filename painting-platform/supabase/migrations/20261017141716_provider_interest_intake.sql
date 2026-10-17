begin;
create or replace function public.platform_record_provider_interest(payload jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(72642201);
 if exists(select 1 from public.platform_provider_interest where email=payload->>'email' and state=payload->>'state' and city=payload->>'city') then return jsonb_build_object('ok',true,'duplicate',true);end if;
 if (select count(*) from public.platform_provider_interest where created_at>now()-interval '24 hours')>=30 then return jsonb_build_object('error','rate_limited');end if;
 insert into public.platform_provider_interest(business_name,email,state,city,website) values(payload->>'business_name',payload->>'email',payload->>'state',payload->>'city',nullif(payload->>'website',''));
 return jsonb_build_object('ok',true,'duplicate',false);
end $$;
revoke all on function public.platform_record_provider_interest(jsonb) from public,anon,authenticated;
grant execute on function public.platform_record_provider_interest(jsonb) to service_role;
commit;

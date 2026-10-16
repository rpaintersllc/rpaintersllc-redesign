begin;
-- Serialize intake to keep throttles and idempotency atomic across all function instances.
create or replace function public.submit_lead_safe(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare existing uuid; new_id uuid;
begin
 perform pg_advisory_xact_lock(72642192);
 select id into existing from public.leads where request_key=(payload->>'request_key')::uuid;
 if existing is not null then return jsonb_build_object('duplicate',true); end if;
 if (select count(*) from public.leads where created_at>now()-interval '1 hour')>=100
 or (select count(*) from public.leads where created_at>now()-interval '1 hour' and (phone=payload->>'phone' or lower(email)=lower(payload->>'email')))>=3
 then return jsonb_build_object('throttled',true); end if;
 insert into public.leads(request_key,full_name,email,phone,city,zip,service,details,consent_at,source,utm_source,utm_campaign)
 values((payload->>'request_key')::uuid,payload->>'full_name',payload->>'email',payload->>'phone',payload->>'city',payload->>'zip',payload->>'service',payload->>'details',now(),'website',nullif(payload->>'utm_source',''),nullif(payload->>'utm_campaign','')) returning id into new_id;
 return jsonb_build_object('id',new_id,'duplicate',false);
end $$;
revoke all on function public.submit_lead_safe(jsonb) from public, anon, authenticated;
grant execute on function public.submit_lead_safe(jsonb) to service_role;
commit;

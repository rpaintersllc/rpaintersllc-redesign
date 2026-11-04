-- Isolated development database only. All test records and job changes roll back.
begin;
do $$
declare lead uuid; job jsonb; notification uuid; token uuid; result boolean;
begin
 insert into public.leads(request_key,full_name,email,phone,city,zip,service,details,consent_at)
 values(gen_random_uuid(),'NOTIFICATION QUEUE TEST','notification-test@example.invalid','8435550198','Summerville','29483','Interior painting','Disposable notification transaction test.',now()) returning id into lead;
 if (select count(*) from public.lead_notifications where lead_id=lead)<>1 then raise exception 'Atomic enqueue failed';end if;
 update public.lead_notifications set created_at='2000-01-01' where lead_id=lead returning id into notification;
 job=public.claim_lead_notification();
 if (job->>'id')::uuid<>notification then raise exception 'Claim failed';end if;
 token=(job->>'lease_token')::uuid;
 if (public.claim_lead_notification()->>'id')::uuid=notification then raise exception 'Active lease claimed twice';end if;
 result=public.finish_lead_notification(notification,gen_random_uuid(),true,'test-provider-id');
 if result then raise exception 'Stale worker was allowed to finish';end if;
 result=public.finish_lead_notification(notification,token,false,null,'provider_http_429');
 if not result or (select status from public.lead_notifications where id=notification)<>'pending' then raise exception 'Retry was not queued';end if;
 update public.lead_notifications set next_attempt_at=now()-interval '1 second' where id=notification;
 job=public.claim_lead_notification();token=(job->>'lease_token')::uuid;
 if (job->>'id')::uuid<>notification then raise exception 'Retry claim failed';end if;
 result=public.finish_lead_notification(notification,token,true,'test-provider-id');
 if not result or (select status from public.lead_notifications where id=notification)<>'accepted' then raise exception 'Accepted result not recorded';end if;
 if has_table_privilege('anon','public.lead_notifications','SELECT,INSERT,UPDATE,DELETE') or has_function_privilege('authenticated','public.claim_lead_notification()','EXECUTE') then raise exception 'Queue exposed';end if;
end $$;
rollback;
select 'PASS: atomic enqueue, exclusive leases, retry, completion and access restrictions; rolled back' as result;

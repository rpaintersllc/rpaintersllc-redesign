begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Supabase Vault is provisioned by the hosted platform. No key literals belong in this migration.
revoke all on vault.decrypted_secrets from public,anon,authenticated;
revoke all on net.http_request_queue from public,anon,authenticated;
create or replace function public.run_lead_notification_retry() returns bigint
language plpgsql security definer set search_path=public,pg_temp as $$
declare token text; request_id bigint;
begin
 if not exists(select 1 from public.lead_notifications where
  (status='pending' and next_attempt_at<=now()) or (status='processing' and lease_until<now())) then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='lead_engine_retry_worker_key';
 if token is null then raise exception 'Retry authorization is not configured';end if;
 select net.http_post(
  url:='https://ocmgrgvzhuhyigaddhue.supabase.co/functions/v1/notify-leads',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
  body:='{}'::jsonb,timeout_milliseconds:=30000
 ) into request_id;
 return request_id;
end $$;
create or replace function public.configure_lead_notification_schedule(worker_key text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare secret_id uuid; current_key text; cron_id bigint;
begin
 if worker_key is null or length(worker_key)<20 then raise exception 'Invalid worker authorization';end if;
 perform pg_advisory_xact_lock(72642193);
 select id,decrypted_secret into secret_id,current_key from vault.decrypted_secrets where name='lead_engine_retry_worker_key';
 if secret_id is null then
  perform vault.create_secret(worker_key,'lead_engine_retry_worker_key','Internal notification retry authorization; never expose to clients');
 elsif current_key is distinct from worker_key then
  perform vault.update_secret(secret_id,worker_key);
 end if;
 select jobid into cron_id from cron.job where jobname='lead-engine-notification-retry';
 if cron_id is null then
  select cron.schedule('lead-engine-notification-retry','*/5 * * * *','select public.run_lead_notification_retry();') into cron_id;
 end if;
 return jsonb_build_object('job_id',cron_id,'configured',true);
end $$;
revoke all on function public.run_lead_notification_retry() from public,anon,authenticated,service_role;
revoke all on function public.configure_lead_notification_schedule(text) from public,anon,authenticated;
grant execute on function public.configure_lead_notification_schedule(text) to service_role;
commit;

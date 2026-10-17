begin;
create table if not exists public.discovery_sources (
 id text primary key,
 name text not null,
 adapter text not null check(adapter in ('civic_bids','google_alerts')),
 kind text not null check(kind in ('commercial_bid','homeowner_request')),
 source_url text not null unique,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.discovery_sources enable row level security;
revoke all on public.discovery_sources from public,anon,authenticated;
grant select,insert,update on public.discovery_sources to service_role;
insert into public.discovery_sources(id,name,adapter,kind,source_url)
values('charleston-open-bids','City of Charleston open bids','civic_bids','commercial_bid','https://www.charleston-sc.gov/Bids.aspx')
on conflict(id) do nothing;
alter table public.discovery_scans add column if not exists error_code text;
create table if not exists public.discovery_runtime (
 singleton boolean primary key default true check(singleton),
 last_started_at timestamptz,
 lease_until timestamptz,
 lease_token uuid
);
insert into public.discovery_runtime(singleton) values(true) on conflict do nothing;
alter table public.discovery_runtime enable row level security;
revoke all on public.discovery_runtime from public,anon,authenticated;
create or replace function public.claim_discovery_scan(force_run boolean default false) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare token uuid;
begin
 update public.discovery_runtime set last_started_at=now(),lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid()
 where singleton and (lease_until is null or lease_until<now())
 and (force_run or last_started_at is null or last_started_at<now()-interval '14 minutes')
 returning lease_token into token;
 return token;
end $$;
create or replace function public.finish_discovery_scan(claim_token uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin update public.discovery_runtime set lease_until=null,lease_token=null where singleton and lease_token=claim_token;end $$;
revoke all on function public.claim_discovery_scan(boolean) from public,anon,authenticated;
revoke all on function public.finish_discovery_scan(uuid) from public,anon,authenticated;
grant execute on function public.claim_discovery_scan(boolean) to service_role;
grant execute on function public.finish_discovery_scan(uuid) to service_role;
-- Reuse existing internal authorization already encrypted in this same project.
-- Neither this migration nor its result exposes a credential to the client.
create or replace function public.run_discovery_scan(force_run boolean default false) returns bigint
language plpgsql security definer set search_path=public,pg_temp as $$
declare token text;request_id bigint;
begin
 select decrypted_secret into token from vault.decrypted_secrets where name='lead_engine_retry_worker_key';
 if token is null then raise exception 'Internal worker authorization is not configured';end if;
 select net.http_post(
  url:='https://ocmgrgvzhuhyigaddhue.supabase.co/functions/v1/discover-opportunities',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
  body:=jsonb_build_object('force_run',force_run),timeout_milliseconds:=60000) into request_id;
 return request_id;
end $$;
revoke all on function public.run_discovery_scan(boolean) from public,anon,authenticated,service_role;
create or replace function public.run_opportunity_notification_retry() returns bigint
language plpgsql security definer set search_path=public,pg_temp as $$
declare token text;request_id bigint;
begin
 if not exists(select 1 from public.opportunity_notifications where
 (status='pending' and next_attempt_at<=now()) or (status='processing' and lease_until<now())) then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='lead_engine_retry_worker_key';
 if token is null then raise exception 'Internal worker authorization is not configured';end if;
 select net.http_post(url:='https://ocmgrgvzhuhyigaddhue.supabase.co/functions/v1/notify-opportunities',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{}'::jsonb,timeout_milliseconds:=30000) into request_id;
 return request_id;
end $$;
revoke all on function public.run_opportunity_notification_retry() from public,anon,authenticated,service_role;
-- Apply after migration 007 and deploy both discovery functions before activation.
do $$ begin
 if not exists(select 1 from cron.job where jobname='lead-engine-discovery-scan') then
  perform cron.schedule('lead-engine-discovery-scan','*/15 * * * *','select public.run_discovery_scan();');
 end if;
 if not exists(select 1 from cron.job where jobname='lead-engine-opportunity-alert-retry') then
  perform cron.schedule('lead-engine-opportunity-alert-retry','*/5 * * * *','select public.run_opportunity_notification_retry();');
 end if;
end $$;
commit;

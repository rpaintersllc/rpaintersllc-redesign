begin;
create table if not exists public.opportunity_notifications (
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null unique references public.opportunities(id) on delete cascade,
 created_at timestamptz not null default now(),
 status text not null default 'pending' check (status in ('pending','processing','accepted','failed')),
 attempts integer not null default 0 check (attempts between 0 and 8),
 next_attempt_at timestamptz not null default now(),
 first_attempt_at timestamptz,
 lease_until timestamptz,
 lease_token uuid,
 provider_id text,
 last_error text,
 accepted_at timestamptz
);
alter table public.opportunity_notifications enable row level security;
revoke all on public.opportunity_notifications from public, anon, authenticated;
create index if not exists opportunity_notifications_due on public.opportunity_notifications(next_attempt_at) where status in ('pending','processing');
create or replace function public.enqueue_opportunity_notification() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.opportunity_notifications(opportunity_id) values(new.id) on conflict(opportunity_id) do nothing;
 return new;
end $$;
revoke all on function public.enqueue_opportunity_notification() from public,anon,authenticated;
drop trigger if exists enqueue_opportunity_notification on public.opportunities;
create trigger enqueue_opportunity_notification after insert on public.opportunities for each row execute function public.enqueue_opportunity_notification();
-- Claim one job atomically. Never retry beyond the provider's 24-hour idempotency window.
create or replace function public.claim_opportunity_notification() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare job public.opportunity_notifications;
begin
 update public.opportunity_notifications set status='failed',last_error='retry_window_expired'
 where status in ('pending','processing') and (lease_until is null or lease_until<now())
 and (attempts>=8 or first_attempt_at<now()-interval '12 hours');
 select * into job from public.opportunity_notifications
 where ((status='pending' and next_attempt_at<=now()) or (status='processing' and lease_until<now()))
 and attempts<8 order by created_at for update skip locked limit 1;
 if not found then return null; end if;
 update public.opportunity_notifications set status='processing',attempts=attempts+1,
 first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid()
 where id=job.id returning * into job;
 return jsonb_build_object('id',job.id,'opportunity_id',job.opportunity_id,'lease_token',job.lease_token);
end $$;
create or replace function public.finish_opportunity_notification(job_id uuid,claim_token uuid,accepted boolean,provider_reference text default null,error_code text default null,permanent_failure boolean default false) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.opportunity_notifications set
 status=case when accepted then 'accepted' when permanent_failure or attempts>=8 then 'failed' else 'pending' end,
 provider_id=case when accepted then left(provider_reference,200) else provider_id end,
 accepted_at=case when accepted then now() else accepted_at end,
 last_error=case when accepted then null else left(error_code,100) end,
 next_attempt_at=now()+make_interval(secs=>least(3600,(60*power(2,attempts-1))::integer)),
 lease_until=null,lease_token=null
 where id=job_id and lease_token=claim_token and status='processing';
 return found;
end $$;
revoke all on function public.claim_opportunity_notification() from public,anon,authenticated;
revoke all on function public.finish_opportunity_notification(uuid,uuid,boolean,text,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_opportunity_notification() to service_role;
grant execute on function public.finish_opportunity_notification(uuid,uuid,boolean,text,text,boolean) to service_role;
commit;


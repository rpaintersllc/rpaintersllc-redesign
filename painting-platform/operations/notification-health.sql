-- Owner/operator only. No claims, dispatch, writes, secrets or customer content.
begin transaction read only;
set local statement_timeout = '5s';
with queue_rows as (
  select case when p.lead_id is null then 'direct_intake' else 'buzzie_projects' end as channel,
    n.status,n.attempts,n.next_attempt_at,n.first_attempt_at,n.lease_until,n.accepted_at,n.created_at
  from public.lead_notifications n
  left join public.platform_projects p on p.lead_id=n.lead_id
  union all
  select 'external_discovery',status,attempts,next_attempt_at,first_attempt_at,lease_until,accepted_at,created_at
  from public.opportunity_notifications
), classified as (
  select *,
    (attempts>=8 or first_attempt_at<now()-interval '12 hours') as exhausted,
    (lease_until is null or lease_until<now()) as unlocked,
    ((status='pending' and next_attempt_at<=now()) or
      (status='processing' and lease_until<now())) as due
  from queue_rows
)
select c.channel,now() as observed_at,
  count(q.status) as total,
  count(*) filter(where status='pending') as pending,
  count(*) filter(where status='processing') as processing,
  count(*) filter(where status='accepted') as provider_accepted,
  count(*) filter(where status='failed') as failed,
  count(*) filter(where due and not coalesce(exhausted,false)) as due_retryable,
  count(*) filter(where status in ('pending','processing') and unlocked and exhausted) as exhausted_unsettled,
  count(*) filter(where status='processing' and lease_until<now()) as expired_leases,
  count(*) filter(where status='processing' and lease_until is null) as missing_leases,
  min(created_at) filter(where due and not coalesce(exhausted,false)) as oldest_due_created_at,
  max(accepted_at) filter(where status='accepted') as last_provider_acceptance
from (values ('buzzie_projects'),('direct_intake'),('external_discovery')) c(channel)
left join classified q on q.channel=c.channel
group by c.channel order by c.channel;
rollback;

// Print a read-only SQL regression query; does not connect to any service.
// Uses the exact report SELECTs with synthetic CTE relations, never INSERTs.
import {readFileSync} from 'node:fs';
function report(name){
  return readFileSync(new URL(name,import.meta.url),'utf8')
    .replace(/^[\s\S]*?set local statement_timeout = '5s';/,'')
    .replace(/;\s*rollback;\s*$/,'');
}
const queue=report('notification-health.sql')
  .replaceAll('public.lead_notifications','fixture_leads')
  .replaceAll('public.platform_projects','fixture_projects')
  .replaceAll('public.opportunity_notifications','fixture_opportunities');
const schedule=report('notification-schedules.sql')
  .replaceAll('cron.job_run_details','fixture_runs').replaceAll('cron.job','fixture_jobs');
console.log(`begin transaction read only;
set local statement_timeout = '5s';
with fixture_leads(lead_id,status,attempts,next_attempt_at,first_attempt_at,lease_until,accepted_at,created_at) as (
 values
 (1,'pending',0,now(),null::timestamptz,null::timestamptz,null::timestamptz,now()),
 (2,'pending',1,now()+interval '1 hour',now(),null,null,now()),
 (3,'pending',8,now(),now(),null,null,now()),
 (4,'pending',1,now(),now()-interval '12 hours 1 second',null,null,now()),
 (5,'processing',1,now(),now(),now()-interval '1 second',null,now()),
 (6,'processing',1,now(),now(),now()+interval '1 minute',null,now()),
 (7,'processing',1,now(),now(),null,null,now()),
 (8,'accepted',1,now(),now(),null,now(),now()),
 (9,'failed',8,now(),now(),null,null,now()),
 (10,'pending',1,now(),now()-interval '12 hours',null,null,now()),
 (11,'processing',1,now(),now(),now(),null,now()),
 (12,'failed',1,now(),now(),null,null,now())
), fixture_projects(lead_id) as (values (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11)),
fixture_opportunities as (select * from fixture_leads where lead_id=8),
queue_report as (${queue}),
empty_leads as (select * from fixture_leads where false),
empty_projects as (select * from fixture_projects where false),
empty_opportunities as (select * from fixture_opportunities where false),
empty_queue_report as (${queue.replaceAll('fixture_leads','empty_leads').replaceAll('fixture_projects','empty_projects').replaceAll('fixture_opportunities','empty_opportunities')}),
fixture_jobs(jobid,jobname,active) as (values (1,'lead-engine-notification-retry',true)),
fixture_runs(jobid,runid,status,start_time,end_time) as (
 values (1,1,'succeeded',now(),now()),(1,2,'failed',now(),now()),
 (1,3,'succeeded',now()-interval '25 hours',now()-interval '25 hours')
), schedule_report as (${schedule})
select
 (select total=11 and pending=5 and processing=4 and provider_accepted=1 and failed=1
   and due_retryable=3 and exhausted_unsettled=2 and expired_leases=1 and missing_leases=1
   from queue_report where channel='buzzie_projects') as queue_boundaries_pass,
 (select total=1 and failed=1 and provider_accepted=0 from queue_report where channel='direct_intake')
   and (select total=1 and provider_accepted=1 and failed=0 from queue_report where channel='external_discovery') as channel_isolation_pass,
 (select count(*)=3 and bool_and(total=0 and due_retryable=0 and oldest_due_created_at is null)
   from empty_queue_report) as empty_channels_pass,
 (select configured and active and starts_last_24h=2 and sql_succeeded_last_24h=1 and sql_failed_last_24h=1
   from schedule_report where jobname='lead-engine-notification-retry') as schedule_window_pass,
 (select not configured and not active and starts_last_24h=0 and last_start is null
   from schedule_report where jobname='lead-engine-opportunity-alert-retry') as missing_schedule_pass;
rollback;`);

-- SQL scheduler health only: success does not prove an HTTP worker or email succeeded.
begin transaction read only;
set local statement_timeout = '5s';
select expected.jobname,now() as observed_at,
  j.jobid is not null as configured,coalesce(j.active,false) as active,
  count(r.runid) as starts_last_24h,
  count(*) filter(where r.status='succeeded') as sql_succeeded_last_24h,
  count(*) filter(where r.status='failed') as sql_failed_last_24h,
  max(r.start_time) as last_start,
  max(r.end_time) filter(where r.status='succeeded') as last_sql_success
from (values ('lead-engine-notification-retry'),('lead-engine-opportunity-alert-retry')) expected(jobname)
left join cron.job j on j.jobname=expected.jobname
left join cron.job_run_details r on r.jobid=j.jobid and r.start_time>=now()-interval '24 hours'
group by expected.jobname,j.jobid,j.active order by expected.jobname;
rollback;

-- Operator metadata report only. No customer records, function bodies or writes.
begin transaction read only;
set local statement_timeout='5s';
with table_access as (
 select c.relname as relation,c.relrowsecurity as rls_enabled,
  has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') as anon_any_crud,
  has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') as authenticated_any_crud
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in
  ('platform_projects','platform_photos','platform_messages','platform_visits','platform_project_reviews','platform_business_members')
), expected(name) as (values ('platform_claim_project'),('platform_reserve_photo'),('platform_interact'),('platform_save_review'),('platform_set_availability'),('platform_set_status'),('platform_create_project')),
function_access as (
 select e.name as function_name,count(p.oid) as overloads,
  coalesce(bool_or(has_function_privilege('anon',p.oid,'EXECUTE')),false) as anon_any_execute,
  coalesce(bool_or(has_function_privilege('authenticated',p.oid,'EXECUTE')),false) as authenticated_any_execute
 from expected e left join pg_namespace n on n.nspname='public'
 left join pg_proc p on p.pronamespace=n.oid and p.proname=e.name and p.prokind='f'
 group by e.name
)
select now() as observed_at,
 (select jsonb_agg(to_jsonb(t) order by relation) from table_access t) as private_tables,
 (select jsonb_agg(to_jsonb(f) order by function_name) from function_access f) as server_functions;
rollback;

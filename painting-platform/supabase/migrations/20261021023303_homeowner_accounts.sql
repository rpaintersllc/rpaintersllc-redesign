begin;
alter table public.platform_projects add column owner_user_id uuid references auth.users(id) on delete set null;
create index platform_projects_owner_time on public.platform_projects(owner_user_id,created_at desc) where owner_user_id is not null;
create function public.platform_claim_project(project uuid,access_key_hash text,account_id uuid) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.platform_projects;
begin
 select * into p from public.platform_projects where id=project for update;
 if not found or p.access_hash<>access_key_hash or (p.owner_user_id is not null and p.owner_user_id<>account_id) then return false;end if;
 if not exists(select 1 from auth.users u join public.leads l on l.id=p.lead_id
  where u.id=account_id and u.email_confirmed_at is not null and lower(u.email)=lower(l.email)) then return false;end if;
 update public.platform_projects set owner_user_id=account_id where id=p.id;
 return true;
end $$;
revoke all on function public.platform_claim_project(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.platform_claim_project(uuid,text,uuid) to service_role;
commit;

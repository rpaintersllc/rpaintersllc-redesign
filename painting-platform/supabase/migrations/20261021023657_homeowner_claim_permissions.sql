-- A narrow server-only function needs to verify auth.users, which service_role
-- cannot SELECT directly. No table access is granted to clients or service_role.
alter function public.platform_claim_project(uuid,text,uuid) security definer;
revoke all on function public.platform_claim_project(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.platform_claim_project(uuid,text,uuid) to service_role;

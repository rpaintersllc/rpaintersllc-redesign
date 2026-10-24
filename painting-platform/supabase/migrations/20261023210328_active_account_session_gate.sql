-- Narrow server-only session lookup. Do not grant auth.sessions table access.
-- The API must verify the bearer with Supabase Auth before calling this RPC.
create or replace function public.platform_active_session(account_id uuid, session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
 select exists (
  select 1 from auth.sessions s
  where s.id = session and s.user_id = account_id
   and (s.not_after is null or s.not_after > now())
 );
$$;
revoke all on function public.platform_active_session(uuid,uuid) from public, anon, authenticated;
grant execute on function public.platform_active_session(uuid,uuid) to service_role;
comment on function public.platform_active_session(uuid,uuid) is
 'Server-only boolean session ownership/existence check after Supabase Auth verifies the JWT. Does not expose auth rows or enforce inactivity configuration.';

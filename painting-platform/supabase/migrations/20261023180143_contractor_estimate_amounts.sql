begin;
create table public.platform_project_estimates (
 project_id uuid primary key references public.platform_projects(id),
 business_id uuid not null references public.platform_businesses(id),
 amount_cents bigint not null check(amount_cents between 1 and 999999999),
 currency text not null default 'USD' check(currency='USD'),
 revision integer not null check(revision>0),
 updated_at timestamptz not null default now(),
 updated_by uuid not null references auth.users(id)
);
create index platform_project_estimates_business on public.platform_project_estimates(business_id);
alter table public.platform_project_estimates enable row level security;
revoke all on public.platform_project_estimates from public,anon,authenticated;
grant all on public.platform_project_estimates to service_role;

create function public.platform_save_estimate(project uuid,business uuid,actor uuid,expected_revision integer,amount_value bigint) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous public.platform_project_estimates; saved public.platform_project_estimates;
begin
 if not exists(select 1 from public.platform_business_members where business_id=business and user_id=actor) then return jsonb_build_object('error','forbidden');end if;
 perform 1 from public.platform_projects where id=project and business_id=business for update;
 if not found then return jsonb_build_object('error','not_found');end if;
 if expected_revision is null or expected_revision<0 or expected_revision>=2147483647 or amount_value is null or amount_value not between 1 and 999999999 then return jsonb_build_object('error','invalid');end if;
 select * into previous from public.platform_project_estimates where project_id=project;
 if found and previous.business_id<>business then return jsonb_build_object('error','forbidden');end if;
 if coalesce(previous.revision,0)<>expected_revision then return jsonb_build_object('error','conflict');end if;
 insert into public.platform_project_estimates(project_id,business_id,amount_cents,revision,updated_by)
 values(project,business,amount_value,expected_revision+1,actor)
 on conflict(project_id) do update set amount_cents=excluded.amount_cents,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now()
 returning * into saved;
 return jsonb_build_object('amount_cents',saved.amount_cents,'currency',saved.currency,'revision',saved.revision,'updated_at',saved.updated_at);
end $$;
revoke all on function public.platform_save_estimate(uuid,uuid,uuid,integer,bigint) from public,anon,authenticated;
grant execute on function public.platform_save_estimate(uuid,uuid,uuid,integer,bigint) to service_role;
commit;

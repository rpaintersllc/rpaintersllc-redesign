begin;
create table public.platform_messages (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.platform_projects(id),
 request_key uuid not null,author text not null check(author in ('homeowner','business')),
 body text not null check(length(body) between 1 and 2000),created_at timestamptz not null default now(),
 unique(project_id,request_key)
);
create index platform_messages_project_time on public.platform_messages(project_id,created_at desc);
create table public.platform_visits (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.platform_projects(id),
 request_key uuid not null,preferred_date date not null,
 time_window text not null check(time_window in ('Morning','Afternoon','Flexible')),
 status text not null default 'requested' check(status in ('requested','confirmed','declined','cancelled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(project_id,request_key)
);
create index platform_visits_project_time on public.platform_visits(project_id,created_at desc);
create unique index platform_visits_one_open on public.platform_visits(project_id) where status in ('requested','confirmed');
alter table public.platform_messages enable row level security;
alter table public.platform_visits enable row level security;
revoke all on public.platform_messages,public.platform_visits from public,anon,authenticated;
grant all on public.platform_messages,public.platform_visits to service_role;

-- Server-only invoker RPC: Edge validates business membership, then this function
-- rechecks project scope/capability inside the same locked transaction as writes.
create function public.platform_interact(payload jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.platform_projects; side text; prior public.platform_messages;
 v public.platform_visits; mid uuid; d date; today date := (now() at time zone 'America/New_York')::date;
begin
 select * into p from public.platform_projects where id=(payload->>'project_id')::uuid for update;
 if not found then return jsonb_build_object('error','not_found');end if;
 if nullif(payload->>'business_id','') is not null then
  if p.business_id<>(payload->>'business_id')::uuid then return jsonb_build_object('error','not_found');end if;
  side:='business';
 else
  if p.access_hash is distinct from payload->>'access_hash' then return jsonb_build_object('error','not_found');end if;
  side:='homeowner';
 end if;
 if payload->>'action'='message' then
  if length(trim(payload->>'body')) not between 1 and 2000 or payload->>'body' is null then return jsonb_build_object('error','invalid');end if;
  select * into prior from public.platform_messages where project_id=p.id and request_key=(payload->>'request_key')::uuid;
  if found then
   if prior.author=side and prior.body=trim(payload->>'body') then return jsonb_build_object('id',prior.id,'duplicate',true);end if;
   return jsonb_build_object('error','conflict');
  end if;
  if (select count(*) from public.platform_messages where project_id=p.id)>=500
   or (select count(*) from public.platform_messages where project_id=p.id and author=side and created_at>now()-interval '24 hours')>=40
   then return jsonb_build_object('error','limit');end if;
  insert into public.platform_messages(project_id,request_key,author,body)
  values(p.id,(payload->>'request_key')::uuid,side,trim(payload->>'body')) returning id into mid;
  return jsonb_build_object('id',mid);
 elsif payload->>'action'='visit-request' then
  if side<>'homeowner' then return jsonb_build_object('error','forbidden');end if;
  select * into v from public.platform_visits where project_id=p.id and request_key=(payload->>'request_key')::uuid;
  if found then return jsonb_build_object('id',v.id,'duplicate',true);end if;
  d:=(payload->>'preferred_date')::date;
  if d is null or d<today or d>today+180 or payload->>'time_window' not in ('Morning','Afternoon','Flexible') or payload->>'time_window' is null then return jsonb_build_object('error','invalid');end if;
  if exists(select 1 from public.platform_visits where project_id=p.id and status in ('requested','confirmed')) then return jsonb_build_object('error','open_visit');end if;
  if (select count(*) from public.platform_visits where project_id=p.id)>=10 then return jsonb_build_object('error','limit');end if;
  insert into public.platform_visits(project_id,request_key,preferred_date,time_window)
  values(p.id,(payload->>'request_key')::uuid,d,payload->>'time_window') returning id into mid;
  return jsonb_build_object('id',mid);
 elsif payload->>'action'='visit-update' then
  select * into v from public.platform_visits where id=(payload->>'visit_id')::uuid and project_id=p.id for update;
  if not found then return jsonb_build_object('error','not_found');end if;
  if (side='homeowner' and payload->>'decision'<>'cancelled') or (side='business' and payload->>'decision' not in ('confirmed','declined')) or payload->>'decision' is null then return jsonb_build_object('error','forbidden');end if;
  if v.status=payload->>'decision' then return jsonb_build_object('id',v.id,'duplicate',true);end if;
  if v.status not in ('requested','confirmed') or (side='business' and v.status<>'requested') then return jsonb_build_object('error','conflict');end if;
  if payload->>'decision'='confirmed' and v.preferred_date<today then return jsonb_build_object('error','invalid');end if;
  update public.platform_visits set status=payload->>'decision',updated_at=now() where id=v.id;
  -- A confirmed visit advances the early pipeline, but never reverses quoted/won/lost.
  if payload->>'decision'='confirmed' then
   update public.leads set status='visit_scheduled' where id=p.lead_id and status in ('new','contacted');
  end if;
  return jsonb_build_object('id',v.id);
 end if;
 return jsonb_build_object('error','invalid');
end $$;
revoke all on function public.platform_interact(jsonb) from public,anon,authenticated;
grant execute on function public.platform_interact(jsonb) to service_role;
commit;

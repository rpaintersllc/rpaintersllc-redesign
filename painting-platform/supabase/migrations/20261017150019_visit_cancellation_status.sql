create or replace function public.platform_interact(payload jsonb) returns jsonb
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
  if payload->>'decision'='cancelled' and v.status='confirmed' then
   update public.leads set status='contacted' where id=p.lead_id and status='visit_scheduled';
  end if;
  return jsonb_build_object('id',v.id);
 end if;
 return jsonb_build_object('error','invalid');
end $$;

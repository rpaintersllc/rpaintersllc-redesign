begin;
set local lock_timeout='2s';
create table public.buzzie_opportunity_reviews(
 opportunity_id uuid primary key references public.opportunities(id),
 state text not null check(state in ('new','review','approved','dismissed')),
 revision integer not null check(revision>0),assessment jsonb not null,
 updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now()
);
create table public.buzzie_crm_outbox(
 opportunity_id uuid primary key references public.opportunities(id),
 reference text not null unique,payload jsonb not null,
 status text not null check(status in ('sending','failed','sent')),
 attempts integer not null default 0,lease_token uuid,lease_until timestamptz,
 retry_after timestamptz,crm_lead_id uuid,last_result text,
 approved_revision integer not null,authorized_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),sent_at timestamptz
);
create table public.buzzie_crm_attempts(
 id uuid primary key default gen_random_uuid(),opportunity_id uuid not null references public.opportunities(id),
 attempt integer not null,started_at timestamptz not null default now(),finished_at timestamptz,result text not null default 'started',unique(opportunity_id,attempt)
);
create table public.buzzie_opportunity_history(
 id bigint generated always as identity primary key,opportunity_id uuid not null references public.opportunities(id),
 revision integer not null,state text not null,assessment jsonb not null,actor uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(opportunity_id,revision)
);
create table public.buzzie_crm_config(singleton boolean primary key default true check(singleton),manual_enabled boolean not null default false);
insert into public.buzzie_crm_config(singleton) values(true);
do $$ declare t text;begin foreach t in array array['buzzie_opportunity_reviews','buzzie_crm_outbox','buzzie_crm_attempts','buzzie_opportunity_history','buzzie_crm_config'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update on public.%I to service_role',t);
end loop;end $$;
grant usage,select on sequence public.buzzie_opportunity_history_id_seq to service_role;
create function public.buzzie_review_opportunity(opportunity uuid,actor uuid,expected integer,state_value text,data jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved public.buzzie_opportunity_reviews;current_rev integer;
begin
 if not exists(select 1 from public.platform_business_members m join public.platform_businesses b on b.id=m.business_id where m.user_id=actor and m.role='owner' and b.slug='r-painters-llc') then return jsonb_build_object('error','forbidden');end if;
 perform 1 from public.opportunities where id=opportunity for update;if not found then return jsonb_build_object('error','not_found');end if;
 if exists(select 1 from public.buzzie_crm_outbox where opportunity_id=opportunity) then return jsonb_build_object('error','frozen');end if;
 select revision into current_rev from public.buzzie_opportunity_reviews where opportunity_id=opportunity;
 if expected is null or expected<0 or expected>=2147483647 or coalesce(current_rev,0)<>expected then return jsonb_build_object('error','conflict');end if;
 if state_value not in ('new','review','approved','dismissed') or state_value is null or jsonb_typeof(data) is distinct from 'object' then return jsonb_build_object('error','invalid');end if;
 if state_value='approved' and (not coalesce(data @> '{"original_checked":true,"use_allowed":true,"hiring_intent":true,"open_confirmed":true}',false) or length(coalesce(data->>'reason',''))<10 or nullif(data->>'published_at','') is null or data->>'relationship' not in ('direct','subcontract') or data->>'priority' not in ('high','medium','low')) then return jsonb_build_object('error','invalid');end if;
 insert into public.buzzie_opportunity_reviews(opportunity_id,state,revision,assessment,updated_by) values(opportunity,state_value,expected+1,data,actor)
 on conflict(opportunity_id) do update set state=excluded.state,revision=excluded.revision,assessment=excluded.assessment,updated_by=excluded.updated_by,updated_at=now() returning * into saved;
 insert into public.buzzie_opportunity_history(opportunity_id,revision,state,assessment,actor) values(opportunity,saved.revision,state_value,data,actor);
 return to_jsonb(saved);
end $$;
create function public.buzzie_claim_crm(opportunity uuid,actor uuid,expected integer) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.buzzie_opportunity_reviews;o public.opportunities;q public.buzzie_crm_outbox;token uuid:=gen_random_uuid();payload jsonb;published timestamptz;deadline timestamptz;
begin
 if not exists(select 1 from public.platform_business_members m join public.platform_businesses b on b.id=m.business_id where m.user_id=actor and m.role='owner' and b.slug='r-painters-llc') then return jsonb_build_object('error','forbidden');end if;
 if not coalesce((select manual_enabled from public.buzzie_crm_config where singleton),false) then return jsonb_build_object('error','not_configured');end if;
 select * into o from public.opportunities where id=opportunity for update;if not found then return jsonb_build_object('error','not_found');end if;
 select * into r from public.buzzie_opportunity_reviews where opportunity_id=opportunity;
 if r.state is distinct from 'approved' or r.revision is distinct from expected then return jsonb_build_object('error','not_approved');end if;
 if not coalesce(r.assessment @> '{"original_checked":true,"use_allowed":true,"hiring_intent":true,"open_confirmed":true}',false) then return jsonb_build_object('error','not_verified');end if;
 published:=(r.assessment->>'published_at')::timestamptz;deadline:=nullif(r.assessment->>'deadline','')::timestamptz;
 if published is null or published>now()+interval '5 minutes' or (deadline is not null and deadline<=now()) or (deadline is null and published<now()-interval '7 days') or r.updated_at<now()-interval '7 days' then return jsonb_build_object('error','stale');end if;
 select * into q from public.buzzie_crm_outbox where opportunity_id=opportunity;
 if q.status='sent' then return jsonb_build_object('already_sent',true,'crm_lead_id',q.crm_lead_id,'reference',q.reference);end if;
 if q.lease_until>now() or q.retry_after>now() or q.attempts>=5 then return jsonb_build_object('error','busy_or_retry_limit');end if;
 -- Freeze the first authorized snapshot; retries never adopt later feed edits.
 payload:=coalesce(q.payload,jsonb_build_object('reference','buzzie:'||opportunity::text,'opportunity_id',opportunity,'title',o.title,'source_name',o.source_name,'source_url',o.source_url,'description',coalesce(r.assessment->>'description',o.summary,''),'city',r.assessment->>'city','project_type',r.assessment->>'project_type','published_at',r.assessment->>'published_at','deadline',r.assessment->>'deadline','relationship',r.assessment->>'relationship','priority',r.assessment->>'priority','reason',r.assessment->>'reason','public_contact',case when r.assessment->>'contact_allowed'='true' then r.assessment->>'public_contact' else '' end,'verification','owner_checked_original','contact_consent',false,'reviewed_at',r.updated_at));
 insert into public.buzzie_crm_outbox(opportunity_id,reference,payload,status,attempts,lease_token,lease_until,approved_revision,authorized_by)
 values(opportunity,'buzzie:'||opportunity::text,payload,'sending',1,token,now()+interval '90 seconds',expected,actor)
 on conflict(opportunity_id) do update set status='sending',attempts=buzzie_crm_outbox.attempts+1,lease_token=token,lease_until=now()+interval '90 seconds',retry_after=null returning * into q;
 insert into public.buzzie_crm_attempts(opportunity_id,attempt) values(opportunity,q.attempts);
 return jsonb_build_object('payload',q.payload,'lease_token',token,'attempt',q.attempts);
exception when invalid_datetime_format or datetime_field_overflow then return jsonb_build_object('error','invalid');
end $$;
create function public.buzzie_finish_crm(opportunity uuid,claim uuid,lead uuid,result_code text) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare q public.buzzie_crm_outbox;
begin
 if result_code not in ('confirmed','connection_failed','rejected','invalid_receipt') then return false;end if;
 update public.buzzie_crm_outbox set status=case when lead is not null and result_code='confirmed' then 'sent' else 'failed' end,crm_lead_id=case when result_code='confirmed' then lead else null end,last_result=result_code,lease_until=null,lease_token=null,retry_after=now()+interval '1 minute',sent_at=case when lead is not null and result_code='confirmed' then now() end where opportunity_id=opportunity and lease_token=claim and status='sending' returning * into q;
 if not found then return false;end if;
 update public.buzzie_crm_attempts set finished_at=now(),result=result_code where opportunity_id=opportunity and attempt=q.attempts;return true;
end $$;
create function public.buzzie_crm_secret() returns text language sql security definer set search_path='' as $$select decrypted_secret from vault.decrypted_secrets where name='buzzie_crm_bridge'$$;
revoke all on function public.buzzie_review_opportunity(uuid,uuid,integer,text,jsonb),public.buzzie_claim_crm(uuid,uuid,integer),public.buzzie_finish_crm(uuid,uuid,uuid,text),public.buzzie_crm_secret() from public,anon,authenticated;
grant execute on function public.buzzie_review_opportunity(uuid,uuid,integer,text,jsonb),public.buzzie_claim_crm(uuid,uuid,integer),public.buzzie_finish_crm(uuid,uuid,uuid,text),public.buzzie_crm_secret() to service_role;
create table public.buzzie_public_scan(singleton boolean primary key default true check(singleton),started_at timestamptz,lease uuid,last_result jsonb);
insert into public.buzzie_public_scan(singleton) values(true);
alter table public.buzzie_public_scan enable row level security;
revoke all on public.buzzie_public_scan from public,anon,authenticated;
grant select,update on public.buzzie_public_scan to service_role;
create function public.buzzie_claim_public_scan() returns uuid language sql security invoker set search_path=public,pg_temp as $$update public.buzzie_public_scan set started_at=now(),lease=gen_random_uuid() where singleton and (started_at is null or started_at<now()-interval '5 minutes') returning lease$$;
create function public.buzzie_finish_public_scan(claim uuid,result_value jsonb) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$begin update public.buzzie_public_scan set last_result=result_value where singleton and lease=claim;return found;end $$;
revoke all on function public.buzzie_claim_public_scan(),public.buzzie_finish_public_scan(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.buzzie_claim_public_scan(),public.buzzie_finish_public_scan(uuid,jsonb) to service_role;
commit;

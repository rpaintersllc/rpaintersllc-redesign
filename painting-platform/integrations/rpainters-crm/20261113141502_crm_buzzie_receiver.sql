-- Apply only to the separate R Painters CRM project, never the BUZZIE database.
begin;
set local lock_timeout='2s';
create table public.crm_buzzie_integrations(organization_id uuid primary key references public.organizations(id),token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),enabled boolean not null default false,created_at timestamptz not null default now());
create table public.crm_buzzie_receipts(organization_id uuid not null references public.organizations(id),reference text not null,payload jsonb not null,lead_id uuid not null references public.leads(id),received_at timestamptz not null default now(),primary key(organization_id,reference));
alter table public.crm_buzzie_integrations enable row level security;alter table public.crm_buzzie_receipts enable row level security;
revoke all on public.crm_buzzie_integrations,public.crm_buzzie_receipts from public,anon,authenticated;
grant select,insert,update on public.crm_buzzie_integrations,public.crm_buzzie_receipts to service_role;
create function public.crm_receive_buzzie(key_hash text,submission jsonb,validate_only boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare org uuid;prior public.crm_buzzie_receipts;lead uuid;reference_value text;notes_value text;
begin
 select organization_id into org from public.crm_buzzie_integrations where token_hash=key_hash and enabled;
 if org is null then return jsonb_build_object('error','unauthorized');end if;
 if jsonb_typeof(submission) is distinct from 'object' or coalesce(submission->>'reference','') !~ '^buzzie:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or length(coalesce(submission->>'title','')) not between 5 and 200 or coalesce(submission->>'source_url','') !~ '^https://' or length(coalesce(submission->>'source_url',''))>1000 or length(coalesce(submission->>'description',''))>4000 or submission->>'verification' is distinct from 'owner_checked_original' or submission->>'contact_consent' is distinct from 'false' then return jsonb_build_object('error','invalid');end if;
 if length(coalesce(submission->>'source_name','')) not between 2 and 120 or length(coalesce(submission->>'city','')) not between 2 and 100 or length(coalesce(submission->>'reason','')) not between 10 and 2000 or coalesce(submission->>'relationship','') not in ('direct','subcontract') or coalesce(submission->>'priority','') not in ('high','medium','low') or length(coalesce(submission->>'public_contact',''))>300 or length(submission::text)>14000 then return jsonb_build_object('error','invalid');end if;
 reference_value:=submission->>'reference';
 if validate_only then return jsonb_build_object('validated',true,'reference',reference_value,'persisted',false);end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||reference_value,0));
 select * into prior from public.crm_buzzie_receipts where organization_id=org and reference=reference_value;
 if prior.lead_id is not null then
  if prior.payload<>submission then return jsonb_build_object('error','reference_conflict');end if;
  return jsonb_build_object('saved',true,'duplicate',true,'reference',reference_value,'lead_id',prior.lead_id);
 end if;
 notes_value:='BUZZIE discovered opportunity — not an inbound estimate request. No contact consent or booked job is implied.'||E'\nReference: '||reference_value||E'\nSource: '||(submission->>'source_name')||E'\nOriginal: '||(submission->>'source_url')||E'\nPublished: '||coalesce(submission->>'published_at','Unknown')||E'\nArea: '||coalesce(submission->>'city','Unknown')||E'\nRelationship: '||coalesce(submission->>'relationship','Unknown')||E'\nPriority: '||coalesce(submission->>'priority','Unknown')||E'\nReason: '||coalesce(submission->>'reason','')||E'\nPublic contact: '||coalesce(submission->>'public_contact','')||E'\n\n'||coalesce(submission->>'description','');
 -- A prospect with no invented contact/customer or consent. Existing trigger adds internal tasks only.
 insert into public.leads(organization_id,title,source,notes,stage) values(org,submission->>'title','BUZZIE opportunity',notes_value,'cold_leads') returning id into lead;
 insert into public.crm_buzzie_receipts(organization_id,reference,payload,lead_id) values(org,reference_value,submission,lead);
 return jsonb_build_object('saved',true,'duplicate',false,'reference',reference_value,'lead_id',lead);
end $$;
revoke all on function public.crm_receive_buzzie(text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.crm_receive_buzzie(text,jsonb,boolean) to service_role;
commit;

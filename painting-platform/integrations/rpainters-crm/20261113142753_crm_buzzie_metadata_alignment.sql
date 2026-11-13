-- Align only the dedicated bridge snapshot with the canonical CRM display fields.
begin;
create or replace function public.crm_receive_buzzie(key_hash text,submission jsonb,validate_only boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare org uuid;prior public.crm_buzzie_receipts;lead uuid;reference_value text;notes_value text;normalized jsonb; imported jsonb;
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
 -- Reuse the CRM's concurrently introduced canonical BUZZIE import registry.
 -- Sharing its source-URL deduplication also protects transfers through its other endpoint.
 normalized:=jsonb_build_object('external_id',reference_value,'title',submission->>'title','source_platform',submission->>'source_name','source_url',submission->>'source_url','published_at',submission->>'published_at','location',submission->>'city','service_type',submission->>'project_type','original_description',submission->>'description','relationship',submission->>'relationship','priority',case when submission->>'priority'='medium' then 'normal' else submission->>'priority' end,'qualification_reason',submission->>'reason','verification_status','source_verified','contact_consent',false,'public_contact',coalesce(submission->>'public_contact',''),'contact',jsonb_build_object('name',null,'email',null,'phone',null,'company_name',null),'approved_at',submission->>'reviewed_at','detected_at',null);
 imported:=public.crm_import_buzzie_lead(org,normalized,encode(sha256(convert_to(normalized::text,'UTF8')),'hex'));
 if imported->>'imported' is distinct from 'true' then return jsonb_build_object('error','reference_conflict');end if;
 lead:=(imported->>'lead_id')::uuid;
 insert into public.crm_buzzie_receipts(organization_id,reference,payload,lead_id) values(org,reference_value,submission,lead);
 return jsonb_build_object('saved',true,'duplicate',coalesce((imported->>'duplicate')::boolean,false),'reference',reference_value,'lead_id',lead);
end $$;
commit;

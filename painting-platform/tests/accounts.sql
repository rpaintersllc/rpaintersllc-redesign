-- Run against the isolated pilot. All synthetic identities and changes roll back.
begin;
do $$
declare project uuid; h text; lead uuid; owner uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();
begin
 select p.id,p.access_hash,p.lead_id into project,h,lead from public.platform_projects p
 join public.leads l on l.id=p.lead_id where l.email='platform-system-test@example.invalid' limit 1;
 assert project is not null,'Run against the pilot containing the synthetic platform project';
 insert into auth.users(id,email,email_confirmed_at) values(owner,'account-owner@example.invalid',now()),(stranger,'account-stranger@example.invalid',now());
 update public.leads set email='account-owner@example.invalid' where id=lead;
 assert not public.platform_claim_project(project,repeat('0',64),owner),'Incorrect private key accepted';
 assert not public.platform_claim_project(project,h,stranger),'Mismatched email accepted';
 update auth.users set email_confirmed_at=null where id=owner;
 assert not public.platform_claim_project(project,h,owner),'Unconfirmed email accepted';
 update auth.users set email_confirmed_at=now() where id=owner;
 assert public.platform_claim_project(project,h,owner),'Matching owner claim failed';
 assert public.platform_claim_project(project,h,owner),'Repeat owner claim failed';
 assert (select owner_user_id=owner from public.platform_projects where id=project),'Owner not saved';
 update auth.users set email='account-former-owner@example.invalid' where id=owner;
 update auth.users set email='account-owner@example.invalid' where id=stranger;
 assert not public.platform_claim_project(project,h,stranger),'Claim reassigned ownership';
 assert not has_function_privilege('anon','public.platform_claim_project(uuid,text,uuid)','execute');
 assert not has_table_privilege('authenticated','public.platform_projects','update');
end $$;
rollback;

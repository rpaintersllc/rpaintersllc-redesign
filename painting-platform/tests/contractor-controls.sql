begin;
do $$
declare p uuid;b uuid;actor uuid;staff uuid:=gen_random_uuid();r jsonb;rev integer;enabled boolean;lead_key uuid;h text;
begin
 select pr.id,pr.business_id,pr.access_hash,l.request_key into p,b,h,lead_key from public.platform_projects pr join public.leads l on l.id=pr.lead_id where l.email='platform-system-test@example.invalid' limit 1;
 assert p is not null;
 select user_id into actor from public.platform_business_members where business_id=b and role='owner' limit 1;
 select coalesce((select revision from public.platform_project_reviews where project_id=p),0) into rev;
 r:=public.platform_save_review(p,b,gen_random_uuid(),rev,'qualified','deny');assert r->>'error'='forbidden';
 r:=public.platform_save_review(gen_random_uuid(),b,actor,0,'qualified','deny');assert r->>'error'='not_found';
 r:=public.platform_save_review(p,b,actor,rev,'qualified','Private system test note');assert (r->>'revision')::int=rev+1;
 r:=public.platform_save_review(p,b,actor,rev,'not_fit','stale overwrite');assert r->>'error'='conflict';
 assert (select notes='Private system test note' from public.platform_project_reviews where project_id=p);
 insert into auth.users(id,email,email_confirmed_at) values(staff,'contractor-staff-test@example.invalid',now());
 insert into public.platform_business_members(business_id,user_id,role) values(b,staff,'staff');
 r:=public.platform_save_review(p,b,staff,rev+1,'unreviewed','Staff can review');assert r ? 'revision';
 select accepting_requests into enabled from public.platform_businesses where id=b;
 r:=public.platform_set_availability(b,staff,false,enabled);assert r->>'error'='forbidden';
 r:=public.platform_set_availability(b,actor,false,enabled);assert r->>'accepting_requests'='false';
 r:=public.platform_create_project(jsonb_build_object('provider_slug','r-painters-llc','state','SC','city','Summerville','zip','29483','request_key',gen_random_uuid(),'access_hash',repeat('e',64),'ip_hash',gen_random_uuid()::text,'email',gen_random_uuid()::text||'@example.invalid','phone','2025550149'));assert r->>'error'='outside_pilot_area','Paused provider still accepted a new project';
 r:=public.platform_create_project(jsonb_build_object('request_key',lead_key,'access_hash',h));assert (r->>'duplicate')::boolean,'Existing request retry failed after pause';
 r:=public.platform_set_availability(b,actor,true,false);assert r->>'accepting_requests'='true';
 assert not has_table_privilege('anon','public.platform_project_reviews','select');
 assert not has_table_privilege('authenticated','public.platform_project_reviews','update');
 assert not has_function_privilege('authenticated','public.platform_save_review(uuid,uuid,uuid,integer,text,text)','execute');
end $$;
rollback;

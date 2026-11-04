begin;
create table if not exists public.platform_businesses (
 id uuid primary key default gen_random_uuid(),slug text not null unique,
 name text not null,website text not null,phone text not null,
 active boolean not null default false,state text not null,
 cities text[] not null,zip_prefix text not null default '294',
 created_at timestamptz not null default now()
);
create table if not exists public.platform_business_members (
 business_id uuid not null references public.platform_businesses(id),
 user_id uuid not null references auth.users(id),role text not null check(role in ('owner','staff')),
 primary key(business_id,user_id)
);
create index if not exists platform_members_user_idx on public.platform_business_members(user_id);
create table if not exists public.platform_projects (
 id uuid primary key default gen_random_uuid(),lead_id uuid not null unique references public.leads(id),
 business_id uuid not null references public.platform_businesses(id),access_hash text not null check(access_hash~'^[0-9a-f]{64}$'),
 property_type text not null check(property_type in ('Home','Business')),
 timing text not null,budget text,ip_hash text not null,
 contact_verified boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists platform_projects_business_idx on public.platform_projects(business_id,created_at desc);
create index if not exists platform_projects_rate_idx on public.platform_projects(ip_hash,created_at desc);
create table if not exists public.platform_events (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.platform_projects(id),
 status text not null,created_at timestamptz not null default now()
);
create index if not exists platform_events_project_idx on public.platform_events(project_id,created_at);
create table if not exists public.platform_photos (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.platform_projects(id),
 storage_path text not null unique,mime text not null,bytes integer not null check(bytes between 1 and 5242880),
 status text not null check(status in ('pending','ready','failed')),created_at timestamptz not null default now()
);
create index if not exists platform_photos_project_idx on public.platform_photos(project_id,status);
create table if not exists public.platform_provider_interest (
 id uuid primary key default gen_random_uuid(),business_name text not null,email text not null,
 state text not null,city text not null,website text,consent_at timestamptz not null default now(),
 created_at timestamptz not null default now(),unique(email,state,city)
);
alter table public.platform_businesses enable row level security;
alter table public.platform_business_members enable row level security;
alter table public.platform_projects enable row level security;
alter table public.platform_events enable row level security;
alter table public.platform_photos enable row level security;
alter table public.platform_provider_interest enable row level security;
revoke all on public.platform_businesses,public.platform_business_members,public.platform_projects,public.platform_events,public.platform_photos,public.platform_provider_interest from public,anon,authenticated;
grant all on public.platform_businesses,public.platform_business_members,public.platform_projects,public.platform_events,public.platform_photos,public.platform_provider_interest to service_role;
insert into public.platform_businesses(slug,name,website,phone,active,state,cities)
values('r-painters-llc','R Painters LLC','https://rpaintersllc.com','843-475-9927',true,'SC',
array['Charleston','Summerville','Mount Pleasant','North Charleston','West Ashley','Goose Creek','Ladson','Hanahan','James Island','Johns Island','Daniel Island','Cane Bay','Isle of Palms','Sullivan''s Island','Folly Beach','Moncks Corner','Kiawah Island','Seabrook Island']) on conflict(slug) do nothing;
insert into public.platform_business_members(business_id,user_id,role)
select b.id,u.id,'owner' from public.platform_businesses b cross join auth.users u
where b.slug='r-painters-llc' and lower(u.email)='rpaintersinsc@gmail.com' on conflict do nothing;

create or replace function public.platform_create_project(payload jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare prior public.platform_projects;business public.platform_businesses;lead uuid;project uuid;
begin
 perform pg_advisory_xact_lock(72642200);
 select p.* into prior from public.platform_projects p join public.leads l on l.id=p.lead_id where l.request_key=(payload->>'request_key')::uuid;
 if found then
  if prior.access_hash<>payload->>'access_hash' then return jsonb_build_object('error','request_conflict');end if;
  return jsonb_build_object('id',prior.id,'duplicate',true);
 end if;
 if (select count(*) from public.platform_projects where created_at>now()-interval '24 hours')>=30
 or (select count(*) from public.platform_projects where created_at>now()-interval '1 hour' and ip_hash=payload->>'ip_hash')>=5
 or (select count(*) from public.leads where created_at>now()-interval '1 hour' and (email=payload->>'email' or phone=payload->>'phone'))>=2
 then return jsonb_build_object('error','rate_limited');end if;
 select * into business from public.platform_businesses b where b.active and b.slug=payload->>'provider_slug'
 and b.state=payload->>'state' and left(payload->>'zip',length(b.zip_prefix))=b.zip_prefix
 and exists(select 1 from unnest(b.cities) as areas(city_name) where lower(city_name)=lower(payload->>'city'));
 if not found then return jsonb_build_object('error','outside_pilot_area');end if;
 insert into public.leads(request_key,full_name,email,phone,city,zip,service,details,consent_at,source,utm_source,utm_campaign)
 values((payload->>'request_key')::uuid,payload->>'full_name',payload->>'email',payload->>'phone',payload->>'city',payload->>'zip',payload->>'service',payload->>'details',now(),'platform',nullif(payload->>'utm_source',''),nullif(payload->>'utm_campaign','')) returning id into lead;
 insert into public.platform_projects(lead_id,business_id,access_hash,property_type,timing,budget,ip_hash)
 values(lead,business.id,payload->>'access_hash',payload->>'property_type',payload->>'timing',payload->>'budget',payload->>'ip_hash') returning id into project;
 insert into public.platform_events(project_id,status) values(project,'new');
 return jsonb_build_object('id',project,'duplicate',false);
end $$;
revoke all on function public.platform_create_project(jsonb) from public,anon,authenticated;
grant execute on function public.platform_create_project(jsonb) to service_role;

create or replace function public.platform_lead_event() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status is distinct from old.status then
  insert into public.platform_events(project_id,status) select id,new.status from public.platform_projects where lead_id=new.id;
 end if;return new;
end $$;
revoke all on function public.platform_lead_event() from public,anon,authenticated;
create trigger platform_lead_status_event after update of status on public.leads for each row execute function public.platform_lead_event();

create or replace function public.platform_set_status(project uuid,business uuid,next_status text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if next_status not in ('new','contacted','visit_scheduled','quoted','won','lost') then return false;end if;
 update public.leads set status=next_status where id=(select lead_id from public.platform_projects where id=project and business_id=business);
 return found;
end $$;
revoke all on function public.platform_set_status(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.platform_set_status(uuid,uuid,text) to service_role;

create or replace function public.platform_reserve_photo(project uuid,access_key_hash text,photo_mime text,byte_size integer) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare photo uuid;path text;ext text;
begin
 perform 1 from public.platform_projects where id=project and access_hash=access_key_hash for update;
 if not found then return null;end if;
 if photo_mime not in ('image/jpeg','image/png','image/webp') or byte_size not between 1 and 5242880 then return null;end if;
 update public.platform_photos set status='failed' where project_id=project and status='pending' and created_at<now()-interval '5 minutes';
 if (select count(*) from public.platform_photos where project_id=project and status in ('ready','pending'))>=5 then return jsonb_build_object('error','photo_limit');end if;
 photo=gen_random_uuid();ext=case photo_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end;
 path=project::text||'/'||photo::text||'.'||ext;
 insert into public.platform_photos(id,project_id,storage_path,mime,bytes,status) values(photo,project,path,photo_mime,byte_size,'pending');
 return jsonb_build_object('id',photo,'path',path);
end $$;
revoke all on function public.platform_reserve_photo(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.platform_reserve_photo(uuid,text,text,integer) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('platform-project-photos','platform-project-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
commit;


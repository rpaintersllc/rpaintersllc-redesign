-- MVP schema. Run in a NEW Supabase project, not in production.
create extension if not exists pgcrypto;
create table if not exists public.leads (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 request_key uuid not null unique,
 full_name text not null check (char_length(full_name) between 2 and 120),
 email text not null check (char_length(email) between 5 and 254),
 phone text not null check (char_length(phone) between 10 and 30),
 city text not null check (char_length(city) between 2 and 100),
 zip text not null check (zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
 service text not null check (char_length(service) between 3 and 100),
 details text not null check (char_length(details) between 10 and 4000),
 consent_at timestamptz not null,
 source text not null default 'website',
 utm_source text,
 utm_campaign text,
 status text not null default 'new' check (status in ('new','contacted','visit_scheduled','quoted','won','lost')),
 constraint lead_consent_required check (consent_at <= created_at + interval '5 minutes')
);
create table if not exists public.opportunities (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 title text not null,
 source_name text not null,
 source_url text not null unique check (source_url ~ '^https://'),
 city text,
 deadline timestamptz,
 summary text,
 review_status text not null default 'unreviewed' check (review_status in ('unreviewed','relevant','dismissed')),
 discovered_at timestamptz not null default now()
);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists opportunities_deadline_idx on public.opportunities(deadline);
alter table public.leads enable row level security;
alter table public.opportunities enable row level security;
-- No public RLS policies: anonymous and ordinary authenticated clients cannot read/write.
-- Only trusted server-side code with the service-role key can manage these tables.
revoke all on public.leads from anon, authenticated;
revoke all on public.opportunities from anon, authenticated;
-- Admin read access must be added only after role-based authorization is implemented.

begin;
alter table public.opportunities
 add column if not exists opportunity_kind text not null default 'manual',
 add column if not exists published_at timestamptz,
 add column if not exists discovery_source_id text,
 add column if not exists match_reasons jsonb,
 add column if not exists verification_status text not null default 'needs_original_review',
 add column if not exists suggested_response text;
create table if not exists public.discovery_scans (
 id uuid primary key default gen_random_uuid(),
 source_id text not null,
 source_name text not null,
 checked_at timestamptz not null,
 status text not null check(status in ('ok','error','disabled')),
 items_seen integer not null default 0,
 matches integer not null default 0,
 rejected jsonb not null default '{}'
);
create index if not exists discovery_scans_checked_idx on public.discovery_scans(checked_at desc);
alter table public.discovery_scans enable row level security;
revoke all on public.discovery_scans from public,anon,authenticated;
grant select,insert on public.discovery_scans to service_role;
commit;

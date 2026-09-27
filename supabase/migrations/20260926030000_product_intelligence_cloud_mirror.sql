begin;

create table if not exists public.product_intelligence_snapshots (
  product_id text primary key,
  fingerprint text not null unique,
  payload_hash text not null,
  revision_number integer not null
    check (revision_number >= 0),
  product_updated_at timestamptz not null,
  schema_version integer not null default 1
    check (schema_version = 1),
  snapshot jsonb not null,
  synced_at timestamptz not null default now()
);

comment on table public.product_intelligence_snapshots is
  'Optional cloud mirror of local Product Intelligence snapshots. SQLite remains authoritative.';

alter table public.product_intelligence_snapshots
  enable row level security;

revoke all
  on table public.product_intelligence_snapshots
  from public;

revoke all
  on table public.product_intelligence_snapshots
  from anon;

revoke all
  on table public.product_intelligence_snapshots
  from authenticated;

grant select, insert, update, delete
  on table public.product_intelligence_snapshots
  to service_role;

commit;

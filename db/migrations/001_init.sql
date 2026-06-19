-- 001_init.sql — baseline schema (§5 Data Layer).
-- Forward-only. Never edit a shipped migration; add a new numbered file.

create extension if not exists pg_trgm;

-- Example: a local mirror of an external system-of-record (§4.1).
-- Keyed on the upstream's stable id; full payload kept in `raw` so an upstream
-- schema change can never strand data we already received.
create table if not exists customers (
  id          text primary key,                -- external system's stable id
  email       text not null,
  name        text not null default '',
  company     text not null default '',
  raw         jsonb not null,                  -- full upstream payload
  -- denormalized, generated search target for fuzzy lookups
  search_text text generated always as (
                lower(coalesce(name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(email, ''))
              ) stored,
  synced_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists customers_email_idx on customers (lower(email));
create index if not exists customers_search_trgm_idx
  on customers using gin (search_text gin_trgm_ops);

-- Example: dashboard-only data we own outright (no external source).
create table if not exists inquiries (
  id         bigserial primary key,
  email      text not null,
  status     text not null default 'new',
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_status_idx on inquiries (status);

-- Idempotent upsert pattern (§5) — safe to re-run a sync:
--   insert into customers (id, email, name, company, raw, synced_at)
--   values ($1, $2, $3, $4, $5, now())
--   on conflict (id) do update set
--     email = excluded.email, name = excluded.name, company = excluded.company,
--     raw = excluded.raw, synced_at = now(), updated_at = now();

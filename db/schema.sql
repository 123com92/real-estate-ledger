create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ledger_snapshots (
  user_id uuid primary key references app_users(id) on delete cascade,
  data jsonb not null default '{"selectedCommunityId":"all","communities":[],"properties":[],"transactions":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_users_role on app_users(role);
create index if not exists idx_app_users_status on app_users(status);

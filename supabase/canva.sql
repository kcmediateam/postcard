-- Radiate — Canva Connect token storage. Run when wiring the Canva integration.
-- Tokens are sensitive: only the server (service role) ever reads/writes them.

create table if not exists public.canva_connections (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  canva_user_id text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS on, with NO policies → clients can't touch tokens; the server uses the
-- service-role key (which bypasses RLS) for the OAuth + import routes.
alter table public.canva_connections enable row level security;

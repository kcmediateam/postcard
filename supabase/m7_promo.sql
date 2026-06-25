-- Postcard — promo code redemptions ($100off). Run AFTER schema.sql. Idempotent.
-- Tracks one-redemption-per-user and a return-address fingerprint so the same
-- sender address can't farm the code across many accounts.

-- Allow a 'promo' ledger reason for the bonus-credit grant.
alter table public.credit_transactions drop constraint if exists credit_transactions_reason_check;
alter table public.credit_transactions add constraint credit_transactions_reason_check
  check (reason in
    ('purchase','subscription_grant','rollover','campaign_send','refund','adjustment','promo'));

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  address_fingerprint text,
  created_at timestamptz not null default now(),
  unique (profile_id, code)
);
alter table public.promo_redemptions enable row level security;
drop policy if exists "promo_select_own" on public.promo_redemptions;
create policy "promo_select_own" on public.promo_redemptions
  for select using (auth.uid() = profile_id);
-- Inserts happen only via the service role (server route) — no client insert policy.
create index if not exists promo_redemptions_fp_idx
  on public.promo_redemptions (code, address_fingerprint);

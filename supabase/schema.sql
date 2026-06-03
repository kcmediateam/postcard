-- Postcard — full Postgres schema (Milestone 2 profiles + Milestone 3 all tables).
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.

-- =========================================================================
-- profiles (Milestone 2)
-- =========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  return_name text,
  return_line1 text,
  return_line2 text,
  return_city text,
  return_state text,
  return_zip text,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- =========================================================================
-- credit_wallets + credit_transactions (the ledger; balance = sum derived)
-- =========================================================================
create table if not exists public.credit_wallets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.credit_wallets enable row level security;
drop policy if exists "wallets_select_own" on public.credit_wallets;
create policy "wallets_select_own" on public.credit_wallets for select using (auth.uid() = profile_id);
-- no client writes: balance is maintained by trigger only.

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in
    ('purchase','subscription_grant','rollover','campaign_send','refund','adjustment')),
  reference_id text,
  created_at timestamptz not null default now()
);
alter table public.credit_transactions enable row level security;
drop policy if exists "txns_select_own" on public.credit_transactions;
create policy "txns_select_own" on public.credit_transactions for select using (auth.uid() = profile_id);
drop policy if exists "txns_insert_own" on public.credit_transactions;
create policy "txns_insert_own" on public.credit_transactions for insert with check (auth.uid() = profile_id);
-- append-only: no update/delete policies.
create index if not exists credit_transactions_profile_idx on public.credit_transactions (profile_id, created_at desc);

-- Keep wallet.balance = sum(transactions) for that profile. SECURITY DEFINER so
-- it can update the wallet regardless of RLS.
create or replace function public.sync_wallet_balance()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pid uuid;
begin
  v_pid := coalesce(new.profile_id, old.profile_id);
  update public.credit_wallets
     set balance = coalesce((select sum(delta) from public.credit_transactions where profile_id = v_pid), 0),
         updated_at = now()
   where profile_id = v_pid;
  return null;
end; $$;

drop trigger if exists trg_sync_wallet on public.credit_transactions;
create trigger trg_sync_wallet
  after insert or update or delete on public.credit_transactions
  for each row execute function public.sync_wallet_balance();

-- =========================================================================
-- subscriptions
-- =========================================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stripe_subscription_id text not null,
  plan text not null,
  status text not null check (status in
    ('active','trialing','past_due','canceled','incomplete')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  monthly_credit_grant integer not null
);
alter table public.subscriptions enable row level security;
drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions for select using (auth.uid() = profile_id);
drop policy if exists "subs_insert_own" on public.subscriptions;
create policy "subs_insert_own" on public.subscriptions for insert with check (auth.uid() = profile_id);
drop policy if exists "subs_update_own" on public.subscriptions;
create policy "subs_update_own" on public.subscriptions for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- =========================================================================
-- designs  (image columns hold data URLs for now; Storage migration is M5)
-- =========================================================================
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  source text not null check (source in ('uploaded','template')),
  front_image_url text,
  back_image_url text,
  template_id text,
  template_kind text check (template_kind in ('just_listed','just_sold','open_house')),
  fields jsonb,
  created_at timestamptz not null default now()
);
alter table public.designs enable row level security;
drop policy if exists "designs_all_own" on public.designs;
create policy "designs_all_own" on public.designs for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- =========================================================================
-- contact_lists + contacts
-- =========================================================================
create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  contact_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.contact_lists enable row level security;
drop policy if exists "lists_all_own" on public.contact_lists;
create policy "lists_all_own" on public.contact_lists for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.contact_lists (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  lob_verification_status text not null default 'unverified'
    check (lob_verification_status in ('unverified','verified','undeliverable')),
  created_at timestamptz not null default now()
);
alter table public.contacts enable row level security;
drop policy if exists "contacts_all_own" on public.contacts;
create policy "contacts_all_own" on public.contacts for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create index if not exists contacts_list_idx on public.contacts (list_id);

-- =========================================================================
-- campaigns + mail_pieces + scans
-- =========================================================================
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  design_id uuid not null references public.designs (id),
  contact_list_id uuid not null references public.contact_lists (id),
  scheduled_at timestamptz,
  status text not null check (status in
    ('draft','scheduled','sending','sent','failed','canceled')),
  piece_count integer not null default 0,
  credit_cost integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
drop policy if exists "campaigns_all_own" on public.campaigns;
create policy "campaigns_all_own" on public.campaigns for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create table if not exists public.mail_pieces (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  contact_id uuid not null references public.contacts (id),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lob_id text,
  status text not null default 'created' check (status in
    ('created','in_transit','delivered','returned','failed')),
  scan_count integer not null default 0,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
alter table public.mail_pieces enable row level security;
drop policy if exists "pieces_all_own" on public.mail_pieces;
create policy "pieces_all_own" on public.mail_pieces for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create index if not exists mail_pieces_campaign_idx on public.mail_pieces (campaign_id);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  mail_piece_id uuid not null references public.mail_pieces (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  source text not null default 'lob',
  raw_event jsonb
);
alter table public.scans enable row level security;
drop policy if exists "scans_select_own" on public.scans;
create policy "scans_select_own" on public.scans for select using (
  exists (select 1 from public.mail_pieces mp where mp.id = mail_piece_id and mp.profile_id = auth.uid()));
drop policy if exists "scans_insert_own" on public.scans;
create policy "scans_insert_own" on public.scans for insert with check (
  exists (select 1 from public.mail_pieces mp where mp.id = mail_piece_id and mp.profile_id = auth.uid()));

-- =========================================================================
-- create_campaign RPC — atomic: creates campaign, and (if send_now) the mail
-- pieces + a single debit, refusing to overspend. Enforces the non-negotiables
-- server-side (never send more pieces than credits; one debit per campaign).
-- =========================================================================
create or replace function public.create_campaign(
  p_name text,
  p_design_id uuid,
  p_contact_list_id uuid,
  p_scheduled_at timestamptz,
  p_send_now boolean
) returns public.campaigns
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_pieces integer;
  v_balance integer;
  v_campaign public.campaigns;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from designs where id = p_design_id and profile_id = v_uid)
    then raise exception 'design_not_found'; end if;
  if not exists (select 1 from contact_lists where id = p_contact_list_id and profile_id = v_uid)
    then raise exception 'list_not_found'; end if;

  select count(*) into v_pieces from contacts
   where list_id = p_contact_list_id and profile_id = v_uid
     and lob_verification_status = 'verified';
  if v_pieces = 0 then raise exception 'no_deliverable_contacts'; end if;
  if not p_send_now and p_scheduled_at is null then raise exception 'no_send_time'; end if;

  insert into campaigns (profile_id, name, design_id, contact_list_id, scheduled_at, status, piece_count, credit_cost)
  values (v_uid, p_name, p_design_id, p_contact_list_id,
          case when p_send_now then null else p_scheduled_at end,
          case when p_send_now then 'sending' else 'scheduled' end,
          v_pieces, v_pieces)
  returning * into v_campaign;

  if p_send_now then
    select balance into v_balance from credit_wallets where profile_id = v_uid for update;
    if coalesce(v_balance, 0) < v_pieces then
      raise exception 'insufficient_credits:%:%', v_pieces, coalesce(v_balance, 0);
    end if;

    insert into mail_pieces (campaign_id, contact_id, profile_id, lob_id, status, scan_count)
    select v_campaign.id, c.id, v_uid,
           'psc_mock_' || substr(md5(random()::text), 1, 12), 'in_transit', 0
    from contacts c
    where c.list_id = p_contact_list_id and c.profile_id = v_uid
      and c.lob_verification_status = 'verified';

    insert into credit_transactions (profile_id, delta, reason, reference_id)
    values (v_uid, -v_pieces, 'campaign_send', v_campaign.id::text);

    update campaigns set status = 'sent' where id = v_campaign.id returning * into v_campaign;
  end if;

  return v_campaign;
end; $$;

-- =========================================================================
-- handle_new_user — create the profile AND an empty wallet on signup.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  insert into public.credit_wallets (profile_id, balance)
  values (new.id, 0)
  on conflict (profile_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill wallets for any existing profiles that don't have one.
insert into public.credit_wallets (profile_id, balance)
select p.id, 0 from public.profiles p
where not exists (select 1 from public.credit_wallets w where w.profile_id = p.id);

-- Postcard — Admin + managed (full-service) orders. Run AFTER schema.sql. Idempotent.

-- 1. Admin flag on profiles.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Grant yourself admin (adjust the email to the account you signed up with).
update public.profiles set is_admin = true where email = 'samanthastultz@gmail.com';

-- 2. Managed full-service orders live in the campaigns table.
alter table public.campaigns
  add column if not exists audience_tier text not null default 'self_service',
  add column if not exists target_area text,
  add column if not exists requested_quantity integer;

-- audience_tier check
alter table public.campaigns drop constraint if exists campaigns_audience_tier_check;
alter table public.campaigns
  add constraint campaigns_audience_tier_check
  check (audience_tier in ('self_service', 'managed'));

-- contact_list_id is null until we build the list for a managed order.
alter table public.campaigns alter column contact_list_id drop not null;

-- add 'awaiting_list' to the status set (managed order pending fulfillment).
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check
  check (status in ('draft','scheduled','sending','sent','failed','canceled','awaiting_list'));

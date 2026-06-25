-- Postcard — per-campaign QR override. Run AFTER schema.sql. Idempotent.
-- Adds campaigns.qr_url and threads an optional p_qr_url through create_campaign
-- (so a reused design can carry different UTMs per send).

alter table public.campaigns add column if not exists qr_url text;

-- Replace the 5-arg create_campaign with a 6-arg version (optional p_qr_url).
drop function if exists public.create_campaign(text, uuid, uuid, timestamptz, boolean);

create or replace function public.create_campaign(
  p_name text,
  p_design_id uuid,
  p_contact_list_id uuid,
  p_scheduled_at timestamptz,
  p_send_now boolean,
  p_qr_url text default null
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

  insert into campaigns (profile_id, name, design_id, contact_list_id, scheduled_at, status, piece_count, credit_cost, qr_url)
  values (v_uid, p_name, p_design_id, p_contact_list_id,
          case when p_send_now then null else p_scheduled_at end,
          case when p_send_now then 'sending' else 'scheduled' end,
          v_pieces, v_pieces, nullif(btrim(coalesce(p_qr_url, '')), ''))
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

grant execute on function public.create_campaign(text, uuid, uuid, timestamptz, boolean, text) to authenticated;

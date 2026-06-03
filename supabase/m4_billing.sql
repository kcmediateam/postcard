-- Postcard — Milestone 4 (billing). Run AFTER schema.sql. Idempotent.

-- 1. Lock down the ledger: clients may NO LONGER insert credit transactions.
--    Credits are granted only by the verified Stripe webhook (service role) or
--    debited by the create_campaign RPC (security definer). Reads stay allowed.
drop policy if exists "txns_insert_own" on public.credit_transactions;

-- 2. seed_sample_data RPC — populates a demo design/list/campaign for the
--    signed-in agent. SECURITY DEFINER so it can write the ledger under the
--    tightened RLS above. (Dev convenience; the "Load sample data" button.)
create or replace function public.seed_sample_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_design uuid;
  v_list uuid;
  v_campaign uuid;
  v_deliverable integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select email, coalesce(return_name, full_name, '')
    into v_email, v_name from profiles where id = v_uid;

  insert into designs (profile_id, name, source, template_id, template_kind, fields)
  values (v_uid, 'Sample · Just Listed', 'template', 'tpl_just_listed', 'just_listed',
    jsonb_build_object(
      'headline', 'Just Listed',
      'subhead', 'New on the market in your neighborhood',
      'body', 'A beautiful new home just hit the market nearby. Curious what your home is worth in today''s market? Reach out for a free, no-pressure estimate.',
      'cta', 'Scan for the full listing',
      'property_photo_url', null, 'headshot_url', null,
      'price', '$749,000', 'beds', '4', 'baths', '3', 'sqft', '2,450',
      'property_address', '123 Maple Avenue', 'event_date', '', 'event_time', '',
      'agent_name', v_name, 'agent_phone', '(512) 555-0142', 'agent_email', v_email))
  returning id into v_design;

  insert into contact_lists (profile_id, name, contact_count)
  values (v_uid, 'Sample · 78704 neighborhood', 40) returning id into v_list;

  insert into contacts (list_id, profile_id, full_name, address_line1, city, state, zip, lob_verification_status)
  select v_list, v_uid, 'Sample Resident ' || g, (100 + g) || ' Sample St', 'Austin', 'TX', '78704',
         case when g % 12 = 0 then 'undeliverable' else 'verified' end
  from generate_series(1, 40) g;

  select count(*) into v_deliverable from contacts
   where list_id = v_list and lob_verification_status = 'verified';

  -- grant credits so the demo send leaves a positive balance
  insert into credit_transactions (profile_id, delta, reason, reference_id)
  values (v_uid, 500, 'purchase', 'seed_sample');

  insert into campaigns (profile_id, name, design_id, contact_list_id, scheduled_at, status, piece_count, credit_cost)
  values (v_uid, 'Sample · Spring farming', v_design, v_list, null, 'sent', v_deliverable, v_deliverable)
  returning id into v_campaign;

  insert into mail_pieces (campaign_id, contact_id, profile_id, lob_id, status, scan_count, delivered_at)
  select v_campaign, c.id, v_uid, 'psc_mock_' || substr(md5(random()::text), 1, 12),
         case when (c.rn % 5) <> 0 then 'delivered' else 'in_transit' end,
         case when (c.rn % 5) <> 0 and (c.rn % 3) = 0 then 1 else 0 end,
         case when (c.rn % 5) <> 0 then now() else null end
  from (select id, row_number() over () - 1 as rn from contacts
        where list_id = v_list and profile_id = v_uid and lob_verification_status = 'verified') c;

  insert into scans (mail_piece_id, source, raw_event)
  select id, 'lob', null from mail_pieces where campaign_id = v_campaign and scan_count > 0;

  insert into credit_transactions (profile_id, delta, reason, reference_id)
  values (v_uid, -v_deliverable, 'campaign_send', v_campaign::text);
end; $$;

grant execute on function public.seed_sample_data() to authenticated;
grant execute on function public.create_campaign(text, uuid, uuid, timestamptz, boolean) to authenticated;

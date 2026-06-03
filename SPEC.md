# Postcard Platform — Phase 1 Build Spec

## 1. What we're building

A web app where real estate agents log in, send postcard mail campaigns, and track results. Phase 1 is a complete, sellable MVP. We are NOT building everything at once — read the scope carefully.

The core loop:
1. Agent signs up and logs in.
2. Agent buys credits (per-piece) or subscribes (monthly plan with rollover credits).
3. Agent provides a postcard design (uploads their own, or picks one of our templates).
4. Agent uploads a contact list (CSV of mailing addresses).
5. Agent creates a campaign: pick design + list + send date, confirm credit cost.
6. System mails each postcard via Lob, with a Lob-generated QR code on each piece for scan tracking.
7. Dashboard shows sends, deliveries, and QR scans, plus current credit balance.

## 2. Build approach

We are building **frontend-first**. Milestone 1 builds the full UI against a typed mock data layer that mirrors the data model in section 4, behind a clean interface. This lets us iterate on design before any real backend exists. Later milestones replace the mock layer with the real backend behind that same interface — so the UI is never rewritten, only re-wired. Do not entangle UI components with throwaway mock data; keep the data access behind an interface.

## 3. Phase 1 scope

### In scope
- Email/password auth + agent accounts (each agent is their own tenant).
- Stripe billing: per-piece credit purchases AND monthly subscription with credit rollover.
- A credit/wallet system with a transaction ledger as the source of truth.
- Upload own postcard design (front + back images), OR personalize a built-in template (2–3 layouts) by adding a headshot, property photo, headline/body copy, and property details (price, beds, baths, sqft, address) plus agent contact — composited onto the layout.
- Upload contact list via CSV; verify addresses through Lob before sending.
- Campaign creation with scheduled or immediate send.
- Audience tiers at campaign time: **self-service** (agent uploads their own list — base rate, 1 credit/postcard) vs **managed** ("build my list for me" — higher per-piece rate). Self-service is the functional send path; managed captures a request only (address sourcing itself is out of scope — see below). Credits-per-piece is the single pricing lever (see `src/lib/billing.ts` `CREDITS_PER_PIECE`).
- Lob postcard sending, one piece per contact, with Lob's native QR code enabled per piece.
- QR scan tracking via Lob's `postcard.viewed` events (no custom redirect to build).
- Dashboard: campaign list, per-campaign send/delivery/scan counts, credit balance, billing history.

### Explicitly OUT of scope (do not build, do not stub elaborate placeholders)
- Radius / area-based address sourcing (EDDM). Agents bring their own lists in Phase 1. (The "build my list for me" managed tier shows pricing and records a request, but does NOT auto-source addresses yet — that sourcing engine is the out-of-scope part.)
- MLS / Zillow link auto-pull of property data.
- Multi-user teams/organizations. One login = one agent = one tenant.
- Agent-to-agent sharing, white-labeling.
- (Added post-Phase-1) A minimal **admin area** now exists: an admin (profiles.is_admin) can view all orders platform-wide and fulfill "build my list for me" (managed) orders by uploading the address list. This is intentionally scoped to orders + full-service fulfillment, not a full super-dashboard.
- Custom QR redirect / branded landing pages (we use Lob's native QR in Phase 1; revisit later only if we want to control the scan destination).

## 4. Data model

Use Postgres (via Supabase). The mock data layer in milestone 1 should mirror these shapes. Suggested tables:

- **profiles** — one row per agent. Links to Supabase auth user. Fields: id (=auth uid), email, full_name, company_name, return_address fields (name/line1/line2/city/state/zip), stripe_customer_id, created_at.
- **credit_wallets** — id, profile_id, balance (integer credits), updated_at. One per agent.
- **credit_transactions** — ledger. id, profile_id, delta (+/- integer), reason (enum: purchase, subscription_grant, rollover, campaign_send, refund, adjustment), reference_id, created_at. The wallet balance must always equal the sum of its transactions — never edit balance directly without writing a transaction.
- **subscriptions** — id, profile_id, stripe_subscription_id, plan, status, current_period_start, current_period_end, monthly_credit_grant.
- **designs** — id, profile_id, name, source (enum: uploaded, template), front_image_url (nullable), back_image_url (nullable), template_id (nullable), template_kind (nullable), fields (jsonb, nullable), created_at. For source=uploaded the image URLs hold the art; for source=template the art is rendered from `fields` (personalization data: headline, subhead, body, cta, property_photo_url, headshot_url, price, beds, baths, sqft, property_address, event_date/time, agent_name/phone/email) onto the chosen `template_kind` layout.
- **templates** — id, name, kind (enum: just_listed, just_sold, open_house), active, defaults (jsonb sample field values to prefill the personalize form). (Seed 2–3 personalizable layouts.)
- **contact_lists** — id, profile_id, name, contact_count, created_at.
- **contacts** — id, list_id, profile_id, full_name, address_line1, address_line2, city, state, zip, lob_verification_status (enum: unverified, verified, undeliverable), created_at.
- **campaigns** — id, profile_id, name, design_id, contact_list_id, scheduled_at (nullable = send now), status (enum: draft, scheduled, sending, sent, failed, canceled), piece_count, credit_cost, created_at.
- **mail_pieces** — one row per postcard sent. id, campaign_id, contact_id, profile_id, lob_id, status (enum: created, in_transit, delivered, returned, failed), scan_count (integer, default 0), created_at, delivered_at (nullable).
- **scans** — id, mail_piece_id, scanned_at, source (default 'lob'), raw_event (jsonb, nullable). Populated from Lob `postcard.viewed` events. A piece can have many scans.

## 5. Integration wiring

### Stripe (billing + credits)
- One Stripe Customer per agent (store stripe_customer_id on profile).
- **Per-piece purchase:** Stripe Checkout for a credit pack → on `checkout.session.completed` webhook, write a `credit_transactions` row (+N, reason=purchase) and increment wallet.
- **Subscription:** Checkout in subscription mode → on each `invoice.paid` webhook, grant that plan's monthly credits (reason=subscription_grant). **Rollover = do NOT reset the balance; just add the new grant on top.** Unused credits persist.
- Handle `customer.subscription.updated` / `deleted` to update subscription status.
- The credit ledger is the source of truth for entitlement. Never let a campaign send if wallet balance < piece_count.

### Lob (mail + QR scan tracking)
- Before a campaign sends, run each contact through Lob **address verification**; mark undeliverable ones and exclude them (don't charge credits for those).
- On send (immediate or when the scheduler fires a scheduled campaign): for each deliverable contact, create a Lob postcard with the design's front/back and the to/from addresses, **with Lob's QR code feature enabled** on the piece. For uploaded designs the front/back are the stored images; for template designs, render the personalized layout (from `fields`) to an image/HTML at send time and use that as the front (the back carries the message + return address + QR).
- **Stamp each Lob piece with metadata** containing our campaign_id and profile_id, so Lob events come back self-describing and reconciliation is easy.
- Store the returned Lob id on the mail_piece. Debit one credit per piece created (one `credit_transactions` row total for the campaign, reason=campaign_send, delta = -piece_count).
- **Use the Lob TEST key during all development** — it does not mail real pieces, and note that test-environment pieces do NOT emit tracking or scan events. Verify webhook wiring in test mode; verify real delivery/scan data only during the pre-launch live check.
- **Lob test-mode quirk (dev only):** address *verification* returns canned results driven by trigger values (`address_line1`='deliverable'/'undeliverable', zip `11111`), while postcard *creation* still validates the destination address and rejects clearly-invalid ones. So in test mode a trigger-"verified" address can fail at send, and a real address fails verification — no single address satisfies both. On a LIVE key, real addresses verify and send normally. For reviewing the dashboard without a live key, "Load sample data" seeds pieces directly.

### Tracking & analytics (ingest, then segment in OUR app)
- Lob does not know our tenant model. Segmentation by client/campaign happens in our app: we match every Lob event on the stored `lob_id` (and/or the metadata we stamped) to the right mail_piece → campaign → agent.
- Set up a `/webhooks/lob` route that ingests:
  - **Delivery tracking events** (created, in transit, in local area, processed for delivery, delivered, returned) → update `mail_pieces.status` and `delivered_at`.
  - **`postcard.viewed` events** (QR scans) → insert a `scans` row and increment `mail_pieces.scan_count`.
- The dashboard rolls these up by agent and by campaign. Lob's QR Analytics endpoint can also be queried to see which recipient scanned and when, if needed for backfill/reconciliation.

### Scheduling
- Campaigns with a future `scheduled_at` sit in status=scheduled. A cron/job worker runs on an interval, finds due campaigns, sets status=sending, executes the Lob sends, then sets status=sent (or failed). Make the send idempotent so a retried job never double-mails (check for existing mail_pieces / use Lob idempotency keys).

## 6. User flow to implement (the screens)

1. Sign up / log in.
2. Onboarding: set return address (required before sending).
3. Billing page: buy credits or subscribe; show current balance; Stripe customer portal link.
4. Designs page: personalize a template (upload headshot + property photo, enter headline/body/property details, live preview), or upload your own front/back.
5. Contacts page: upload CSV, see verification results.
6. New campaign: choose audience tier (upload my list / build my list for me), pick design, then either a list + send-now/schedule (self-service) or target area + quantity (managed request); show credit cost (pieces × per-piece rate) and confirm.
7. Dashboard: campaigns table with status, pieces, delivered, scans; credit balance widget.
8. (Admin only) Admin area: all orders across agents; full-service ("build my list for me") orders sit in `awaiting_list` until the admin uploads the address list and confirms, which pushes them to Lob (debiting the agent at the managed rate).

## 7. Build order (milestones — build and have me review one at a time)

1. **Frontend with mock data.** Scaffold Next.js (App Router) + TypeScript + Tailwind, deployable to Vercel. Build all screens from section 6 against a typed mock data layer that mirrors the section 4 data model, behind a clean data-access interface. No real backend, no real keys. This is where I iterate on the design — build one screen at a time and stop for my review.
2. **Auth + profiles.** Supabase Auth (signup/login), profile row, return-address onboarding, Row Level Security so agents see only their own data. Replace the mock auth/profile data behind the existing interface.
3. **Schema + wallet.** All tables in real Postgres, the credit ledger, and the invariant that balance = sum(transactions). Swap the mock data layer for real Supabase queries behind the same interface.
4. **Billing.** Stripe Checkout for credit packs + subscription, webhooks, rollover logic. Test mode only.
5. **Designs + contacts.** Design upload to Supabase Storage, templates seed, CSV upload, Lob address verification.
6. **Campaigns + send.** Campaign creation, credit-cost check, immediate send via Lob (test key) with QR enabled per piece and metadata stamped, credit debit.
7. **Tracking + webhooks.** `/webhooks/lob` ingesting delivery tracking events and `postcard.viewed` (QR scan) events; update statuses and scan counts.
8. **Scheduling.** Scheduled campaigns fire via the job worker, idempotent.
9. **Dashboard.** Counts and balances pulled together, segmented by agent and campaign.

## 8. Environment variables (all in .env.local, gitignored, NEVER committed)
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY (test), STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test)
- LOB_API_KEY (test)
- APP_URL

## 9. Non-negotiables
- Stripe and Lob in TEST mode for the entire build. Live keys only after end-to-end verification.
- Secrets only in .env.local; add it to .gitignore in milestone 1.
- The credit ledger is the source of truth; the wallet balance is derived, never hand-edited.
- A campaign can never send more pieces than the agent has credits for.
- Sends must be idempotent — no double-mailing on retries.
- Keep UI data access behind an interface so the mock layer can be swapped for the real backend without rewriting components.
- Stop after each milestone for review before moving on.
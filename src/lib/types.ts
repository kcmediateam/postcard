/**
 * Domain types — mirror the SPEC §4 data model exactly.
 * These are the shapes every screen reads/writes through the DataProvider.
 * When the real Supabase backend lands, rows map onto these same types.
 *
 * Convention: all timestamps are ISO 8601 strings; all ids are strings.
 */

// ---- enums (as string unions) -------------------------------------------

export type CreditTransactionReason =
  | "purchase"
  | "subscription_grant"
  | "rollover"
  | "campaign_send"
  | "refund"
  | "adjustment";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type DesignSource = "uploaded" | "template";

export type AddressVerificationStatus =
  | "unverified"
  | "verified"
  | "undeliverable";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "canceled";

export type MailPieceStatus =
  | "created"
  | "in_transit"
  | "delivered"
  | "returned"
  | "failed";

// ---- a US mailing address (reused across profile + contacts) -------------

export interface Address {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
}

// ---- tables --------------------------------------------------------------

/** profiles — one row per agent (= one tenant). Links to the auth user. */
export interface Profile {
  id: string; // = auth uid
  email: string;
  full_name: string | null;
  company_name: string | null;
  // return address (required before sending)
  return_name: string | null;
  return_line1: string | null;
  return_line2: string | null;
  return_city: string | null;
  return_state: string | null;
  return_zip: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

/** credit_wallets — one per agent. balance is DERIVED from the ledger. */
export interface CreditWallet {
  id: string;
  profile_id: string;
  balance: number; // integer credits = sum of credit_transactions.delta
  updated_at: string;
}

/** credit_transactions — the ledger. Source of truth for entitlement. */
export interface CreditTransaction {
  id: string;
  profile_id: string;
  delta: number; // +/- integer credits
  reason: CreditTransactionReason;
  reference_id: string | null; // e.g. stripe session id, campaign id
  created_at: string;
}

/** subscriptions — monthly plan with credit grant + rollover. */
export interface Subscription {
  id: string;
  profile_id: string;
  stripe_subscription_id: string;
  plan: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  monthly_credit_grant: number;
}

/** designs — an agent's postcard (uploaded or from a template). */
export interface Design {
  id: string;
  profile_id: string;
  name: string;
  source: DesignSource;
  front_image_url: string;
  back_image_url: string;
  template_id: string | null;
  created_at: string;
}

/** templates — built-in designs to pick from (seed 2–3). */
export interface Template {
  id: string;
  name: string;
  front_image_url: string;
  back_image_url: string;
  active: boolean;
}

/** contact_lists — a named uploaded list. */
export interface ContactList {
  id: string;
  profile_id: string;
  name: string;
  contact_count: number;
  created_at: string;
}

/** contacts — one recipient row inside a list. */
export interface Contact {
  id: string;
  list_id: string;
  profile_id: string;
  full_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  lob_verification_status: AddressVerificationStatus;
  created_at: string;
}

/** campaigns — design + list + schedule + cost. */
export interface Campaign {
  id: string;
  profile_id: string;
  name: string;
  design_id: string;
  contact_list_id: string;
  scheduled_at: string | null; // null = send now
  status: CampaignStatus;
  piece_count: number;
  credit_cost: number;
  created_at: string;
}

/** mail_pieces — one row per postcard sent. Uses Lob's native QR (no token). */
export interface MailPiece {
  id: string;
  campaign_id: string;
  contact_id: string;
  profile_id: string;
  lob_id: string | null;
  status: MailPieceStatus;
  scan_count: number; // incremented from Lob postcard.viewed events
  created_at: string;
  delivered_at: string | null;
}

/** scans — a QR view on a mail piece, ingested from Lob (one piece → many). */
export interface Scan {
  id: string;
  mail_piece_id: string;
  scanned_at: string;
  source: string; // default 'lob'
  raw_event: Record<string, unknown> | null; // the Lob postcard.viewed payload
}

// ---- auth session (provider-agnostic) ------------------------------------

export interface AuthUser {
  id: string;
  email: string;
}

export interface Session {
  user: AuthUser;
  profile: Profile;
}

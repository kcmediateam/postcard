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
  | "adjustment"
  | "promo";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type DesignSource = "uploaded" | "template";

/** Lob postcard sizes we support. Templates render 4x6; uploads pick their own. */
export type PostcardSize = "4x6" | "6x9" | "6x11";

/** Built-in personalizable template layouts. */
export type TemplateKind =
  | "just_listed"
  | "just_sold"
  | "coming_soon"
  | "open_house"
  | "market_update"
  | "neighbor_intro";

/** Visual theme for a template. */
export type DesignTheme = "light" | "dark" | "bold";

/**
 * Front-art layout family — decoupled from `kind` so a template can pick a
 * distinct composition (e.g. an elegant diagonal split) regardless of its
 * marketing kind. The back always renders the functional QR/address card.
 */
export type PostcardLayout =
  | "showcase"
  | "intro"
  | "elegant_split"
  | "photo_banner"
  | "triptych"
  | "summary"
  | "aerial"
  | "open_house"
  | "badge";

/**
 * Personalization data for a template-based design. The postcard art is
 * rendered from these fields (so the agent's photos, copy, and property data
 * are composited onto the chosen layout). Photos are stored as (downscaled)
 * data URLs in the mock; the real backend would store Storage URLs.
 */
export interface DesignFields {
  headline: string;
  subhead: string;
  body: string; // back-of-card message
  cta: string;
  property_photo_url: string | null;
  property_photo_url_2: string | null;
  property_photo_url_3: string | null;
  headshot_url: string | null;
  logo_url: string | null;
  testimonial: string;
  testimonial_author: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  property_address: string;
  // open house only
  event_date: string;
  event_time: string;
  // agent contact (prefilled from profile, editable)
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  // style overrides (empty string = use the template's default)
  accent: string;
  font: string;
  // where the printed QR code should link (Lob encodes this at send time)
  qr_url: string;
  // return ("FROM") address override — empty falls back to the profile
  return_name: string;
  return_company: string;
  return_line1: string;
  return_city: string;
  return_state: string;
  return_zip: string;
  // compliance: show the REALTOR® mark (Equal Housing always shows)
  nar_member: string; // "yes" = NAR member → render REALTOR® logo
  // bullet/feature list (one per line) for checklist-style layouts
  features: string;
  // Lob postcard size (uploaded designs). Absent → 4x6.
  size?: PostcardSize;
  // Printed layout style: "editorial" | "banner" | "service". Absent → editorial.
  layout?: string;
  // Optional eyebrow/tag over the headline (lets non-real-estate use the layouts).
  eyebrow?: string;
  // "other" hides the real-estate compliance marks (Equal Housing / REALTOR®).
  industry?: string;
}

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
  | "canceled"
  | "awaiting_list"; // managed full-service order, pending admin fulfillment

export type AudienceTier = "self_service" | "managed";

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
  is_admin: boolean;
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

/**
 * designs — an agent's postcard. Either:
 *  - source "uploaded": front_image_url + back_image_url hold the art.
 *  - source "template": template_id + template_kind + fields; art is rendered
 *    from the fields onto the chosen layout.
 */
export interface Design {
  id: string;
  profile_id: string;
  name: string;
  source: DesignSource;
  front_image_url: string | null;
  back_image_url: string | null;
  template_id: string | null;
  template_kind: TemplateKind | null;
  fields: DesignFields | null;
  /** For Canva-imported designs: link back to the Canva editor (round-trip). */
  external_edit_url: string | null;
  created_at: string;
}

/** templates — built-in personalizable layouts. */
export interface Template {
  id: string;
  name: string;
  kind: TemplateKind;
  theme: DesignTheme;
  /** accent hex (overrides the theme default). */
  accent: string;
  /** front-art layout family (defaults by kind when omitted). */
  layout?: PostcardLayout;
  active: boolean;
  /** sample copy/property data to prefill the personalize form. */
  defaults: DesignFields;
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
  contact_list_id: string | null; // null for managed orders until the list is built
  scheduled_at: string | null; // null = send now
  status: CampaignStatus;
  audience_tier: AudienceTier;
  target_area: string | null; // managed: requested ZIP/neighborhood
  requested_quantity: number | null; // managed: how many to source
  piece_count: number;
  credit_cost: number;
  qr_url?: string | null; // per-campaign QR override (incl. UTMs)
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

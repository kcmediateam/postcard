import type {
  Campaign,
  Contact,
  ContactList,
  CreditTransaction,
  CreditWallet,
  Design,
  DesignFields,
  MailPiece,
  PostcardSize,
  Profile,
  Session,
  Subscription,
  Template,
} from "@/lib/types";

/**
 * DataProvider — the single seam between the UI and "the backend".
 *
 * Today this is implemented by an in-memory mock (src/lib/data/mock/).
 * Later, a Supabase-backed implementation will satisfy the SAME interface
 * (auth via Supabase Auth, rows via Postgres + RLS, billing via Stripe,
 * mail via Lob) and components will not change.
 *
 * Every method is async on purpose, so the mock and the real backend are
 * shape-compatible. The interface grows one screen at a time.
 */
export interface DataProvider {
  // ---- auth (Screen 1: Sign up / Log in) --------------------------------

  /** Create an agent account + profile + empty wallet, and sign in. */
  signUp(input: SignUpInput): Promise<Session>;

  /** Sign in with email + password. Throws AuthError on bad credentials. */
  signIn(email: string, password: string): Promise<Session>;

  /** Clear the current session. */
  signOut(): Promise<void>;

  /** The current session, or null if signed out. */
  getSession(): Promise<Session | null>;

  // ---- profile (Screen 2: Onboarding will extend usage) -----------------

  /** Patch the signed-in agent's profile (e.g. return address). */
  updateProfile(patch: Partial<Profile>): Promise<Profile>;

  // ---- billing & credits (Screen 3: Billing) ----------------------------

  /** The agent's wallet. balance is always sum(credit_transactions). */
  getWallet(): Promise<CreditWallet>;

  /** The credit ledger for the agent, newest first. */
  listCreditTransactions(): Promise<CreditTransaction[]>;

  /** The agent's current subscription, or null if none/canceled. */
  getSubscription(): Promise<Subscription | null>;

  /**
   * Buy a one-time credit pack.
   * Real impl: Stripe Checkout → webhook writes the ledger row. Mock: applies
   * the +credits ledger row immediately so the UI flow is reviewable.
   */
  purchaseCreditPack(packId: string): Promise<void>;

  /**
   * Subscribe to a monthly plan (grants the first month's credits on top of
   * the existing balance — rollover semantics, never a reset).
   */
  subscribeToPlan(planId: string): Promise<void>;

  /** Cancel the active subscription (keeps already-granted credits). */
  cancelSubscription(): Promise<void>;

  /** Open the Stripe customer portal (manage/cancel subscription, receipts). */
  openBillingPortal(): Promise<void>;

  // ---- designs & templates (Screen 4: Designs) --------------------------

  /** The agent's saved postcard designs, newest first. */
  listDesigns(): Promise<Design[]>;

  /** Built-in personalizable templates (active only). */
  listTemplates(): Promise<Template[]>;

  /**
   * Save an uploaded design (front + back).
   * Real impl: images go to Supabase Storage and the URLs are stored. Mock:
   * accepts (downscaled) data URLs so the uploaded image is visible immediately.
   */
  createDesignFromUpload(input: CreateUploadedDesignInput): Promise<Design>;

  /** Create a personalized design from a template + filled fields. */
  createTemplateDesign(input: CreateTemplateDesignInput): Promise<Design>;

  /** Update a design's name and/or personalization fields. */
  updateDesign(designId: string, patch: UpdateDesignInput): Promise<Design>;

  /** Delete one of the agent's designs. */
  deleteDesign(designId: string): Promise<void>;

  // ---- contacts (Screen 5: Contacts) ------------------------------------

  /** The agent's uploaded contact lists, newest first. */
  listContactLists(): Promise<ContactList[]>;

  /** Verification breakdown for a list (for summaries). */
  getContactListStats(listId: string): Promise<VerificationStats>;

  /** Contacts within a list. */
  listContacts(listId: string): Promise<Contact[]>;

  /** Create a list from parsed CSV rows (contacts start unverified). */
  createContactList(input: CreateContactListInput): Promise<ContactList>;

  /**
   * Run address verification on a list.
   * Real impl: Lob address verification per contact. Mock: deterministic
   * verified/undeliverable assignment so results are visible.
   */
  verifyContactList(listId: string): Promise<VerificationStats>;

  /** Delete a list and its contacts. */
  deleteContactList(listId: string): Promise<void>;

  // ---- campaigns (Screen 6: New campaign) -------------------------------

  /** All campaigns for the agent, newest first (used by the dashboard too). */
  listCampaigns(): Promise<Campaign[]>;

  /**
   * Cost preview for sending to a list: how many pieces would actually mail
   * (verified only) and the credit cost (1 credit per deliverable piece).
   */
  previewCampaign(contactListId: string): Promise<CampaignPreview>;

  /**
   * Create a campaign. If send_now, runs the (mock) Lob send immediately:
   * creates one mail_piece per deliverable contact and debits the ledger once
   * (reason=campaign_send, delta=-piece_count). Throws InsufficientCreditsError
   * if the wallet can't cover it. If scheduled, no debit until it fires.
   */
  createCampaign(input: CreateCampaignInput): Promise<Campaign>;

  /**
   * Create a managed ("build my list for me") order. It is persisted as a
   * campaign in 'awaiting_list' status — no Lob send, no debit — until an admin
   * uploads the address list and confirms.
   */
  createManagedCampaign(input: CreateManagedCampaignInput): Promise<Campaign>;

  /** Per-campaign rollup of piece statuses + scans (dashboard). */
  getCampaignStats(campaignId: string): Promise<CampaignStats>;

  /** Per-piece rows for a campaign (with recipient name) for the drill-in. */
  listCampaignPieces(campaignId: string): Promise<CampaignPiece[]>;

  /** Reconcile a campaign's piece statuses with Lob (missed webhooks). */
  syncCampaignStatus(campaignId: string): Promise<{ total: number; updated: number }>;

  /** Delete a campaign and its pieces/scans (cascade). Already-mailed postcards
   * at Lob are unaffected; spent credits are not refunded. */
  deleteCampaign(campaignId: string): Promise<void>;

  /** Public, read-only tracking link a client can use (no login). */
  getCampaignShareUrl(campaignId: string): Promise<string>;

  /**
   * Demo convenience: populate a realistic completed campaign (with design,
   * verified list, delivered pieces, and scans) for the signed-in agent so the
   * dashboard has something to show. Mock-only; the real provider can no-op.
   */
  seedSampleData(): Promise<void>;
}

export interface CampaignStats {
  pieces: number;
  in_transit: number;
  delivered: number;
  returned: number;
  failed: number;
  scans: number;
}

export interface CampaignPiece extends MailPiece {
  contact_name: string;
}

export interface CampaignPreview {
  total: number; // contacts in the list
  deliverable: number; // verified → will mail & be charged
  undeliverable: number; // excluded, not charged
  unverified: number; // not yet verified
  credit_cost: number; // = deliverable
}

export interface CreateCampaignInput {
  name: string;
  design_id: string;
  contact_list_id: string;
  /** ISO timestamp to schedule, or null to send now. */
  scheduled_at: string | null;
  send_now: boolean;
}

export interface CreateManagedCampaignInput {
  name: string;
  design_id: string;
  target_area: string;
  quantity: number;
}

/** Thrown by createCampaign when balance < piece_count on an immediate send. */
export class InsufficientCreditsError extends Error {
  constructor(
    public readonly required: number,
    public readonly available: number
  ) {
    super(
      `Not enough credits: need ${required}, have ${available}.`
    );
    this.name = "InsufficientCreditsError";
  }
}

export interface CreateUploadedDesignInput {
  name: string;
  front_image_url: string;
  back_image_url: string;
  size?: PostcardSize;
  /** Where the printed QR code links (incl. any UTM params). */
  qr_url?: string;
  /** Per-design return ("From") address — overrides the profile's at send. */
  return_fields?: {
    return_name?: string;
    return_company?: string;
    return_line1?: string;
    return_city?: string;
    return_state?: string;
    return_zip?: string;
  };
}

export interface CreateTemplateDesignInput {
  name: string;
  template_id: string;
  fields: DesignFields;
}

export interface UpdateDesignInput {
  name?: string;
  fields?: DesignFields;
}

export interface NewContactInput {
  full_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
}

export interface CreateContactListInput {
  name: string;
  contacts: NewContactInput[];
}

export interface VerificationStats {
  total: number;
  verified: number;
  undeliverable: number;
  unverified: number;
}

export interface SignUpInput {
  email: string;
  password: string;
  full_name?: string;
}

/** Thrown by auth methods on recoverable user-facing failures. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

import type {
  AddressVerificationStatus,
  Campaign,
  Contact,
  ContactList,
  CreditTransaction,
  CreditTransactionReason,
  CreditWallet,
  Design,
  MailPiece,
  Profile,
  Scan,
  Session,
  Subscription,
  Template,
} from "@/lib/types";
import { creditCost, findCreditPack, findPlan } from "@/lib/billing";
import { US_STATES } from "@/lib/profile";
import { TEMPLATES, findTemplate, isHtmlLayout } from "@/lib/templates";
import {
  AuthError,
  InsufficientCreditsError,
  type CampaignPreview,
  type CampaignStats,
  type CreateCampaignInput,
  type CreateContactListInput,
  type CreateTemplateDesignInput,
  type CreateUploadedDesignInput,
  type DataProvider,
  type SignUpInput,
  type UpdateDesignInput,
  type VerificationStats,
} from "../provider";
import { loadDB, nowIso, persist, uid } from "./store";
import type { MockDB } from "./store";

/**
 * In-memory mock implementation of DataProvider.
 * Simulates a little network latency so loading states are visible while
 * you review the UI.
 */
const LATENCY_MS = 250;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function sessionFor(profile: Profile): Session {
  return { user: { id: profile.id, email: profile.email }, profile };
}

function requireUserId(db: MockDB): string {
  if (!db.current_user_id) throw new AuthError("Not signed in.");
  return db.current_user_id;
}

function walletFor(db: MockDB, userId: string): CreditWallet {
  let wallet = db.wallets.find((w) => w.profile_id === userId);
  if (!wallet) {
    wallet = {
      id: uid("wallet"),
      profile_id: userId,
      balance: 0,
      updated_at: nowIso(),
    };
    db.wallets.push(wallet);
  }
  return wallet;
}

/**
 * The ONLY way the mock changes a balance: write a ledger row, then set the
 * wallet balance to the running sum. Keeps balance = sum(transactions).
 */
function applyLedger(
  db: MockDB,
  userId: string,
  delta: number,
  reason: CreditTransactionReason,
  referenceId: string | null
): void {
  const created_at = nowIso();
  db.transactions.push({
    id: uid("txn"),
    profile_id: userId,
    delta,
    reason,
    reference_id: referenceId,
    created_at,
  });
  const wallet = walletFor(db, userId);
  wallet.balance = db.transactions
    .filter((t) => t.profile_id === userId)
    .reduce((sum, t) => sum + t.delta, 0);
  wallet.updated_at = created_at;
}

function addMonthIso(fromIso: string): string {
  const d = new Date(fromIso);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Stand-in for Lob address verification. Deterministic so re-verifying a list
 * gives stable results: obviously-bad rows are undeliverable, plus ~1-in-12 of
 * the rest to simulate real-world bad addresses.
 */
function verifyAddress(c: Contact): AddressVerificationStatus {
  const zipOk = /^\d{5}(-\d{4})?$/.test(c.zip.trim());
  const stateOk = US_STATES.some(
    (s) => s.code === c.state.trim().toUpperCase()
  );
  if (!c.address_line1.trim() || !zipOk || !stateOk) return "undeliverable";
  if (hashString(`${c.address_line1}|${c.zip}`) % 12 === 0)
    return "undeliverable";
  return "verified";
}

function statsFor(contacts: Contact[]): VerificationStats {
  return {
    total: contacts.length,
    verified: contacts.filter((c) => c.lob_verification_status === "verified")
      .length,
    undeliverable: contacts.filter(
      (c) => c.lob_verification_status === "undeliverable"
    ).length,
    unverified: contacts.filter(
      (c) => c.lob_verification_status === "unverified"
    ).length,
  };
}

export const mockProvider: DataProvider = {
  async signUp(input: SignUpInput): Promise<Session> {
    const db = loadDB();
    const email = input.email.trim().toLowerCase();

    if (!email || !input.password) {
      throw new AuthError("Email and password are required.");
    }
    if (input.password.length < 8) {
      throw new AuthError("Password must be at least 8 characters.");
    }
    if (db.credentials.some((c) => c.email === email)) {
      throw new AuthError("An account with that email already exists.");
    }

    const userId = uid("user");
    const created_at = nowIso();

    const profile: Profile = {
      id: userId,
      email,
      full_name: input.full_name?.trim() || null,
      company_name: null,
      return_name: null,
      return_line1: null,
      return_line2: null,
      return_city: null,
      return_state: null,
      return_zip: null,
      stripe_customer_id: null,
      is_admin: false,
      created_at,
    };

    db.profiles.push(profile);
    db.wallets.push({
      id: uid("wallet"),
      profile_id: userId,
      balance: 0,
      updated_at: created_at,
    });
    db.credentials.push({ user_id: userId, email, password: input.password });
    db.current_user_id = userId;
    persist();

    return delay(sessionFor(profile));
  },

  async signIn(email: string, password: string): Promise<Session> {
    const db = loadDB();
    const normalized = email.trim().toLowerCase();
    const cred = db.credentials.find((c) => c.email === normalized);

    if (!cred || cred.password !== password) {
      throw new AuthError("Incorrect email or password.");
    }

    const profile = db.profiles.find((p) => p.id === cred.user_id);
    if (!profile) {
      throw new AuthError("Account is missing a profile.");
    }

    db.current_user_id = cred.user_id;
    persist();
    return delay(sessionFor(profile));
  },

  async sendPasswordReset(): Promise<void> {
    return delay(undefined);
  },

  async updatePassword(): Promise<void> {
    return delay(undefined);
  },

  async signOut(): Promise<void> {
    const db = loadDB();
    db.current_user_id = null;
    persist();
    return delay(undefined);
  },

  async getSession(): Promise<Session | null> {
    const db = loadDB();
    if (!db.current_user_id) return null;
    const profile = db.profiles.find((p) => p.id === db.current_user_id);
    return profile ? sessionFor(profile) : null;
  },

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const db = loadDB();
    if (!db.current_user_id) throw new AuthError("Not signed in.");
    const profile = db.profiles.find((p) => p.id === db.current_user_id);
    if (!profile) throw new AuthError("Profile not found.");

    Object.assign(profile, patch, { id: profile.id, email: profile.email });
    persist();
    return delay({ ...profile });
  },

  async getWallet(): Promise<CreditWallet> {
    const db = loadDB();
    const userId = requireUserId(db);
    return delay({ ...walletFor(db, userId) });
  },

  async listCreditTransactions(): Promise<CreditTransaction[]> {
    const db = loadDB();
    const userId = requireUserId(db);
    const rows = db.transactions
      .filter((t) => t.profile_id === userId)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return delay(rows.map((t) => ({ ...t })));
  },

  async getSubscription(): Promise<Subscription | null> {
    const db = loadDB();
    const userId = requireUserId(db);
    const sub =
      db.subscriptions.find(
        (s) => s.profile_id === userId && s.status !== "canceled"
      ) ?? null;
    return delay(sub ? { ...sub } : null);
  },

  async purchaseCreditPack(packId: string): Promise<void> {
    const db = loadDB();
    const userId = requireUserId(db);
    const pack = findCreditPack(packId);
    if (!pack) throw new Error("Unknown credit pack.");
    applyLedger(db, userId, pack.credits, "purchase", `cs_mock_${uid("cs")}`);
    persist();
    return delay(undefined);
  },

  async subscribeToPlan(planId: string): Promise<void> {
    const db = loadDB();
    const userId = requireUserId(db);
    const plan = findPlan(planId);
    if (!plan) throw new Error("Unknown plan.");

    const now = nowIso();
    const existing = db.subscriptions.find(
      (s) => s.profile_id === userId && s.status !== "canceled"
    );
    if (existing) {
      existing.plan = plan.id;
      existing.monthly_credit_grant = plan.monthly_credits;
      existing.status = "active";
      existing.current_period_start = now;
      existing.current_period_end = addMonthIso(now);
    } else {
      db.subscriptions.push({
        id: uid("sub"),
        profile_id: userId,
        stripe_subscription_id: `sub_mock_${uid("s")}`,
        plan: plan.id,
        status: "active",
        current_period_start: now,
        current_period_end: addMonthIso(now),
        monthly_credit_grant: plan.monthly_credits,
      });
    }
    // First month's grant lands on top of the existing balance (rollover).
    applyLedger(
      db,
      userId,
      plan.monthly_credits,
      "subscription_grant",
      plan.id
    );
    persist();
    return delay(undefined);
  },

  async cancelSubscription(): Promise<void> {
    const db = loadDB();
    const userId = requireUserId(db);
    const sub = db.subscriptions.find(
      (s) => s.profile_id === userId && s.status !== "canceled"
    );
    if (sub) sub.status = "canceled";
    persist();
    return delay(undefined);
  },

  async openBillingPortal(): Promise<void> {
    throw new Error(
      "The customer portal is available once Stripe billing is connected."
    );
  },

  async listDesigns(): Promise<Design[]> {
    const db = loadDB();
    const userId = requireUserId(db);
    const rows = db.designs
      .filter((d) => d.profile_id === userId)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return delay(rows.map((d) => ({ ...d })));
  },

  async listTemplates(): Promise<Template[]> {
    return delay(
      TEMPLATES.filter((t) => t.active && isHtmlLayout(t.defaults)).map((t) => ({
        ...t,
      }))
    );
  },

  async createDesignFromUpload(
    input: CreateUploadedDesignInput
  ): Promise<Design> {
    const db = loadDB();
    const userId = requireUserId(db);
    if (!input.name.trim()) throw new Error("Design name is required.");
    if (!input.front_image_url || !input.back_image_url) {
      throw new Error("Both front and back images are required.");
    }
    const fieldsObj: Record<string, unknown> = {};
    if (input.size) fieldsObj.size = input.size;
    if (input.qr_url?.trim()) fieldsObj.qr_url = input.qr_url.trim();
    for (const [k, v] of Object.entries(input.return_fields ?? {})) {
      if (typeof v === "string" && v.trim()) fieldsObj[k] = v.trim();
    }
    const design: Design = {
      id: uid("design"),
      profile_id: userId,
      name: input.name.trim(),
      source: "uploaded",
      front_image_url: input.front_image_url,
      back_image_url: input.back_image_url,
      template_id: null,
      template_kind: null,
      fields: Object.keys(fieldsObj).length
        ? (fieldsObj as unknown as Design["fields"])
        : null,
      external_edit_url: null,
      created_at: nowIso(),
    };
    db.designs.push(design);
    persist();
    return delay({ ...design });
  },

  async createTemplateDesign(
    input: CreateTemplateDesignInput
  ): Promise<Design> {
    const db = loadDB();
    const userId = requireUserId(db);
    if (!input.name.trim()) throw new Error("Design name is required.");
    const template = findTemplate(input.template_id);
    if (!template) throw new Error("Unknown template.");
    const design: Design = {
      id: uid("design"),
      profile_id: userId,
      name: input.name.trim(),
      source: "template",
      front_image_url: null,
      back_image_url: null,
      template_id: template.id,
      template_kind: template.kind,
      fields: { ...input.fields },
      external_edit_url: null,
      created_at: nowIso(),
    };
    db.designs.push(design);
    persist();
    return delay({ ...design });
  },

  async updateDesign(
    designId: string,
    patch: UpdateDesignInput
  ): Promise<Design> {
    const db = loadDB();
    const userId = requireUserId(db);
    const design = db.designs.find(
      (d) => d.id === designId && d.profile_id === userId
    );
    if (!design) throw new Error("Design not found.");
    if (patch.name !== undefined) design.name = patch.name.trim();
    if (patch.fields !== undefined) design.fields = { ...patch.fields };
    persist();
    return delay({ ...design });
  },

  async deleteDesign(designId: string): Promise<void> {
    const db = loadDB();
    const userId = requireUserId(db);
    db.designs = db.designs.filter(
      (d) => !(d.id === designId && d.profile_id === userId)
    );
    persist();
    return delay(undefined);
  },

  async listContactLists(): Promise<ContactList[]> {
    const db = loadDB();
    const userId = requireUserId(db);
    const rows = db.contact_lists
      .filter((l) => l.profile_id === userId)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return delay(rows.map((l) => ({ ...l })));
  },

  async getContactListStats(listId: string): Promise<VerificationStats> {
    const db = loadDB();
    const userId = requireUserId(db);
    const contacts = db.contacts.filter(
      (c) => c.list_id === listId && c.profile_id === userId
    );
    return delay(statsFor(contacts));
  },

  async listContacts(listId: string): Promise<Contact[]> {
    const db = loadDB();
    const userId = requireUserId(db);
    const rows = db.contacts
      .filter((c) => c.list_id === listId && c.profile_id === userId)
      .map((c) => ({ ...c }));
    return delay(rows);
  },

  async createContactList(
    input: CreateContactListInput
  ): Promise<ContactList> {
    const db = loadDB();
    const userId = requireUserId(db);
    if (!input.name.trim()) throw new Error("List name is required.");
    if (input.contacts.length === 0)
      throw new Error("No valid contacts to import.");

    const created_at = nowIso();
    const list: ContactList = {
      id: uid("list"),
      profile_id: userId,
      name: input.name.trim(),
      contact_count: input.contacts.length,
      created_at,
    };
    db.contact_lists.push(list);

    for (const c of input.contacts) {
      db.contacts.push({
        id: uid("contact"),
        list_id: list.id,
        profile_id: userId,
        full_name: c.full_name,
        address_line1: c.address_line1,
        address_line2: c.address_line2,
        city: c.city,
        state: c.state,
        zip: c.zip,
        lob_verification_status: "unverified",
        created_at,
      });
    }
    persist();
    return delay({ ...list });
  },

  async verifyContactList(listId: string): Promise<VerificationStats> {
    const db = loadDB();
    const userId = requireUserId(db);
    const contacts = db.contacts.filter(
      (c) => c.list_id === listId && c.profile_id === userId
    );
    for (const c of contacts) {
      c.lob_verification_status = verifyAddress(c);
    }
    persist();
    return delay(statsFor(contacts));
  },

  async deleteContactList(listId: string): Promise<void> {
    const db = loadDB();
    const userId = requireUserId(db);
    db.contact_lists = db.contact_lists.filter(
      (l) => !(l.id === listId && l.profile_id === userId)
    );
    db.contacts = db.contacts.filter(
      (c) => !(c.list_id === listId && c.profile_id === userId)
    );
    persist();
    return delay(undefined);
  },

  async deleteUnverifiedContacts(listId: string): Promise<number> {
    const db = loadDB();
    const userId = requireUserId(db);
    const removeIds = db.contacts
      .filter(
        (c) =>
          c.list_id === listId &&
          c.profile_id === userId &&
          (c.lob_verification_status === "undeliverable" ||
            c.lob_verification_status === "unverified")
      )
      .map((c) => c.id);
    db.contacts = db.contacts.filter((c) => !removeIds.includes(c.id));
    const list = db.contact_lists.find((l) => l.id === listId);
    if (list)
      list.contact_count = db.contacts.filter(
        (c) => c.list_id === listId
      ).length;
    persist();
    return delay(removeIds.length);
  },

  async listCampaigns(): Promise<Campaign[]> {
    const db = loadDB();
    const userId = requireUserId(db);
    const rows = db.campaigns
      .filter((c) => c.profile_id === userId)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return delay(rows.map((c) => ({ ...c })));
  },

  async previewCampaign(contactListId: string): Promise<CampaignPreview> {
    const db = loadDB();
    const userId = requireUserId(db);
    const contacts = db.contacts.filter(
      (c) => c.list_id === contactListId && c.profile_id === userId
    );
    const stats = statsFor(contacts);
    return delay({
      total: stats.total,
      deliverable: stats.verified,
      undeliverable: stats.undeliverable,
      unverified: stats.unverified,
      credit_cost: stats.verified,
    });
  },

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const db = loadDB();
    const userId = requireUserId(db);

    if (!input.name.trim()) throw new Error("Campaign name is required.");
    const design = db.designs.find(
      (d) => d.id === input.design_id && d.profile_id === userId
    );
    if (!design) throw new Error("Pick a design.");
    const list = db.contact_lists.find(
      (l) => l.id === input.contact_list_id && l.profile_id === userId
    );
    if (!list) throw new Error("Pick a contact list.");

    const deliverable = db.contacts.filter(
      (c) =>
        c.list_id === list.id &&
        c.profile_id === userId &&
        c.lob_verification_status === "verified"
    );
    const piece_count = deliverable.length;
    if (piece_count === 0) {
      throw new Error(
        "This list has no deliverable (verified) addresses to mail."
      );
    }
    if (!input.send_now && !input.scheduled_at) {
      throw new Error("Choose a send time.");
    }

    // Require credits up front for scheduled orders too (send-now is guarded below).
    if (!input.send_now) {
      const wallet = walletFor(db, userId);
      const needed = creditCost(piece_count, "self_service");
      if (wallet.balance < needed) {
        throw new InsufficientCreditsError(needed, wallet.balance);
      }
    }

    const created_at = nowIso();
    const campaign: Campaign = {
      id: uid("camp"),
      profile_id: userId,
      name: input.name.trim(),
      design_id: design.id,
      contact_list_id: list.id,
      scheduled_at: input.send_now ? null : input.scheduled_at,
      status: input.send_now ? "sending" : "scheduled",
      audience_tier: "self_service",
      target_area: null,
      requested_quantity: null,
      piece_count,
      credit_cost: piece_count,
      created_at,
    };

    if (input.send_now) {
      // Guard the non-negotiable: never send more pieces than credits.
      const wallet = walletFor(db, userId);
      if (wallet.balance < piece_count) {
        throw new InsufficientCreditsError(piece_count, wallet.balance);
      }
      db.campaigns.push(campaign);

      // (Mock) Lob send: one piece per deliverable contact.
      const pieces: MailPiece[] = deliverable.map((c) => ({
        id: uid("piece"),
        campaign_id: campaign.id,
        contact_id: c.id,
        profile_id: userId,
        lob_id: `psc_mock_${uid("l")}`,
        status: "in_transit",
        scan_count: 0,
        created_at,
        delivered_at: null,
      }));
      db.mail_pieces.push(...pieces);

      // Debit once for the whole campaign.
      applyLedger(db, userId, -piece_count, "campaign_send", campaign.id);
      campaign.status = "sent";
    } else {
      db.campaigns.push(campaign);
    }

    persist();
    return delay({ ...campaign });
  },

  async createManagedCampaign(input: {
    name: string;
    design_id: string;
    target_area: string;
    quantity: number;
  }): Promise<Campaign> {
    const db = loadDB();
    const userId = requireUserId(db);
    const design = db.designs.find(
      (d) => d.id === input.design_id && d.profile_id === userId
    );
    if (!design) throw new Error("Pick a design.");
    if (!input.target_area.trim()) throw new Error("Describe the target area.");
    if (input.quantity < 1) throw new Error("Enter how many to send.");

    const needed = creditCost(input.quantity, "managed");
    const wallet = walletFor(db, userId);
    if (wallet.balance < needed) {
      throw new InsufficientCreditsError(needed, wallet.balance);
    }

    const campaign: Campaign = {
      id: uid("camp"),
      profile_id: userId,
      name: input.name.trim(),
      design_id: design.id,
      contact_list_id: null,
      scheduled_at: null,
      status: "awaiting_list",
      audience_tier: "managed",
      target_area: input.target_area.trim(),
      requested_quantity: input.quantity,
      piece_count: input.quantity,
      credit_cost: creditCost(input.quantity, "managed"),
      created_at: nowIso(),
    };
    db.campaigns.push(campaign);
    persist();
    return delay({ ...campaign });
  },

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const db = loadDB();
    const userId = requireUserId(db);
    const pieces = db.mail_pieces.filter(
      (p) => p.campaign_id === campaignId && p.profile_id === userId
    );
    return delay({
      pieces: pieces.length,
      in_transit: pieces.filter((p) => p.status === "in_transit").length,
      delivered: pieces.filter((p) => p.status === "delivered").length,
      returned: pieces.filter((p) => p.status === "returned").length,
      failed: pieces.filter((p) => p.status === "failed").length,
      scans: pieces.reduce((sum, p) => sum + p.scan_count, 0),
    });
  },

  async listCampaignPieces(campaignId: string) {
    const db = loadDB();
    const userId = requireUserId(db);
    const rows = db.mail_pieces
      .filter((p) => p.campaign_id === campaignId && p.profile_id === userId)
      .map((p) => ({
        ...p,
        contact_name:
          db.contacts.find((c) => c.id === p.contact_id)?.full_name ?? "—",
      }));
    return delay(rows);
  },

  async syncCampaignStatus(campaignId: string) {
    const db = loadDB();
    const userId = requireUserId(db);
    const total = db.mail_pieces.filter(
      (p) => p.campaign_id === campaignId && p.profile_id === userId
    ).length;
    return delay({ total, updated: 0 });
  },

  async getCampaignShareUrl(campaignId: string): Promise<string> {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return delay(`${origin}/track/${campaignId}.mock`);
  },

  async redeemPromoCode(code: string): Promise<{ credits: number }> {
    const db = loadDB();
    const userId = requireUserId(db);
    const n = code.trim().toLowerCase().replace(/\s+/g, "");
    if (n !== "$100off" && n !== "100off")
      throw new Error("That promo code isn't valid.");
    const already = db.transactions.some(
      (t) => t.profile_id === userId && t.reference_id === "promo:$100off"
    );
    if (already) throw new Error("You've already redeemed this code.");
    applyLedger(db, userId, 100, "promo", "promo:$100off");
    persist();
    return delay({ credits: 100 });
  },

  async deleteCampaign(campaignId: string): Promise<void> {
    const db = loadDB();
    const userId = requireUserId(db);
    const pieceIds = db.mail_pieces
      .filter((p) => p.campaign_id === campaignId && p.profile_id === userId)
      .map((p) => p.id);
    db.scans = db.scans.filter((s) => !pieceIds.includes(s.mail_piece_id));
    db.mail_pieces = db.mail_pieces.filter(
      (p) => !(p.campaign_id === campaignId && p.profile_id === userId)
    );
    db.campaigns = db.campaigns.filter(
      (c) => !(c.id === campaignId && c.profile_id === userId)
    );
    persist();
    return delay(undefined);
  },

  async seedSampleData(): Promise<void> {
    const db = loadDB();
    const userId = requireUserId(db);
    const created_at = nowIso();

    // sample personalized template design, prefilled with the agent's contact
    const profile = db.profiles.find((p) => p.id === userId);
    const tpl = TEMPLATES[0];
    const design: Design = {
      id: uid("design"),
      profile_id: userId,
      name: "Sample · Just Listed",
      source: "template",
      front_image_url: null,
      back_image_url: null,
      template_id: tpl.id,
      template_kind: tpl.kind,
      fields: {
        ...tpl.defaults,
        agent_name: profile?.return_name ?? profile?.full_name ?? "",
        agent_phone: "(512) 555-0142",
        agent_email: profile?.email ?? "",
      },
      external_edit_url: null,
      created_at,
    };
    db.designs.push(design);

    // sample verified contact list
    const list: ContactList = {
      id: uid("list"),
      profile_id: userId,
      name: "Sample · 78704 neighborhood",
      contact_count: 40,
      created_at,
    };
    db.contact_lists.push(list);

    const sampleContacts: Contact[] = Array.from({ length: 40 }, (_, i) => ({
      id: uid("contact"),
      list_id: list.id,
      profile_id: userId,
      full_name: `Sample Resident ${i + 1}`,
      address_line1: `${100 + i} Sample St`,
      address_line2: null,
      city: "Austin",
      state: "TX",
      zip: "78704",
      lob_verification_status:
        i % 12 === 0 ? "undeliverable" : "verified",
      created_at,
    }));
    db.contacts.push(...sampleContacts);
    const deliverable = sampleContacts.filter(
      (c) => c.lob_verification_status === "verified"
    );

    // a completed campaign
    const campaign: Campaign = {
      id: uid("camp"),
      profile_id: userId,
      name: "Sample · Spring farming",
      design_id: design.id,
      contact_list_id: list.id,
      scheduled_at: null,
      status: "sent",
      audience_tier: "self_service",
      target_area: null,
      requested_quantity: null,
      piece_count: deliverable.length,
      credit_cost: deliverable.length,
      created_at,
    };
    db.campaigns.push(campaign);

    // pieces: most delivered, some in transit; a portion scanned
    const pieces: MailPiece[] = deliverable.map((c, i) => {
      const delivered = i % 5 !== 0; // ~80% delivered
      return {
        id: uid("piece"),
        campaign_id: campaign.id,
        contact_id: c.id,
        profile_id: userId,
        lob_id: `psc_mock_${uid("l")}`,
        status: delivered ? "delivered" : "in_transit",
        scan_count: delivered && i % 3 === 0 ? 1 : 0, // ~1/3 of delivered scanned
        created_at,
        delivered_at: delivered ? created_at : null,
      };
    });
    db.mail_pieces.push(...pieces);

    // scan rows matching the scan_counts
    const scans: Scan[] = pieces
      .filter((p) => p.scan_count > 0)
      .map((p) => ({
        id: uid("scan"),
        mail_piece_id: p.id,
        scanned_at: created_at,
        source: "lob",
        raw_event: null,
      }));
    db.scans.push(...scans);

    // debit the send from the ledger (keeps balance = sum(transactions))
    applyLedger(db, userId, -campaign.piece_count, "campaign_send", campaign.id);

    persist();
    return delay(undefined);
  },
};

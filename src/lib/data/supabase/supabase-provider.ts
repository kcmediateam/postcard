import type {
  AddressVerificationStatus,
  Campaign,
  Contact,
  ContactList,
  CreditTransaction,
  CreditWallet,
  Design,
  Profile,
  Session,
  Subscription,
  Template,
} from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";
import { findCreditPack, findPlan } from "@/lib/billing";
import { TEMPLATES, findTemplate } from "@/lib/templates";
import { US_STATES } from "@/lib/profile";
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

/**
 * Full Supabase implementation (Milestone 3). All tables live in Postgres with
 * RLS; the credit ledger's invariant (balance = sum(transactions)) and the
 * no-overspend rule are enforced server-side by triggers + the create_campaign
 * RPC. Stripe/Lob are still simulated (real wiring in M4/M5/M6).
 */

const sb = () => getSupabase();

let cachedUid: string | null = null;

async function requireUid(): Promise<string> {
  if (cachedUid) return cachedUid;
  const { data } = await sb().auth.getUser();
  if (!data.user) throw new AuthError("Not signed in.");
  cachedUid = data.user.id;
  return cachedUid;
}

// ---- mappers (column names already match our domain types) ----------------

const PROFILE_COLS =
  "id, email, full_name, company_name, return_name, return_line1, return_line2, return_city, return_state, return_zip, stripe_customer_id, created_at";

function asProfile(r: Record<string, unknown>): Profile {
  return r as unknown as Profile;
}

async function loadProfile(): Promise<Profile> {
  const uid = await requireUid();
  const { data, error } = await sb()
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", uid)
    .maybeSingle();
  if (error) throw new AuthError(error.message);
  if (!data) throw new AuthError("Profile not found. Did you run supabase/schema.sql?");
  return asProfile(data);
}

// ---- shared verification (stand-in for Lob; deterministic) ----------------

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function verifyAddress(c: {
  address_line1: string;
  state: string;
  zip: string;
}): AddressVerificationStatus {
  const zipOk = /^\d{5}(-\d{4})?$/.test(c.zip.trim());
  const stateOk = US_STATES.some((s) => s.code === c.state.trim().toUpperCase());
  if (!c.address_line1.trim() || !zipOk || !stateOk) return "undeliverable";
  if (hashString(`${c.address_line1}|${c.zip}`) % 12 === 0) return "undeliverable";
  return "verified";
}
function statsFromStatuses(rows: { lob_verification_status: string }[]): VerificationStats {
  return {
    total: rows.length,
    verified: rows.filter((r) => r.lob_verification_status === "verified").length,
    undeliverable: rows.filter((r) => r.lob_verification_status === "undeliverable").length,
    unverified: rows.filter((r) => r.lob_verification_status === "unverified").length,
  };
}

export const supabaseProvider: DataProvider = {
  // ---- auth + profile ----------------------------------------------------

  async signUp(input: SignUpInput): Promise<Session> {
    const email = input.email.trim().toLowerCase();
    const { data, error } = await sb().auth.signUp({
      email,
      password: input.password,
      options: { data: { full_name: input.full_name?.trim() || null } },
    });
    if (error) throw new AuthError(error.message);
    if (!data.session || !data.user) {
      throw new AuthError(
        "Account created but no session — disable 'Confirm email' in Supabase Auth for dev."
      );
    }
    cachedUid = data.user.id;
    return { user: { id: data.user.id, email: data.user.email ?? email }, profile: await loadProfile() };
  },

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await sb().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new AuthError(error.message);
    if (!data.user) throw new AuthError("Sign in failed.");
    cachedUid = data.user.id;
    return { user: { id: data.user.id, email: data.user.email ?? email }, profile: await loadProfile() };
  },

  async signOut(): Promise<void> {
    await sb().auth.signOut();
    cachedUid = null;
  },

  async getSession(): Promise<Session | null> {
    const { data } = await sb().auth.getSession();
    const session = data.session;
    if (!session?.user) {
      cachedUid = null;
      return null;
    }
    cachedUid = session.user.id;
    return {
      user: { id: session.user.id, email: session.user.email ?? "" },
      profile: await loadProfile(),
    };
  },

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const uid = await requireUid();
    const allowed: (keyof Profile)[] = [
      "full_name", "company_name", "return_name", "return_line1",
      "return_line2", "return_city", "return_state", "return_zip",
      "stripe_customer_id",
    ];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (k in patch) update[k] = patch[k];
    const { data, error } = await sb()
      .from("profiles")
      .update(update)
      .eq("id", uid)
      .select(PROFILE_COLS)
      .single();
    if (error) throw new AuthError(error.message);
    return asProfile(data);
  },

  // ---- billing + credits -------------------------------------------------

  async getWallet(): Promise<CreditWallet> {
    const uid = await requireUid();
    const { data, error } = await sb()
      .from("credit_wallets")
      .select("id, profile_id, balance, updated_at")
      .eq("profile_id", uid)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      return { id: "", profile_id: uid, balance: 0, updated_at: new Date().toISOString() };
    }
    return data as unknown as CreditWallet;
  },

  async listCreditTransactions(): Promise<CreditTransaction[]> {
    const { data, error } = await sb()
      .from("credit_transactions")
      .select("id, profile_id, delta, reason, reference_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as CreditTransaction[];
  },

  async getSubscription(): Promise<Subscription | null> {
    const { data, error } = await sb()
      .from("subscriptions")
      .select("*")
      .neq("status", "canceled")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as unknown as Subscription) ?? null;
  },

  async purchaseCreditPack(packId: string): Promise<void> {
    const uid = await requireUid();
    const pack = findCreditPack(packId);
    if (!pack) throw new Error("Unknown credit pack.");
    const { error } = await sb().from("credit_transactions").insert({
      profile_id: uid,
      delta: pack.credits,
      reason: "purchase",
      reference_id: `cs_mock_${Math.random().toString(36).slice(2)}`,
    });
    if (error) throw new Error(error.message);
  },

  async subscribeToPlan(planId: string): Promise<void> {
    const uid = await requireUid();
    const plan = findPlan(planId);
    if (!plan) throw new Error("Unknown plan.");
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);

    const { data: existing } = await sb()
      .from("subscriptions")
      .select("id")
      .neq("status", "canceled")
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await sb()
        .from("subscriptions")
        .update({
          plan: plan.id,
          monthly_credit_grant: plan.monthly_credits,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
        })
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb().from("subscriptions").insert({
        profile_id: uid,
        stripe_subscription_id: `sub_mock_${Math.random().toString(36).slice(2)}`,
        plan: plan.id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        monthly_credit_grant: plan.monthly_credits,
      });
      if (error) throw new Error(error.message);
    }
    // first month's grant on top of the existing balance (rollover)
    const { error: txErr } = await sb().from("credit_transactions").insert({
      profile_id: uid,
      delta: plan.monthly_credits,
      reason: "subscription_grant",
      reference_id: plan.id,
    });
    if (txErr) throw new Error(txErr.message);
  },

  async cancelSubscription(): Promise<void> {
    const { error } = await sb()
      .from("subscriptions")
      .update({ status: "canceled" })
      .neq("status", "canceled");
    if (error) throw new Error(error.message);
  },

  // ---- designs + templates ----------------------------------------------

  async listDesigns(): Promise<Design[]> {
    const { data, error } = await sb()
      .from("designs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Design[];
  },

  async listTemplates(): Promise<Template[]> {
    return TEMPLATES.filter((t) => t.active).map((t) => ({ ...t }));
  },

  async createDesignFromUpload(input: CreateUploadedDesignInput): Promise<Design> {
    const uid = await requireUid();
    if (!input.name.trim()) throw new Error("Design name is required.");
    if (!input.front_image_url || !input.back_image_url)
      throw new Error("Both front and back images are required.");
    const { data, error } = await sb()
      .from("designs")
      .insert({
        profile_id: uid,
        name: input.name.trim(),
        source: "uploaded",
        front_image_url: input.front_image_url,
        back_image_url: input.back_image_url,
        template_id: null,
        template_kind: null,
        fields: null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as Design;
  },

  async createTemplateDesign(input: CreateTemplateDesignInput): Promise<Design> {
    const uid = await requireUid();
    if (!input.name.trim()) throw new Error("Design name is required.");
    const template = findTemplate(input.template_id);
    if (!template) throw new Error("Unknown template.");
    const { data, error } = await sb()
      .from("designs")
      .insert({
        profile_id: uid,
        name: input.name.trim(),
        source: "template",
        front_image_url: null,
        back_image_url: null,
        template_id: template.id,
        template_kind: template.kind,
        fields: input.fields,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as Design;
  },

  async updateDesign(designId: string, patch: UpdateDesignInput): Promise<Design> {
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name.trim();
    if (patch.fields !== undefined) update.fields = patch.fields;
    const { data, error } = await sb()
      .from("designs")
      .update(update)
      .eq("id", designId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as Design;
  },

  async deleteDesign(designId: string): Promise<void> {
    const { error } = await sb().from("designs").delete().eq("id", designId);
    if (error) throw new Error(error.message);
  },

  // ---- contacts ----------------------------------------------------------

  async listContactLists(): Promise<ContactList[]> {
    const { data, error } = await sb()
      .from("contact_lists")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ContactList[];
  },

  async getContactListStats(listId: string): Promise<VerificationStats> {
    const { data, error } = await sb()
      .from("contacts")
      .select("lob_verification_status")
      .eq("list_id", listId);
    if (error) throw new Error(error.message);
    return statsFromStatuses((data ?? []) as { lob_verification_status: string }[]);
  },

  async listContacts(listId: string): Promise<Contact[]> {
    const { data, error } = await sb()
      .from("contacts")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Contact[];
  },

  async createContactList(input: CreateContactListInput): Promise<ContactList> {
    const uid = await requireUid();
    if (!input.name.trim()) throw new Error("List name is required.");
    if (input.contacts.length === 0) throw new Error("No valid contacts to import.");

    const { data: list, error } = await sb()
      .from("contact_lists")
      .insert({
        profile_id: uid,
        name: input.name.trim(),
        contact_count: input.contacts.length,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const rows = input.contacts.map((c) => ({
      list_id: (list as { id: string }).id,
      profile_id: uid,
      full_name: c.full_name,
      address_line1: c.address_line1,
      address_line2: c.address_line2,
      city: c.city,
      state: c.state,
      zip: c.zip,
      lob_verification_status: "unverified",
    }));
    const { error: cErr } = await sb().from("contacts").insert(rows);
    if (cErr) throw new Error(cErr.message);

    return list as unknown as ContactList;
  },

  async verifyContactList(listId: string): Promise<VerificationStats> {
    const { data, error } = await sb()
      .from("contacts")
      .select("id, address_line1, state, zip")
      .eq("list_id", listId);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as {
      id: string;
      address_line1: string;
      state: string;
      zip: string;
    }[];

    const verified: string[] = [];
    const undeliverable: string[] = [];
    for (const r of rows) {
      (verifyAddress(r) === "verified" ? verified : undeliverable).push(r.id);
    }
    if (verified.length) {
      const { error: e1 } = await sb()
        .from("contacts")
        .update({ lob_verification_status: "verified" })
        .in("id", verified);
      if (e1) throw new Error(e1.message);
    }
    if (undeliverable.length) {
      const { error: e2 } = await sb()
        .from("contacts")
        .update({ lob_verification_status: "undeliverable" })
        .in("id", undeliverable);
      if (e2) throw new Error(e2.message);
    }
    return {
      total: rows.length,
      verified: verified.length,
      undeliverable: undeliverable.length,
      unverified: 0,
    };
  },

  async deleteContactList(listId: string): Promise<void> {
    const { error } = await sb().from("contact_lists").delete().eq("id", listId);
    if (error) throw new Error(error.message);
  },

  // ---- campaigns ---------------------------------------------------------

  async listCampaigns(): Promise<Campaign[]> {
    const { data, error } = await sb()
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Campaign[];
  },

  async previewCampaign(contactListId: string): Promise<CampaignPreview> {
    const { data, error } = await sb()
      .from("contacts")
      .select("lob_verification_status")
      .eq("list_id", contactListId);
    if (error) throw new Error(error.message);
    const s = statsFromStatuses((data ?? []) as { lob_verification_status: string }[]);
    return {
      total: s.total,
      deliverable: s.verified,
      undeliverable: s.undeliverable,
      unverified: s.unverified,
      credit_cost: s.verified,
    };
  },

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    if (!input.name.trim()) throw new Error("Campaign name is required.");
    const { data, error } = await sb().rpc("create_campaign", {
      p_name: input.name.trim(),
      p_design_id: input.design_id,
      p_contact_list_id: input.contact_list_id,
      p_scheduled_at: input.scheduled_at,
      p_send_now: input.send_now,
    });
    if (error) {
      const m = error.message || "";
      const insf = m.match(/insufficient_credits:(\d+):(\d+)/);
      if (insf) throw new InsufficientCreditsError(Number(insf[1]), Number(insf[2]));
      if (m.includes("no_deliverable_contacts"))
        throw new Error("This list has no deliverable (verified) addresses to mail.");
      if (m.includes("design_not_found")) throw new Error("Pick a design.");
      if (m.includes("list_not_found")) throw new Error("Pick a contact list.");
      if (m.includes("no_send_time")) throw new Error("Choose a send time.");
      throw new Error(m);
    }
    // rpc returns the row (object) — supabase may return as array or object
    const row = Array.isArray(data) ? data[0] : data;
    return row as unknown as Campaign;
  },

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const { data, error } = await sb()
      .from("mail_pieces")
      .select("status, scan_count")
      .eq("campaign_id", campaignId);
    if (error) throw new Error(error.message);
    const pieces = (data ?? []) as { status: string; scan_count: number }[];
    return {
      pieces: pieces.length,
      in_transit: pieces.filter((p) => p.status === "in_transit").length,
      delivered: pieces.filter((p) => p.status === "delivered").length,
      returned: pieces.filter((p) => p.status === "returned").length,
      failed: pieces.filter((p) => p.status === "failed").length,
      scans: pieces.reduce((sum, p) => sum + (p.scan_count ?? 0), 0),
    };
  },

  async seedSampleData(): Promise<void> {
    const uid = await requireUid();
    const profile = await loadProfile();
    const tpl = TEMPLATES[0];

    // sample personalized design
    const { data: design, error: dErr } = await sb()
      .from("designs")
      .insert({
        profile_id: uid,
        name: "Sample · Just Listed",
        source: "template",
        template_id: tpl.id,
        template_kind: tpl.kind,
        fields: {
          ...tpl.defaults,
          agent_name: profile.return_name ?? profile.full_name ?? "",
          agent_phone: "(512) 555-0142",
          agent_email: profile.email,
        },
      })
      .select("id")
      .single();
    if (dErr) throw new Error(dErr.message);

    // sample contact list + contacts
    const { data: list, error: lErr } = await sb()
      .from("contact_lists")
      .insert({ profile_id: uid, name: "Sample · 78704 neighborhood", contact_count: 40 })
      .select("id")
      .single();
    if (lErr) throw new Error(lErr.message);
    const listId = (list as { id: string }).id;

    const contactRows = Array.from({ length: 40 }, (_, i) => ({
      list_id: listId,
      profile_id: uid,
      full_name: `Sample Resident ${i + 1}`,
      address_line1: `${100 + i} Sample St`,
      address_line2: null,
      city: "Austin",
      state: "TX",
      zip: "78704",
      lob_verification_status: i % 12 === 0 ? "undeliverable" : "verified",
    }));
    const { data: contacts, error: cErr } = await sb()
      .from("contacts")
      .insert(contactRows)
      .select("id, lob_verification_status");
    if (cErr) throw new Error(cErr.message);
    const deliverable = (contacts ?? []).filter(
      (c: { lob_verification_status: string }) => c.lob_verification_status === "verified"
    ) as { id: string }[];

    // grant some credits so the demo send leaves a positive balance
    const { error: gErr } = await sb().from("credit_transactions").insert({
      profile_id: uid,
      delta: 500,
      reason: "purchase",
      reference_id: "cs_mock_sample",
    });
    if (gErr) throw new Error(gErr.message);

    // a completed campaign
    const { data: campaign, error: campErr } = await sb()
      .from("campaigns")
      .insert({
        profile_id: uid,
        name: "Sample · Spring farming",
        design_id: (design as { id: string }).id,
        contact_list_id: listId,
        scheduled_at: null,
        status: "sent",
        piece_count: deliverable.length,
        credit_cost: deliverable.length,
      })
      .select("id")
      .single();
    if (campErr) throw new Error(campErr.message);
    const campaignId = (campaign as { id: string }).id;

    // pieces: ~80% delivered, ~1/3 of delivered scanned
    const pieceRows = deliverable.map((c, i) => {
      const delivered = i % 5 !== 0;
      return {
        campaign_id: campaignId,
        contact_id: c.id,
        profile_id: uid,
        lob_id: `psc_mock_${Math.random().toString(36).slice(2, 14)}`,
        status: delivered ? "delivered" : "in_transit",
        scan_count: delivered && i % 3 === 0 ? 1 : 0,
        delivered_at: delivered ? new Date().toISOString() : null,
      };
    });
    const { data: pieces, error: pErr } = await sb()
      .from("mail_pieces")
      .insert(pieceRows)
      .select("id, scan_count");
    if (pErr) throw new Error(pErr.message);

    // scan rows matching scan_counts
    const scanRows = (pieces ?? [])
      .filter((p: { scan_count: number }) => p.scan_count > 0)
      .map((p: { id: string }) => ({ mail_piece_id: p.id, source: "lob", raw_event: null }));
    if (scanRows.length) {
      const { error: sErr } = await sb().from("scans").insert(scanRows);
      if (sErr) throw new Error(sErr.message);
    }

    // debit the send (trigger keeps balance = sum)
    const { error: debErr } = await sb().from("credit_transactions").insert({
      profile_id: uid,
      delta: -deliverable.length,
      reason: "campaign_send",
      reference_id: campaignId,
    });
    if (debErr) throw new Error(debErr.message);
  },
};

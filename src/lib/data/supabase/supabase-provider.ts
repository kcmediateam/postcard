import type {
  Campaign,
  Contact,
  ContactList,
  CreditTransaction,
  CreditWallet,
  Design,
  DesignFields,
  Profile,
  Session,
  Subscription,
  Template,
} from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";
import { TEMPLATES, findTemplate } from "@/lib/templates";
import { creditCost } from "@/lib/billing";
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
  "id, email, full_name, company_name, return_name, return_line1, return_line2, return_city, return_state, return_zip, stripe_customer_id, is_admin, created_at";

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

/**
 * Upload a data-URL image to the public `designs` Storage bucket and return its
 * public URL. Passes through values that are already URLs (unchanged images).
 */
async function uploadImage(dataUrl: string, uid: string): Promise<string> {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const ext =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/svg+xml"
      ? "svg"
      : blob.type === "image/webp"
      ? "webp"
      : "jpg";
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sb()
    .storage.from("designs")
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return sb().storage.from("designs").getPublicUrl(path).data.publicUrl;
}

/** Upload any data-URL photos inside design fields, returning URL-only fields. */
async function persistFieldImages(
  fields: DesignFields,
  uid: string
): Promise<DesignFields> {
  return {
    ...fields,
    property_photo_url: fields.property_photo_url
      ? await uploadImage(fields.property_photo_url, uid)
      : null,
    headshot_url: fields.headshot_url
      ? await uploadImage(fields.headshot_url, uid)
      : null,
  };
}

/** POST to a server route and redirect the browser to the returned Stripe URL. */
async function redirectToStripe(path: string, payload?: unknown): Promise<never> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    throw new Error(json.error || "Could not start Stripe checkout.");
  }
  window.location.assign(json.url as string);
  // never resolves — the page navigates away
  return new Promise<never>(() => {});
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
    // Real Stripe Checkout — credits are granted by the verified webhook.
    await redirectToStripe("/api/checkout/credits", { packId });
  },

  async subscribeToPlan(planId: string): Promise<void> {
    await redirectToStripe("/api/checkout/subscription", { planId });
  },

  async cancelSubscription(): Promise<void> {
    // Cancellation happens in the Stripe customer portal.
    await redirectToStripe("/api/portal");
  },

  async openBillingPortal(): Promise<void> {
    await redirectToStripe("/api/portal");
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
    const front = await uploadImage(input.front_image_url, uid);
    const back = await uploadImage(input.back_image_url, uid);
    const { data, error } = await sb()
      .from("designs")
      .insert({
        profile_id: uid,
        name: input.name.trim(),
        source: "uploaded",
        front_image_url: front,
        back_image_url: back,
        template_id: null,
        template_kind: null,
        fields: input.size ? { size: input.size } : null,
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
    const fields = await persistFieldImages(input.fields, uid);
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
        fields,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as Design;
  },

  async updateDesign(designId: string, patch: UpdateDesignInput): Promise<Design> {
    const uid = await requireUid();
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name.trim();
    if (patch.fields !== undefined)
      update.fields = await persistFieldImages(patch.fields, uid);
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
    // Real Lob US address verification runs server-side (secret key).
    const res = await fetch("/api/verify-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Address verification failed.");
    return json as VerificationStats;
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

    // Immediate send → server route that creates real Lob postcards (QR +
    // metadata) and debits credits. Scheduled → DB RPC (no send/debit yet).
    if (input.send_now) {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name.trim(),
          design_id: input.design_id,
          contact_list_id: input.contact_list_id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.error === "insufficient_credits") {
          throw new InsufficientCreditsError(json.required, json.available);
        }
        if (json.error === "no_deliverable_contacts")
          throw new Error("This list has no deliverable (verified) addresses to mail.");
        if (json.error === "no_return_address")
          throw new Error("Set your return address before sending.");
        throw new Error(json.error || "Send failed.");
      }
      return json.campaign as Campaign;
    }

    // Scheduled: require the credits up front (charged when it sends).
    const preview = await this.previewCampaign(input.contact_list_id);
    const needed = creditCost(preview.deliverable, "self_service");
    const wallet = await this.getWallet();
    if (wallet.balance < needed) {
      throw new InsufficientCreditsError(needed, wallet.balance);
    }

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

  async createManagedCampaign(input: {
    name: string;
    design_id: string;
    target_area: string;
    quantity: number;
  }): Promise<Campaign> {
    const uid = await requireUid();
    if (!input.name.trim()) throw new Error("Campaign name is required.");
    if (!input.target_area.trim()) throw new Error("Describe the target area.");
    if (input.quantity < 1) throw new Error("Enter how many to send.");

    // Require credits up front (charged when we build & send).
    const needed = creditCost(input.quantity, "managed");
    const wallet = await this.getWallet();
    if (wallet.balance < needed) {
      throw new InsufficientCreditsError(needed, wallet.balance);
    }

    const { data, error } = await sb()
      .from("campaigns")
      .insert({
        profile_id: uid,
        name: input.name.trim(),
        design_id: input.design_id,
        contact_list_id: null,
        scheduled_at: null,
        status: "awaiting_list",
        audience_tier: "managed",
        target_area: input.target_area.trim(),
        requested_quantity: input.quantity,
        piece_count: input.quantity,
        credit_cost: creditCost(input.quantity, "managed"),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as Campaign;
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

  async listCampaignPieces(campaignId: string) {
    const { data, error } = await sb()
      .from("mail_pieces")
      .select("*, contacts(full_name)")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const contact = row.contacts as { full_name?: string } | null;
      const { contacts: _omit, ...piece } = row;
      void _omit;
      return { ...piece, contact_name: contact?.full_name ?? "—" };
    }) as unknown as Awaited<ReturnType<DataProvider["listCampaignPieces"]>>;
  },

  async seedSampleData(): Promise<void> {
    // Server-side RPC (SECURITY DEFINER) so it works under the tightened ledger
    // RLS where clients can't insert credit transactions directly.
    const { error } = await sb().rpc("seed_sample_data");
    if (error) throw new Error(error.message);
  },
};

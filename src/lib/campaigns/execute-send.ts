import { getAdminSupabase } from "@/lib/supabase/admin";
import { createLobPostcard, type LobAddress } from "@/lib/lob/server";
import { postcardFrontHtml, postcardBackHtml } from "@/lib/postcard/render-html";
import { InsufficientCreditsError } from "@/lib/data/provider";
import { creditCost } from "@/lib/billing";
import type { Campaign, Contact, Design, Profile } from "@/lib/types";

export interface SendOutcome {
  sent: number;
  failed: number;
  status: Campaign["status"];
}

/** Like Promise.allSettled but with a max number of workers in flight. */
async function settleWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = { status: "fulfilled", value: await worker(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, run)
  );
  return results;
}

/**
 * Execute a campaign send for an already-created campaign (status should be
 * 'sending'). Shared by the immediate send route and the scheduled-send cron.
 *
 * Idempotent:
 *  - skips contacts that already have a mail_piece (re-run safe)
 *  - per-piece Lob Idempotency-Key prevents duplicate postcards at Lob
 *  - debits the ledger at most once per campaign (reason=campaign_send)
 * Throws InsufficientCreditsError if the wallet can't cover the pieces and the
 * campaign hasn't been debited yet.
 */
export async function executeCampaignSend(campaignId: string): Promise<SendOutcome> {
  const admin = getAdminSupabase();

  const { data: campaignRow } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (!campaignRow) throw new Error("campaign_not_found");
  const campaign = campaignRow as Campaign;
  const uid = campaign.profile_id;
  const tier = campaign.audience_tier ?? "self_service";

  const [{ data: designRow }, { data: profileRow }, { data: contactsData }] =
    await Promise.all([
      admin.from("designs").select("*").eq("id", campaign.design_id).single(),
      admin.from("profiles").select("*").eq("id", uid).single(),
      admin
        .from("contacts")
        .select("*")
        .eq("list_id", campaign.contact_list_id)
        .eq("lob_verification_status", "verified"),
    ]);

  const design = designRow as Design | null;
  const profile = profileRow as Profile | null;
  const contacts = (contactsData ?? []) as Contact[];

  async function fail(): Promise<never> {
    await admin.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
    throw new Error("send_failed");
  }
  if (!design || !profile) return fail();
  if (!profile.return_line1) return fail();
  if (contacts.length === 0) return fail();

  // already-sent pieces (idempotency)
  const { data: existingPieces } = await admin
    .from("mail_pieces")
    .select("contact_id")
    .eq("campaign_id", campaignId);
  const done = new Set(
    (existingPieces ?? []).map((p) => (p as { contact_id: string }).contact_id)
  );
  const toSend = contacts.filter((c) => !done.has(c.id));

  // already debited?
  const { data: existingDebit } = await admin
    .from("credit_transactions")
    .select("id")
    .eq("reference_id", campaignId)
    .eq("reason", "campaign_send")
    .maybeSingle();

  // balance guard (only relevant before the one-time debit)
  if (!existingDebit) {
    const { data: wallet } = await admin
      .from("credit_wallets")
      .select("balance")
      .eq("profile_id", uid)
      .maybeSingle();
    const balance = (wallet?.balance as number) ?? 0;
    const needed = creditCost(contacts.length, tier);
    if (balance < needed) {
      await admin.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      throw new InsufficientCreditsError(needed, balance);
    }
  }

  const front =
    design.source === "uploaded" ? design.front_image_url : postcardFrontHtml(design);
  const back =
    design.source === "uploaded" ? design.back_image_url : postcardBackHtml(design, profile);
  if (!front || !back) return fail();

  // Return address: per-design override (fields.return_*) falls back to profile.
  const df = design.fields;
  const from: LobAddress = {
    name: df?.return_name?.trim() || profile.return_name || "",
    company: df?.return_company?.trim() || profile.company_name || undefined,
    address_line1: df?.return_line1?.trim() || profile.return_line1 || "",
    address_line2: profile.return_line2 ?? undefined,
    address_city: df?.return_city?.trim() || profile.return_city || "",
    address_state: df?.return_state?.trim() || profile.return_state || "",
    address_zip: df?.return_zip?.trim() || profile.return_zip || "",
    address_country: "US",
  };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  // QR destination: the design's link if set, else our app.
  const qrRedirectUrl = df?.qr_url?.trim() || appUrl;
  // Postcard size: uploaded designs may be 6x9/6x11; templates render 4x6.
  const size = df?.size ?? "4x6";

  // Send with bounded concurrency — blasting all pieces at once trips Lob's
  // rate limit. ~6 in flight stays well under the limit; 429s also retry.
  const results = await settleWithConcurrency(toSend, 6, (c) =>
    createLobPostcard({
      to: {
        name: c.full_name,
        address_line1: c.address_line1,
        address_line2: c.address_line2 ?? undefined,
        address_city: c.city,
        address_state: c.state,
        address_zip: c.zip,
        address_country: "US",
      },
      from,
      front,
      back,
      qrRedirectUrl,
      size,
      metadata: { campaign_id: campaignId, profile_id: uid, contact_id: c.id },
      idempotencyKey: `${campaignId}:${c.id}`,
    }).then((r) => ({ contact: c, lobId: r.id }))
  );

  const newPieces = results
    .filter(
      (r): r is PromiseFulfilledResult<{ contact: Contact; lobId: string }> =>
        r.status === "fulfilled"
    )
    .map((r) => ({
      campaign_id: campaignId,
      contact_id: r.value.contact.id,
      profile_id: uid,
      lob_id: r.value.lobId,
      status: "in_transit",
      scan_count: 0,
    }));
  const failed = results.length - newPieces.length;

  // Surface why pieces failed at Lob — otherwise allSettled swallows the
  // errors and the campaign just ends up "failed" with no explanation.
  if (failed > 0) {
    const reasons = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) =>
        r.reason instanceof Error ? r.reason.message : String(r.reason)
      );
    const sample = [...new Set(reasons)].slice(0, 5);
    console.error(
      `[campaign ${campaignId}] ${failed}/${results.length} pieces failed at Lob:`,
      sample
    );
  }

  if (newPieces.length) await admin.from("mail_pieces").insert(newPieces);

  const totalPieces = done.size + newPieces.length;
  const totalCost = creditCost(totalPieces, tier);

  // single debit per campaign, once there is at least one piece
  if (!existingDebit && totalPieces > 0) {
    await admin.from("credit_transactions").insert({
      profile_id: uid,
      delta: -totalCost,
      reason: "campaign_send",
      reference_id: campaignId,
    });
  }

  const status: Campaign["status"] = totalPieces > 0 ? "sent" : "failed";
  await admin
    .from("campaigns")
    .update({ status, piece_count: totalPieces, credit_cost: totalCost })
    .eq("id", campaignId);

  return { sent: newPieces.length, failed, status };
}

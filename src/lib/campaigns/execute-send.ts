import { getAdminSupabase } from "@/lib/supabase/admin";
import { createLobPostcard, type LobAddress } from "@/lib/lob/server";
import { postcardFrontHtml, postcardBackHtml } from "@/lib/postcard/render-html";
import { InsufficientCreditsError } from "@/lib/data/provider";
import type { Campaign, Contact, Design, Profile } from "@/lib/types";

export interface SendOutcome {
  sent: number;
  failed: number;
  status: Campaign["status"];
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
    if (balance < contacts.length) {
      await admin.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      throw new InsufficientCreditsError(contacts.length, balance);
    }
  }

  const front =
    design.source === "uploaded" ? design.front_image_url : postcardFrontHtml(design);
  const back =
    design.source === "uploaded" ? design.back_image_url : postcardBackHtml(design, profile);
  if (!front || !back) return fail();

  const from: LobAddress = {
    name: profile.return_name ?? "",
    address_line1: profile.return_line1 ?? "",
    address_line2: profile.return_line2 ?? undefined,
    address_city: profile.return_city ?? "",
    address_state: profile.return_state ?? "",
    address_zip: profile.return_zip ?? "",
    address_country: "US",
  };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const results = await Promise.allSettled(
    toSend.map((c) =>
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
        qrRedirectUrl: appUrl,
        metadata: { campaign_id: campaignId, profile_id: uid, contact_id: c.id },
        idempotencyKey: `${campaignId}:${c.id}`,
      }).then((r) => ({ contact: c, lobId: r.id }))
    )
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
  if (newPieces.length) await admin.from("mail_pieces").insert(newPieces);

  const totalPieces = done.size + newPieces.length;

  // single debit per campaign, once there is at least one piece
  if (!existingDebit && totalPieces > 0) {
    await admin.from("credit_transactions").insert({
      profile_id: uid,
      delta: -totalPieces,
      reason: "campaign_send",
      reference_id: campaignId,
    });
  }

  const status: Campaign["status"] = totalPieces > 0 ? "sent" : "failed";
  await admin
    .from("campaigns")
    .update({ status, piece_count: totalPieces, credit_cost: totalPieces })
    .eq("id", campaignId);

  return { sent: newPieces.length, failed, status };
}

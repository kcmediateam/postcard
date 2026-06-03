import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createLobPostcard, type LobAddress } from "@/lib/lob/server";
import { postcardFrontHtml, postcardBackHtml } from "@/lib/postcard/render-html";
import type { Contact, Design, Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { name, design_id, contact_list_id } = await req
    .json()
    .catch(() => ({}));
  if (!name?.trim() || !design_id || !contact_list_id) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  // Reads under the agent's RLS (ownership enforced by the DB).
  const { data: design } = await supabase
    .from("designs")
    .select("*")
    .eq("id", design_id)
    .maybeSingle();
  if (!design) return Response.json({ error: "design_not_found" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile?.return_line1) {
    return Response.json({ error: "no_return_address" }, { status: 400 });
  }

  const { data: contactsData } = await supabase
    .from("contacts")
    .select("*")
    .eq("list_id", contact_list_id)
    .eq("lob_verification_status", "verified");
  const contacts = (contactsData ?? []) as Contact[];
  if (contacts.length === 0) {
    return Response.json({ error: "no_deliverable_contacts" }, { status: 400 });
  }

  const admin = getAdminSupabase();

  // Balance check before sending (never send more pieces than credits).
  const { data: wallet } = await admin
    .from("credit_wallets")
    .select("balance")
    .eq("profile_id", user.id)
    .maybeSingle();
  const balance = (wallet?.balance as number) ?? 0;
  if (balance < contacts.length) {
    return Response.json(
      { error: "insufficient_credits", required: contacts.length, available: balance },
      { status: 402 }
    );
  }

  // Front/back content: uploaded -> stored image URL; template -> rendered HTML.
  const d = design as Design;
  const front =
    d.source === "uploaded" ? d.front_image_url : postcardFrontHtml(d);
  const back =
    d.source === "uploaded" ? d.back_image_url : postcardBackHtml(d, profile as Profile);
  if (!front || !back) {
    return Response.json({ error: "design_missing_art" }, { status: 400 });
  }

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

  // Create the campaign first (status sending).
  const { data: campaignRow, error: campErr } = await admin
    .from("campaigns")
    .insert({
      profile_id: user.id,
      name: name.trim(),
      design_id: d.id,
      contact_list_id,
      scheduled_at: null,
      status: "sending",
      piece_count: contacts.length,
      credit_cost: contacts.length,
    })
    .select("*")
    .single();
  if (campErr || !campaignRow) {
    return Response.json({ error: campErr?.message ?? "campaign_failed" }, { status: 500 });
  }
  const campaignId = (campaignRow as { id: string }).id;

  // Create one Lob postcard per contact (idempotency key per piece).
  const results = await Promise.allSettled(
    contacts.map((c) =>
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
        metadata: {
          campaign_id: campaignId,
          profile_id: user.id,
          contact_id: c.id,
        },
        idempotencyKey: `${campaignId}:${c.id}`,
      }).then((r) => ({ contact: c, lobId: r.id }))
    )
  );

  const pieces = results
    .filter((r): r is PromiseFulfilledResult<{ contact: Contact; lobId: string }> => r.status === "fulfilled")
    .map((r) => ({
      campaign_id: campaignId,
      contact_id: r.value.contact.id,
      profile_id: user.id,
      lob_id: r.value.lobId,
      status: "in_transit",
      scan_count: 0,
    }));
  const failed = results.length - pieces.length;

  if (pieces.length === 0) {
    await admin.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
    const firstErr = results.find((r) => r.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    return Response.json(
      { error: firstErr?.reason?.message ?? "all_pieces_failed" },
      { status: 502 }
    );
  }

  await admin.from("mail_pieces").insert(pieces);

  // Debit once for the pieces actually created (trigger keeps balance = sum).
  await admin.from("credit_transactions").insert({
    profile_id: user.id,
    delta: -pieces.length,
    reason: "campaign_send",
    reference_id: campaignId,
  });

  const { data: finalCampaign } = await admin
    .from("campaigns")
    .update({ status: "sent", piece_count: pieces.length, credit_cost: pieces.length })
    .eq("id", campaignId)
    .select("*")
    .single();

  return Response.json({ campaign: finalCampaign, sent: pieces.length, failed });
}

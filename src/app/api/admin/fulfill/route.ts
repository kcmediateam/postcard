import { getAdminUser } from "@/lib/admin/guard";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { executeCampaignSend } from "@/lib/campaigns/execute-send";
import { InsufficientCreditsError } from "@/lib/data/provider";
import type { NewContactInput } from "@/lib/data/provider";

export const runtime = "nodejs";

/**
 * Admin fulfills a managed order: attach the uploaded address list to the
 * campaign and push it to Lob. The list is admin-curated (we pulled it), so its
 * contacts are stored as verified, then the shared send runs (debits the agent
 * at the managed rate).
 */
export async function POST(req: Request) {
  if (!(await getAdminUser())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { campaign_id, contacts } = (await req.json().catch(() => ({}))) as {
    campaign_id?: string;
    contacts?: NewContactInput[];
  };
  if (!campaign_id || !Array.isArray(contacts) || contacts.length === 0) {
    return Response.json({ error: "missing_campaign_or_contacts" }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, profile_id, status, target_area")
    .eq("id", campaign_id)
    .maybeSingle();
  if (!campaign) return Response.json({ error: "campaign_not_found" }, { status: 404 });
  if ((campaign as { status: string }).status !== "awaiting_list") {
    return Response.json({ error: "already_fulfilled" }, { status: 409 });
  }
  const ownerId = (campaign as { profile_id: string }).profile_id;
  const targetArea = (campaign as { target_area: string | null }).target_area;

  // Create the list on the agent's account + insert contacts (verified).
  const { data: list, error: listErr } = await admin
    .from("contact_lists")
    .insert({
      profile_id: ownerId,
      name: `Managed list — ${targetArea ?? "campaign"}`,
      contact_count: contacts.length,
    })
    .select("id")
    .single();
  if (listErr || !list) {
    return Response.json({ error: listErr?.message ?? "list_failed" }, { status: 500 });
  }
  const listId = (list as { id: string }).id;

  const rows = contacts.map((c) => ({
    list_id: listId,
    profile_id: ownerId,
    full_name: c.full_name,
    address_line1: c.address_line1,
    address_line2: c.address_line2,
    city: c.city,
    state: c.state,
    zip: c.zip,
    lob_verification_status: "verified",
  }));
  const { error: cErr } = await admin.from("contacts").insert(rows);
  if (cErr) return Response.json({ error: cErr.message }, { status: 500 });

  // Attach the list + flip to sending, then run the shared (idempotent) send.
  await admin
    .from("campaigns")
    .update({ contact_list_id: listId, status: "sending" })
    .eq("id", campaign_id);

  try {
    const outcome = await executeCampaignSend(campaign_id);
    return Response.json({ ok: true, ...outcome });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return Response.json(
        { error: "insufficient_credits", required: e.required, available: e.available },
        { status: 402 }
      );
    }
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}

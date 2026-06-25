import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { executeCampaignSend } from "@/lib/campaigns/execute-send";
import { InsufficientCreditsError } from "@/lib/data/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { name, design_id, contact_list_id, qr_url } = await req
    .json()
    .catch(() => ({}));
  if (!name?.trim() || !design_id || !contact_list_id) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  // Pre-checks for friendly errors (RLS confirms ownership).
  const { data: design } = await supabase
    .from("designs")
    .select("id")
    .eq("id", design_id)
    .maybeSingle();
  if (!design) return Response.json({ error: "design_not_found" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("return_line1")
    .eq("id", user.id)
    .single();
  if (!profile?.return_line1) {
    return Response.json({ error: "no_return_address" }, { status: 400 });
  }

  const { count: deliverable } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("list_id", contact_list_id)
    .eq("lob_verification_status", "verified");
  if (!deliverable) {
    return Response.json({ error: "no_deliverable_contacts" }, { status: 400 });
  }

  // Create the campaign (status sending), then run the shared send.
  const admin = getAdminSupabase();
  const insert: Record<string, unknown> = {
    profile_id: user.id,
    name: name.trim(),
    design_id,
    contact_list_id,
    scheduled_at: null,
    status: "sending",
    piece_count: deliverable,
    credit_cost: deliverable,
  };
  if (typeof qr_url === "string" && qr_url.trim()) insert.qr_url = qr_url.trim();
  const { data: campaignRow, error: campErr } = await admin
    .from("campaigns")
    .insert(insert)
    .select("id")
    .single();
  if (campErr || !campaignRow) {
    return Response.json({ error: campErr?.message ?? "campaign_failed" }, { status: 500 });
  }
  const campaignId = (campaignRow as { id: string }).id;

  try {
    await executeCampaignSend(campaignId);
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return Response.json(
        { error: "insufficient_credits", required: e.required, available: e.available },
        { status: 402 }
      );
    }
    return Response.json({ error: "send_failed" }, { status: 502 });
  }

  const { data: finalCampaign } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  return Response.json({ campaign: finalCampaign });
}

import { createServerSupabase } from "@/lib/supabase/server";
import { signCampaignToken } from "@/lib/share";

export const runtime = "nodejs";

/** Return a public, read-only tracking link for one of the user's campaigns. */
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { campaignId } = await req.json().catch(() => ({ campaignId: null }));
  if (!campaignId)
    return Response.json({ error: "missing_campaignId" }, { status: 400 });

  // RLS confirms ownership.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return Response.json({ error: "not_found" }, { status: 404 });

  const token = signCampaignToken(campaignId);
  const origin = process.env.APP_URL?.startsWith("https")
    ? process.env.APP_URL
    : new URL(req.url).origin;
  return Response.json({ url: `${origin}/track/${token}` });
}

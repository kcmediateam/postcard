import { getAdminSupabase } from "@/lib/supabase/admin";
import { executeCampaignSend } from "@/lib/campaigns/execute-send";

export const runtime = "nodejs";

/**
 * Fires due scheduled campaigns. Invoked by Vercel Cron (which sends
 * `Authorization: Bearer ${CRON_SECRET}`). Idempotent: each campaign is claimed
 * with a conditional status flip so only one run processes it, and the send
 * itself is idempotent (see executeCampaignSend).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = getAdminSupabase();
  const nowIso = new Date().toISOString();

  const { data: due } = await admin
    .from("campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .limit(50);

  const results: Array<Record<string, unknown>> = [];
  for (const row of due ?? []) {
    const id = (row as { id: string }).id;
    // Atomic claim: only one worker flips scheduled -> sending.
    const { data: claimed } = await admin
      .from("campaigns")
      .update({ status: "sending" })
      .eq("id", id)
      .eq("status", "scheduled")
      .select("id");
    if (!claimed || claimed.length === 0) continue; // already claimed elsewhere

    try {
      const outcome = await executeCampaignSend(id);
      results.push({ id, ...outcome });
    } catch (e) {
      await admin.from("campaigns").update({ status: "failed" }).eq("id", id);
      results.push({ id, error: e instanceof Error ? e.message : "error" });
    }
  }

  return Response.json({ processed: results.length, results });
}

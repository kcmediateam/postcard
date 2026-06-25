import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getLobPostcardStatus } from "@/lib/lob/server";
import type { MailPieceStatus } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Piece = { id: string; lob_id: string; status: MailPieceStatus };

/** Reconcile a campaign's piece statuses with Lob (for missed webhooks). */
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { campaignId } = await req.json().catch(() => ({ campaignId: null }));
  if (!campaignId)
    return Response.json({ error: "missing_campaignId" }, { status: 400 });

  // RLS confirms the campaign belongs to the signed-in user.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return Response.json({ error: "not_found" }, { status: 404 });

  const admin = getAdminSupabase();
  const { data: pieceRows } = await admin
    .from("mail_pieces")
    .select("id, lob_id, status")
    .eq("campaign_id", campaignId);
  const pieces = (pieceRows ?? []) as Piece[];

  let updated = 0;
  // Bounded concurrency so we don't hammer Lob's rate limit.
  const limit = 6;
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < pieces.length) {
      const p = pieces[cursor++];
      if (!p.lob_id) continue;
      try {
        const { status, deliveredAt } = await getLobPostcardStatus(p.lob_id);
        if (status !== p.status) {
          const patch: { status: MailPieceStatus; delivered_at?: string } = {
            status,
          };
          if (status === "delivered" && deliveredAt) patch.delivered_at = deliveredAt;
          await admin.from("mail_pieces").update(patch).eq("id", p.id);
          updated++;
        }
      } catch {
        // skip this piece; a later sync will retry
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, pieces.length) }, worker)
  );

  return Response.json({ total: pieces.length, updated });
}

import crypto from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { MailPieceStatus } from "@/lib/types";

export const runtime = "nodejs";

// Lob delivery-tracking event ids -> our mail_piece status.
const STATUS_MAP: Record<string, MailPieceStatus> = {
  "postcard.created": "created",
  "postcard.mailed": "in_transit",
  "postcard.in_transit": "in_transit",
  "postcard.in_local_area": "in_transit",
  "postcard.processed_for_delivery": "in_transit",
  "postcard.re-routed": "in_transit",
  "postcard.delivered": "delivered",
  "postcard.returned_to_sender": "returned",
};

function verifySignature(raw: string, sig: string | null, ts: string | null): boolean {
  const secret = process.env.LOB_WEBHOOK_SECRET;
  if (!secret || !sig || !ts) return false;
  // 5-minute replay tolerance (timestamp is epoch ms).
  const tsNum = Number(ts);
  if (Number.isFinite(tsNum)) {
    const ms = tsNum > 1e12 ? tsNum : tsNum * 1000;
    if (Math.abs(Date.now() - ms) > 5 * 60 * 1000) return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${raw}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("lob-signature");
  const ts = req.headers.get("lob-signature-timestamp");

  if (!verifySignature(raw, sig, ts)) {
    return new Response("invalid signature", { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const eventType =
    (event.event_type as { id?: string } | undefined)?.id ??
    (event.event_type as string | undefined);
  const lobId =
    (event.reference_id as string | undefined) ??
    ((event.body as { id?: string } | undefined)?.id as string | undefined);

  if (!eventType || !lobId) return Response.json({ received: true });

  const admin = getAdminSupabase();

  // Match the event to a mail_piece by the stored Lob id (tenant-safe: the
  // piece carries its own profile_id).
  const { data: piece } = await admin
    .from("mail_pieces")
    .select("id, profile_id, scan_count")
    .eq("lob_id", lobId)
    .maybeSingle();
  if (!piece) return Response.json({ received: true, matched: false });
  const pieceId = (piece as { id: string }).id;

  if (eventType === "postcard.viewed") {
    // QR scan: record it, then recompute the denormalized counter from scans.
    await admin.from("scans").insert({
      mail_piece_id: pieceId,
      source: "lob",
      raw_event: event,
    });
    const { count } = await admin
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("mail_piece_id", pieceId);
    await admin
      .from("mail_pieces")
      .update({ scan_count: count ?? (piece as { scan_count: number }).scan_count + 1 })
      .eq("id", pieceId);
    return Response.json({ received: true, type: "scan" });
  }

  const status = STATUS_MAP[eventType];
  if (status) {
    const patch: { status: MailPieceStatus; delivered_at?: string } = { status };
    if (status === "delivered") {
      patch.delivered_at = new Date().toISOString();
    }
    await admin.from("mail_pieces").update(patch).eq("id", pieceId);
    return Response.json({ received: true, type: "status", status });
  }

  return Response.json({ received: true, ignored: eventType });
}

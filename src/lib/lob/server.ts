/** Server-only Lob client (test key). */

import type { MailPieceStatus, PostcardSize } from "@/lib/types";

const LOB_BASE = "https://api.lob.com/v1";

export interface LobAddress {
  name: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country?: string;
}

export interface CreatePostcardInput {
  to: LobAddress;
  from: LobAddress;
  /** HTML string or a public image URL. */
  front: string;
  back: string;
  qrRedirectUrl: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
  /** Lob postcard size; defaults to 4x6. */
  size?: PostcardSize;
}

function authHeader(): string {
  const key = process.env.LOB_API_KEY;
  if (!key) throw new Error("LOB_API_KEY (test secret key) not set");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Create a Lob postcard with a native QR (back) + our metadata stamped.
 * Retries on Lob rate-limit (429); the per-piece Idempotency-Key makes retries
 * safe (Lob returns the same postcard rather than creating a duplicate). */
export async function createLobPostcard(
  input: CreatePostcardInput,
  attempt = 0
): Promise<{ id: string }> {
  const body = {
    to: input.to,
    from: input.from,
    front: input.front,
    back: input.back,
    size: input.size ?? "4x6",
    use_type: "marketing",
    metadata: input.metadata,
    qr_code: {
      position: "relative",
      redirect_url: input.qrRedirectUrl,
      width: "1.2",
      bottom: "0.4",
      right: "0.4",
      pages: "back",
    },
  };

  const res = await fetch(`${LOB_BASE}/postcards`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  // Rate limited: back off and retry (Lob suggests ~5s). Idempotency-Key keeps
  // this safe from duplicates.
  if (res.status === 429 && attempt < 4) {
    await sleep(2500 * (attempt + 1));
    return createLobPostcard(input, attempt + 1);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `Lob create failed (${res.status})`;
    throw new Error(msg);
  }
  return { id: json.id as string };
}

/** Map a Lob tracking-event name to our mail_piece status. */
function statusFromEventName(name: string): MailPieceStatus {
  const n = name.toLowerCase();
  if (n.includes("delivered")) return "delivered";
  if (n.includes("returned")) return "returned";
  if (/transit|local area|processed|mailed|re-?rout/.test(n)) return "in_transit";
  return "created";
}

/** Fetch a postcard's current status from Lob (reconcile missed webhooks). */
export async function getLobPostcardStatus(
  id: string
): Promise<{ status: MailPieceStatus; deliveredAt: string | null }> {
  const res = await fetch(`${LOB_BASE}/postcards/${id}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) throw new Error(`Lob get failed (${res.status})`);
  const json = (await res.json()) as {
    tracking_events?: { name?: string; type?: string; time?: string; date_created?: string }[];
  };
  const events = Array.isArray(json.tracking_events) ? json.tracking_events : [];
  let latestName = "";
  let latestTime = -1;
  let deliveredAt: string | null = null;
  for (const e of events) {
    const when = e.time ?? e.date_created ?? "";
    const t = when ? new Date(when).getTime() : 0;
    const name = String(e.name ?? e.type ?? "");
    if (t >= latestTime) {
      latestTime = t;
      latestName = name;
    }
    if (name.toLowerCase().includes("delivered") && when) deliveredAt = when;
  }
  return { status: statusFromEventName(latestName), deliveredAt };
}

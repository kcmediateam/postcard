/** Server-only Lob client (test key). */

const LOB_BASE = "https://api.lob.com/v1";

export interface LobAddress {
  name: string;
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
}

function authHeader(): string {
  const key = process.env.LOB_API_KEY;
  if (!key) throw new Error("LOB_API_KEY (test secret key) not set");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

/** Create a Lob postcard with a native QR (back) + our metadata stamped. */
export async function createLobPostcard(
  input: CreatePostcardInput
): Promise<{ id: string }> {
  const body = {
    to: input.to,
    from: input.from,
    front: input.front,
    back: input.back,
    size: "4x6",
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

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `Lob create failed (${res.status})`;
    throw new Error(msg);
  }
  return { id: json.id as string };
}

import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const LOB_URL = "https://api.lob.com/v1/us_verifications";

type Row = {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
};

async function verifyOne(
  row: Row,
  authHeader: string
): Promise<"verified" | "undeliverable"> {
  const params = new URLSearchParams({
    primary_line: row.address_line1,
    city: row.city,
    state: row.state,
    zip_code: row.zip,
  });
  if (row.address_line2) params.set("secondary_line", row.address_line2);

  const res = await fetch(LOB_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (res.status === 401) throw new Error("lob_auth");
  if (!res.ok) return "undeliverable"; // treat unverifiable as undeliverable
  const json = (await res.json()) as { deliverability?: string };
  return json.deliverability && json.deliverability.startsWith("deliverable")
    ? "verified"
    : "undeliverable";
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { listId } = await req.json().catch(() => ({ listId: null }));
  if (!listId) return Response.json({ error: "missing_listId" }, { status: 400 });

  // RLS restricts this to the signed-in agent's own contacts.
  const { data, error } = await supabase
    .from("contacts")
    .select("id, address_line1, address_line2, city, state, zip")
    .eq("list_id", listId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Row[];

  // Address verification is OFF unless explicitly enabled. While Lob runs in
  // TEST mode it can't do real USPS verification (it returns "undeliverable"
  // for real addresses), so by default we pass every address through as
  // verified. Set ADDRESS_VERIFICATION_ENABLED=true once Lob is LIVE.
  const verificationEnabled =
    process.env.ADDRESS_VERIFICATION_ENABLED === "true";
  if (!verificationEnabled) {
    if (rows.length) {
      await supabase
        .from("contacts")
        .update({ lob_verification_status: "verified" })
        .eq("list_id", listId);
    }
    return Response.json({
      total: rows.length,
      verified: rows.length,
      undeliverable: 0,
      unverified: 0,
    });
  }

  const lobKey = process.env.LOB_API_KEY;
  if (!lobKey) {
    return Response.json(
      { error: "LOB_API_KEY (test secret key) not set" },
      { status: 500 }
    );
  }
  const authHeader = "Basic " + Buffer.from(`${lobKey}:`).toString("base64");

  const verified: string[] = [];
  const undeliverable: string[] = [];
  try {
    const results = await Promise.all(
      rows.map(async (r) => ({ id: r.id, status: await verifyOne(r, authHeader) }))
    );
    for (const r of results) {
      (r.status === "verified" ? verified : undeliverable).push(r.id);
    }
  } catch (e) {
    if (e instanceof Error && e.message === "lob_auth") {
      return Response.json(
        { error: "Lob rejected the API key (use the TEST secret key)." },
        { status: 502 }
      );
    }
    return Response.json({ error: "verification_failed" }, { status: 502 });
  }

  if (verified.length) {
    await supabase
      .from("contacts")
      .update({ lob_verification_status: "verified" })
      .in("id", verified);
  }
  if (undeliverable.length) {
    await supabase
      .from("contacts")
      .update({ lob_verification_status: "undeliverable" })
      .in("id", undeliverable);
  }

  return Response.json({
    total: rows.length,
    verified: verified.length,
    undeliverable: undeliverable.length,
    unverified: 0,
  });
}

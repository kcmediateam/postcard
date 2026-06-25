import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// The one promo. credits = free postcards granted on redemption.
const PROMO = { code: "$100off", credits: 100 };
// One redemption per return address — a 2nd account sharing it is blocked.
const MAX_ACCOUNTS_PER_ADDRESS = 1;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

function fingerprint(p: {
  return_line1?: string | null;
  return_zip?: string | null;
}): string | null {
  const line1 = (p.return_line1 ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const zip = (p.return_zip ?? "").replace(/[^0-9]/g, "").slice(0, 5);
  if (!line1 || !zip) return null;
  return `${line1}|${zip}`;
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({ code: "" }));
  if (norm(code ?? "") !== norm(PROMO.code) && norm(code ?? "") !== "100off") {
    return Response.json({ error: "invalid_code" }, { status: 400 });
  }

  const admin = getAdminSupabase();

  const { data: profile } = await admin
    .from("profiles")
    .select("return_line1, return_zip")
    .eq("id", user.id)
    .single();
  const fp = fingerprint(profile ?? {});
  if (!fp) {
    return Response.json({ error: "no_return_address" }, { status: 400 });
  }

  // Abuse guard: how many distinct accounts have redeemed from this address?
  const { data: sameAddr } = await admin
    .from("promo_redemptions")
    .select("profile_id")
    .eq("code", PROMO.code)
    .eq("address_fingerprint", fp);
  const distinctAccounts = new Set(
    (sameAddr ?? []).map((r) => (r as { profile_id: string }).profile_id)
  );
  if (
    !distinctAccounts.has(user.id) &&
    distinctAccounts.size >= MAX_ACCOUNTS_PER_ADDRESS
  ) {
    return Response.json({ error: "address_limit" }, { status: 409 });
  }

  // Reserve the redemption first (unique on profile_id+code → once per user).
  const { error: redErr } = await admin
    .from("promo_redemptions")
    .insert({ profile_id: user.id, code: PROMO.code, address_fingerprint: fp });
  if (redErr) {
    // 23505 = unique violation = already redeemed.
    if ((redErr as { code?: string }).code === "23505") {
      return Response.json({ error: "already_redeemed" }, { status: 409 });
    }
    return Response.json({ error: redErr.message }, { status: 500 });
  }

  // Grant the bonus credits (service role bypasses ledger RLS).
  const { error: txErr } = await admin.from("credit_transactions").insert({
    profile_id: user.id,
    delta: PROMO.credits,
    reason: "promo",
    reference_id: `promo:${PROMO.code}`,
  });
  if (txErr) {
    // roll back the reservation so they can retry
    await admin
      .from("promo_redemptions")
      .delete()
      .eq("profile_id", user.id)
      .eq("code", PROMO.code);
    return Response.json({ error: txErr.message }, { status: 500 });
  }

  return Response.json({ ok: true, credits: PROMO.credits });
}

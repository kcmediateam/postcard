import { createServerSupabase } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { ensureStripeCustomer } from "@/lib/stripe/customer";
import { priceIdFor } from "@/lib/stripe/prices";
import { findCreditPack } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { packId } = await req.json().catch(() => ({ packId: null }));
  const pack = findCreditPack(packId);
  if (!pack) return Response.json({ error: "unknown_pack" }, { status: 400 });
  const priceId = priceIdFor(packId);
  if (!priceId)
    return Response.json({ error: "price_not_configured" }, { status: 500 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customer = await ensureStripeCustomer(
    supabase,
    user.id,
    profile?.email ?? user.email ?? null,
    profile?.stripe_customer_id ?? null
  );

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/billing?status=success`,
    cancel_url: `${appUrl}/billing?status=cancel`,
    metadata: {
      profile_id: user.id,
      kind: "credits",
      pack_id: pack.id,
      credits: String(pack.credits),
    },
  });

  return Response.json({ url: session.url });
}

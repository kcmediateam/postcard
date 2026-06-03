import { createServerSupabase } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { ensureStripeCustomer } from "@/lib/stripe/customer";
import { priceIdFor } from "@/lib/stripe/prices";
import { findPlan } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { planId } = await req.json().catch(() => ({ planId: null }));
  const plan = findPlan(planId);
  if (!plan) return Response.json({ error: "unknown_plan" }, { status: 400 });
  const priceId = priceIdFor(planId);
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
  const meta = {
    profile_id: user.id,
    plan_id: plan.id,
    monthly_credits: String(plan.monthly_credits),
  };
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?status=success`,
    cancel_url: `${appUrl}/billing?status=cancel`,
    metadata: { ...meta, kind: "subscription" },
    subscription_data: { metadata: meta },
  });

  return Response.json({ url: session.url });
}

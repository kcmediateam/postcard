import { createServerSupabase } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { ensureStripeCustomer } from "@/lib/stripe/customer";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

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
  const session = await getStripe().billingPortal.sessions.create({
    customer,
    return_url: `${appUrl}/billing`,
  });

  return Response.json({ url: session.url });
}

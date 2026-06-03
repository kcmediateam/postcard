import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "./server";

/**
 * Return the agent's Stripe customer id, creating one (and saving it on the
 * profile) the first time. One Stripe customer per agent.
 */
export async function ensureStripeCustomer(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
  existingCustomerId: string | null
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;
  const customer = await getStripe().customers.create({
    email: email ?? undefined,
    metadata: { profile_id: userId },
  });
  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  return customer.id;
}

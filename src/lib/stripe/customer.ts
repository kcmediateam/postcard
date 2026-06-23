import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "./server";

/** True when Stripe reports the referenced object doesn't exist on this account. */
function isResourceMissing(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "resource_missing"
  );
}

/**
 * Return the agent's Stripe customer id, creating one (and saving it on the
 * profile) the first time. One Stripe customer per agent.
 *
 * If a stored id is present but no longer exists on the current Stripe account
 * (e.g. it was created under a different/rotated key, or deleted), we discard
 * it and create a fresh customer — otherwise every checkout/portal call fails
 * with "No such customer".
 */
export async function ensureStripeCustomer(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
  existingCustomerId: string | null
): Promise<string> {
  const stripe = getStripe();

  if (existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(existingCustomerId);
      // retrieve() returns a { deleted: true } stub for deleted customers.
      if (!("deleted" in existing) || !existing.deleted) {
        return existingCustomerId;
      }
    } catch (err) {
      if (!isResourceMissing(err)) throw err;
      // fall through: stale id, create a replacement below
    }
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { profile_id: userId },
  });
  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  return customer.id;
}

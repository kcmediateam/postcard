/**
 * Billing catalog — placeholder pricing for the mock.
 *
 * In the real build these map to Stripe Products/Prices; the IDs here stand in
 * for Stripe price IDs. Tune the numbers freely — they're not load-bearing.
 *
 * One credit = one postcard.
 */

export interface CreditPack {
  id: string;
  credits: number;
  price_usd: number; // total charge
  popular?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price_usd: number; // per month
  monthly_credits: number;
  blurb: string;
  popular?: boolean;
}

/** One-time add-on packs. Priced above every subscription rate. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_small", credits: 100, price_usd: 159 },
  { id: "pack_medium", credits: 250, price_usd: 385 },
  { id: "pack_large", credits: 500, price_usd: 745, popular: true },
  { id: "pack_jumbo", credits: 1000, price_usd: 1440 },
];

/** Monthly subscriptions (best rate). Unused credits roll over (added on top). */
export const PLANS: Plan[] = [
  {
    id: "plan_starter",
    name: "Starter",
    price_usd: 360,
    monthly_credits: 250,
    blurb: "For agents getting started with farming.",
  },
  {
    id: "plan_growth",
    name: "Growth",
    price_usd: 695,
    monthly_credits: 500,
    blurb: "Steady monthly neighborhood campaigns.",
    popular: true,
  },
  {
    id: "plan_pro",
    name: "Pro",
    price_usd: 1340,
    monthly_credits: 1000,
    blurb: "High-volume, multi-neighborhood outreach.",
  },
  {
    id: "plan_scale",
    name: "Scale",
    price_usd: 3225,
    monthly_credits: 2500,
    blurb: "Teams and multi-market farming at scale.",
  },
];

/**
 * Credits consumed per postcard, by how the mailing list is sourced.
 * Self-service (agent uploads their own list) is the base rate; managed
 * (we build the list for them) costs more per piece. One credit = one postcard
 * at the self-service rate. Adjust freely — this is the single source of truth.
 */
export const CREDITS_PER_PIECE = {
  self_service: 1,
  managed: 2,
} as const;

export type AudienceTier = keyof typeof CREDITS_PER_PIECE;

export function findCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function findPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function perPieceCost(pack: CreditPack): number {
  return pack.price_usd / pack.credits;
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });
}

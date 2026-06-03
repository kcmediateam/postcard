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

/** One-time credit purchases. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_100", credits: 100, price_usd: 89 },
  { id: "pack_500", credits: 500, price_usd: 399, popular: true },
  { id: "pack_1000", credits: 1000, price_usd: 699 },
];

/** Monthly subscriptions. Unused credits roll over (added on top, never reset). */
export const PLANS: Plan[] = [
  {
    id: "plan_starter",
    name: "Starter",
    price_usd: 99,
    monthly_credits: 150,
    blurb: "For agents testing the waters.",
  },
  {
    id: "plan_growth",
    name: "Growth",
    price_usd: 299,
    monthly_credits: 500,
    blurb: "Steady monthly farming campaigns.",
    popular: true,
  },
  {
    id: "plan_pro",
    name: "Pro",
    price_usd: 599,
    monthly_credits: 1100,
    blurb: "High-volume, multi-neighborhood outreach.",
  },
];

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

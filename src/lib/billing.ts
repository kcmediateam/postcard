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
  managed: 1.5,
} as const;

export type AudienceTier = keyof typeof CREDITS_PER_PIECE;

/**
 * Credit cost for a send. Managed (we build the list) is 1.5 credits/piece; the
 * sourced list is reusable — a one-time fee per targeted radius, then re-send to
 * it any time. Rounded up so the integer ledger never undercharges.
 */
export function creditCost(pieces: number, tier: AudienceTier): number {
  return Math.ceil(pieces * CREDITS_PER_PIECE[tier]);
}

/**
 * Volume pricing — $/credit drops as you cross thresholds, so buying more is
 * rewarded (not penalized). Tiers are by total credits. Single source of truth
 * for the home pricing calculator.
 */
export const VOLUME_TIERS: { min: number; per_credit: number }[] = [
  { min: 0, per_credit: 1.59 },
  { min: 250, per_credit: 1.49 },
  { min: 500, per_credit: 1.44 },
  { min: 1000, per_credit: 1.39 },
  { min: 2500, per_credit: 1.34 },
  { min: 5000, per_credit: 1.29 },
];

export const BASE_PER_CREDIT = VOLUME_TIERS[0].per_credit;

/** Best per-credit rate for a credit quantity, plus the next tier (if any). */
export function volumeRate(credits: number): {
  perCredit: number;
  tierMin: number;
  next: { min: number; per_credit: number } | null;
} {
  let idx = 0;
  for (let i = 0; i < VOLUME_TIERS.length; i++) {
    if (credits >= VOLUME_TIERS[i].min) idx = i;
  }
  return {
    perCredit: VOLUME_TIERS[idx].per_credit,
    tierMin: VOLUME_TIERS[idx].min,
    next: VOLUME_TIERS[idx + 1] ?? null,
  };
}

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

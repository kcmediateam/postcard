"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CREDITS_PER_PIECE, PLANS, formatUsd } from "@/lib/billing";

// Representative per-credit rate (Growth plan) for the live estimate.
const growth = PLANS.find((p) => p.id === "plan_growth")!;
const PER_CREDIT = growth.price_usd / growth.monthly_credits;

const MIN = 100;
const MAX = 2500;

export function PricingCalculator() {
  const [qty, setQty] = useState(500);
  const [managed, setManaged] = useState(false);

  const rate = managed
    ? CREDITS_PER_PIECE.managed
    : CREDITS_PER_PIECE.self_service;
  const credits = qty * rate;
  const cost = credits * PER_CREDIT;
  const pct = ((qty - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      {/* mode toggle */}
      <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 text-sm font-medium">
        <button
          onClick={() => setManaged(false)}
          className={`h-10 rounded-lg transition-colors ${
            !managed ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
          }`}
        >
          Self-serve mailing
        </button>
        <button
          onClick={() => setManaged(true)}
          className={`h-10 rounded-lg transition-colors ${
            managed ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
          }`}
        >
          Automation + lead gen
        </button>
      </div>

      <div className="grid gap-8 p-8 sm:grid-cols-2">
        {/* slider side */}
        <div>
          <div className="text-sm text-zinc-500">Postcards per campaign</div>
          <div className="mt-1 text-4xl font-semibold tabular-nums text-zinc-900">
            {qty.toLocaleString()}
          </div>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={50}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="mt-5 w-full accent-brand-600"
            style={{
              background: `linear-gradient(to right, var(--color-brand-500) ${pct}%, #e4e4e7 ${pct}%)`,
              height: "6px",
              borderRadius: "9999px",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          />
          <div className="mt-2 flex justify-between text-xs text-zinc-400">
            <span>{MIN}</span>
            <span>{MAX.toLocaleString()}+</span>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            {managed
              ? "We source the audience for your target area and mail it for you."
              : "You bring the mailing list — the best per-piece rate."}
          </p>
        </div>

        {/* result side */}
        <div className="flex flex-col justify-center rounded-2xl bg-zinc-50 p-6">
          <div className="text-sm text-zinc-500">You&rsquo;ll use</div>
          <div className="mt-1 text-4xl font-semibold tabular-nums text-radiate">
            {credits.toLocaleString()}
          </div>
          <div className="text-sm text-zinc-500">
            credits · {rate} per postcard
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-4">
            <div className="text-2xl font-semibold text-zinc-900">
              ≈ {formatUsd(Math.round(cost))}
            </div>
            <div className="text-xs text-zinc-500">
              about {formatUsd(cost / qty)} per postcard
            </div>
          </div>

          <Link href="/login?mode=signup" className="mt-5">
            <Button fullWidth>Get started</Button>
          </Link>
        </div>
      </div>

      <p className="border-t border-zinc-100 px-8 py-3 text-center text-xs text-zinc-400">
        Estimate at the Growth plan rate ({formatUsd(PER_CREDIT)}/credit).{" "}
        <Link href="/pricing" className="font-medium text-brand-600 hover:text-brand-700">
          See full pricing →
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CREDITS_PER_PIECE,
  BASE_PER_CREDIT,
  volumeRate,
  formatUsd,
} from "@/lib/billing";

const MIN = 100;
const MAX = 5000;

export function PricingCalculator() {
  const [qty, setQty] = useState(1000);
  const [managed, setManaged] = useState(false);

  const rate = managed
    ? CREDITS_PER_PIECE.managed
    : CREDITS_PER_PIECE.self_service;
  const credits = qty * rate;

  const { perCredit, next } = volumeRate(credits);
  const cost = credits * perCredit;
  const savings = Math.round((1 - perCredit / BASE_PER_CREDIT) * 100);
  const pct = ((qty - MIN) / (MAX - MIN)) * 100;

  // How many more postcards to reach the next (cheaper) tier.
  const toNextPostcards = next
    ? Math.ceil((next.min - credits) / rate)
    : 0;

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
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-500">You&rsquo;ll use</div>
            {savings > 0 && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                Save {savings}%
              </span>
            )}
          </div>
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
              {formatUsd(perCredit)}/credit at this volume
            </div>
          </div>

          <Link href="/login?mode=signup" className="mt-5">
            <Button fullWidth>Get started</Button>
          </Link>
        </div>
      </div>

      {/* volume incentive */}
      <div className="border-t border-zinc-100 bg-brand-50/50 px-8 py-3 text-center text-xs text-zinc-600">
        {next ? (
          <>
            Add <span className="font-semibold text-brand-700">
              {toNextPostcards.toLocaleString()} more postcards
            </span>{" "}
            to unlock {formatUsd(next.per_credit)}/credit.
          </>
        ) : (
          <>You&rsquo;re at our best volume rate — {formatUsd(perCredit)}/credit. 🎉</>
        )}{" "}
        <Link href="/pricing" className="font-medium text-brand-600 hover:text-brand-700">
          See full pricing →
        </Link>
      </div>
    </div>
  );
}

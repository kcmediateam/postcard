"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useData } from "@/lib/data/data-context";
import {
  CREDIT_PACKS,
  PLANS,
  findPlan,
  formatUsd,
  perPieceCost,
  type CreditPack,
  type Plan,
} from "@/lib/billing";
import type { CreditTransaction, Subscription } from "@/lib/types";

const REASON_LABELS: Record<CreditTransaction["reason"], string> = {
  purchase: "Credit purchase",
  subscription_grant: "Subscription credits",
  rollover: "Rollover",
  campaign_send: "Campaign send",
  refund: "Refund",
  adjustment: "Adjustment",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BillingPage() {
  const { wallet, refreshWallet, db } = useData();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [txns, sub] = await Promise.all([
      db.listCreditTransactions(),
      db.getSubscription(),
    ]);
    setTransactions(txns);
    setSubscription(sub);
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  function showFlash(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 6000);
  }

  // Handle return from Stripe Checkout (?status=success|cancel).
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    if (!status) return;
    window.history.replaceState({}, "", "/billing");
    if (status === "success") {
      showFlash("Payment received — your balance will update momentarily.");
      refreshWallet();
      reload();
      // webhook may land a beat after redirect; refresh again shortly
      const t = window.setTimeout(() => {
        refreshWallet();
        reload();
      }, 2500);
      return () => window.clearTimeout(t);
    }
    if (status === "cancel") showFlash("Checkout canceled — no charge was made.");
  }, [refreshWallet, reload]);

  async function buyPack(pack: CreditPack) {
    setBusy(pack.id);
    try {
      await db.purchaseCreditPack(pack.id); // redirects to Stripe Checkout
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(null);
    }
  }

  async function subscribe(plan: Plan) {
    setBusy(plan.id);
    try {
      await db.subscribeToPlan(plan.id); // redirects to Stripe Checkout
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      await db.openBillingPortal(); // redirects to Stripe customer portal
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Could not open the portal.");
      setBusy(null);
    }
  }

  const currentPlan = subscription ? findPlan(subscription.plan) : null;
  const balance = wallet?.balance ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Billing"
        description="Buy credits or subscribe to a monthly plan. One credit sends one postcard."
      />

      {flash && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {flash}
        </div>
      )}

      {/* Balance + current plan */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm text-zinc-500">Credit balance</div>
          <div className="mt-1 text-4xl font-semibold tabular-nums text-zinc-900">
            {balance.toLocaleString()}
            <span className="ml-2 text-base font-normal text-zinc-400">
              credits
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Enough for {balance.toLocaleString()} postcards.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-zinc-500">Current plan</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900">
                {currentPlan ? currentPlan.name : "No subscription"}
              </div>
              {subscription && currentPlan ? (
                <p className="mt-2 text-xs text-zinc-500">
                  {currentPlan.monthly_credits.toLocaleString()} credits/mo ·
                  renews {formatDate(subscription.current_period_end)}
                </p>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
                  Subscribe for monthly credits with rollover.
                </p>
              )}
            </div>
            {subscription && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Active
              </span>
            )}
          </div>
          {subscription && (
            <button
              onClick={openPortal}
              disabled={busy === "portal"}
              className="mt-4 text-xs font-medium text-brand-600 underline-offset-2 hover:underline disabled:opacity-60"
            >
              {busy === "portal" ? "Opening…" : "Manage subscription"}
            </button>
          )}
        </Card>
      </div>

      {/* Credit packs */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Buy credits</h2>
        <p className="mt-1 text-sm text-zinc-500">
          One-time purchase. Credits never expire.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={`relative p-5 ${
                pack.popular ? "ring-2 ring-brand-500" : ""
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Best value
                </span>
              )}
              <div className="text-3xl font-semibold tabular-nums text-zinc-900">
                {pack.credits.toLocaleString()}
              </div>
              <div className="text-sm text-zinc-500">credits</div>
              <div className="mt-3 text-2xl font-semibold text-zinc-900">
                {formatUsd(pack.price_usd)}
              </div>
              <div className="text-xs text-zinc-500">
                {formatUsd(perPieceCost(pack))} per postcard
              </div>
              <Button
                className="mt-4"
                fullWidth
                variant={pack.popular ? "primary" : "secondary"}
                loading={busy === pack.id}
                onClick={() => buyPack(pack)}
              >
                Buy {pack.credits.toLocaleString()} credits
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Monthly plans
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Credits are granted every month and roll over — unused credits stay
          in your wallet.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col p-5 ${
                  plan.popular ? "ring-2 ring-brand-500" : ""
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <div className="text-lg font-semibold text-zinc-900">
                  {plan.name}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{plan.blurb}</p>
                <div className="mt-3">
                  <span className="text-2xl font-semibold text-zinc-900">
                    {formatUsd(plan.price_usd)}
                  </span>
                  <span className="text-sm text-zinc-500">/mo</span>
                </div>
                <div className="mt-1 text-sm text-zinc-600">
                  {plan.monthly_credits.toLocaleString()} credits / month
                </div>
                <Button
                  className="mt-4"
                  fullWidth
                  variant={isCurrent ? "secondary" : "primary"}
                  disabled={isCurrent}
                  loading={busy === plan.id}
                  onClick={() => subscribe(plan)}
                >
                  {isCurrent
                    ? "Current plan"
                    : subscription
                    ? "Switch to this plan"
                    : `Subscribe to ${plan.name}`}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Billing history */}
      <section className="mt-10">
        <Card>
          <CardHeader
            title="Billing history"
            description="Every credit movement — the ledger is the source of truth."
            action={
              <button
                onClick={openPortal}
                disabled={busy === "portal"}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                {busy === "portal" ? "Opening…" : "Customer portal"}
              </button>
            }
          />
          {!loaded ? (
            <div className="px-5 py-8 text-sm text-zinc-400">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="px-5 py-8 text-sm text-zinc-500">
              No transactions yet. Buy credits or subscribe to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-5 py-2.5 font-medium">Description</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-zinc-50 last:border-0"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-500">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-5 py-3 text-zinc-800">
                        {REASON_LABELS[t.reason]}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-medium tabular-nums ${
                          t.delta >= 0 ? "text-green-700" : "text-zinc-700"
                        }`}
                      >
                        {t.delta >= 0 ? "+" : ""}
                        {t.delta.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <p className="mt-6 text-center text-xs text-zinc-400">
        Stripe test mode — use card 4242 4242 4242 4242, any future expiry &amp;
        CVC. No real charges.
      </p>
    </div>
  );
}

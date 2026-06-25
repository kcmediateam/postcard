import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  CREDIT_PACKS,
  PLANS,
  CREDITS_PER_PIECE,
  formatUsd,
  perPieceCost,
} from "@/lib/billing";

export const metadata: Metadata = {
  title: "Pricing — one credit, one postcard",
  description:
    "Honest per-piece direct mail pricing: print and postage included, no minimums, no markup. Subscribe for the best rate with rollover credits, or buy one-time packs.",
  alternates: { canonical: "/pricing" },
};

const FAQS = [
  {
    q: "How much does it cost to send a postcard?",
    a: "One credit sends one postcard. Subscribe for the best per-credit rate (credits roll over), or buy one-time packs. Printing and postage are included — no markup.",
  },
  {
    q: "Is there a minimum order?",
    a: "No minimums. Mail as few as one postcard or as many as tens of thousands — the smallest test and the biggest campaign run on the same rails.",
  },
  {
    q: "What's included in the price?",
    a: "Printing, first-class postage, USPS address verification, a tracked QR code on every piece, and your live dashboard. What you see is what you send.",
  },
  {
    q: "Do unused credits expire?",
    a: "Subscription credits roll over month to month while your plan is active. One-time pack credits don't expire.",
  },
  {
    q: "Can you build my mailing list?",
    a: "Yes. With full-service, tell us the ZIP or neighborhood and how many homes to reach, and we source the list for you.",
  },
  {
    q: "Who is Radiate for?",
    a: "Any local business that mails — real-estate agents, home-service pros, and small businesses.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function PricingPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50/70 to-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Simple, credit-based pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">
            One credit sends one postcard. Subscribe for the best rate with
            credits that roll over, or buy add-on packs any time.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Monthly plans
        </h2>
        <p className="mt-2 text-zinc-600">
          Credits are granted every month and roll over — unused credits stay in
          your wallet.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.popular ? "border-2 border-brand-500 shadow-md" : "border-zinc-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}
              <div className="text-lg font-semibold text-zinc-900">{plan.name}</div>
              <p className="mt-1 text-sm text-zinc-500">{plan.blurb}</p>
              <div className="mt-4">
                <span className="text-3xl font-semibold text-zinc-900">
                  {formatUsd(plan.price_usd)}
                </span>
                <span className="text-sm text-zinc-500">/mo</span>
              </div>
              <div className="mt-1 text-sm text-zinc-600">
                {plan.monthly_credits.toLocaleString()} credits / month
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {formatUsd(plan.price_usd / plan.monthly_credits)} per postcard
              </div>
              <Link href="/login?mode=signup" className="mt-6">
                <Button fullWidth variant={plan.popular ? "primary" : "secondary"}>
                  Choose {plan.name}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Packs */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Add-on credit packs
        </h2>
        <p className="mt-2 text-zinc-600">
          One-time purchases for when you need a top-up. No subscription required;
          credits never expire.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-2xl border p-6 ${
                pack.popular ? "border-2 border-brand-500 shadow-md" : "border-zinc-200"
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Best value
                </span>
              )}
              <div className="text-3xl font-semibold text-zinc-900">
                {pack.credits.toLocaleString()}
              </div>
              <div className="text-sm text-zinc-500">credits</div>
              <div className="mt-4 text-2xl font-semibold text-zinc-900">
                {formatUsd(pack.price_usd)}
              </div>
              <div className="text-xs text-zinc-400">
                {formatUsd(perPieceCost(pack))} per postcard
              </div>
              <Link href="/login?mode=signup" className="mt-6 block">
                <Button fullWidth variant="secondary">
                  Buy {pack.credits.toLocaleString()}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Self vs full service */}
      <section className="bg-zinc-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
              <h3 className="text-xl font-semibold text-zinc-900">Self-service</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                You upload the list. The base rate —{" "}
                <span className="font-medium text-zinc-900">
                  {CREDITS_PER_PIECE.self_service} credit per postcard
                </span>
                .
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
              <h3 className="text-xl font-semibold text-zinc-900">Full-service</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                We build the list for your target area —{" "}
                <span className="font-medium text-zinc-900">
                  {CREDITS_PER_PIECE.managed} credits per postcard
                </span>
                . Pay once per radius, then re-send to it any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-900">
          Frequently asked questions
        </h2>
        <div className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-zinc-900">
                {f.q}
                <span className="text-brand-600 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-radiate">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 py-14 text-center sm:flex-row sm:text-left">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Start with as little as one postcard.
          </h2>
          <Link href="/login?mode=signup">
            <Button size="lg" variant="secondary">
              Create your account
            </Button>
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
    </>
  );
}

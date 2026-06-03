import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PostcardPreview } from "@/components/postcard/postcard-side";
import { PricingCalculator } from "@/components/marketing/pricing-calculator";
import { CompareTable } from "@/components/marketing/compare-table";
import { TEMPLATES } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Radiate — targeted direct mail for real estate agents",
  description:
    "Design, mail, and measure postcard campaigns. Verified addresses, QR scan tracking, transparent credit pricing — self-serve or done-for-you.",
};

const byKind = (k: string) => TEMPLATES.find((t) => t.kind === k)!;

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-radiate pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full opacity-20 blur-3xl" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
              <span className="bg-radiate size-2 rounded-full" />
              Targeted direct mail, done for you
            </span>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-zinc-900">
              Mail that <span className="text-radiate">radiates</span> results.
            </h1>
            <p className="mt-4 max-w-md text-xl text-zinc-600">
              Tracked postcards for real estate — design, send, and measure in
              minutes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login?mode=signup">
                <Button size="lg">Start sending</Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="secondary">
                  See pricing
                </Button>
              </Link>
            </div>
          </div>

          {/* Fanned postcards */}
          <div className="relative mx-auto hidden h-[380px] w-full max-w-md lg:block">
            <FanCard kind="just_sold" className="left-0 top-10 -rotate-[8deg]" />
            <FanCard kind="open_house" className="right-0 top-14 rotate-[8deg]" />
            <FanCard
              kind="just_listed"
              className="left-1/2 top-0 z-10 -translate-x-1/2 shadow-2xl"
            />
          </div>
          {/* mobile: single */}
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 shadow-xl lg:hidden">
            <PostcardPreview
              kind={byKind("just_listed").kind}
              fields={byKind("just_listed").defaults}
              side="front"
              profile={null}
            />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-zinc-100 bg-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
          {[
            ["1:1", "credit per postcard"],
            ["QR", "tracked, every piece"],
            ["100%", "addresses verified"],
            ["Mins", "design to mailbox"],
          ].map(([big, small]) => (
            <div key={small} className="text-center">
              <div className="text-2xl font-semibold text-radiate">{big}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing calculator */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Transparent, credit-based pricing
          </h2>
          <p className="mt-3 text-zinc-600">
            Slide to size your campaign. Toggle done-for-you on or off.
          </p>
        </div>
        <PricingCalculator />
      </section>

      {/* How it works */}
      <section className="bg-zinc-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="bg-radiate mx-auto flex size-12 items-center justify-center rounded-2xl text-white shadow-sm">
                  {s.icon}
                </div>
                <div className="mt-4 text-xs font-semibold text-brand-600">
                  Step {i + 1}
                </div>
                <h3 className="mt-1 text-base font-semibold text-zinc-900">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {VALUE.map((v) => (
            <div key={v.title} className="rounded-2xl border border-zinc-200 p-6">
              <div className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                {v.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">
                {v.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-zinc-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Why agents switch to Radiate
            </h2>
            <p className="mt-3 text-lg text-zinc-600">
              One platform for design, mailing, tracking, and automation — without
              the hidden fees or per-list charges.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-700">
              <span className="bg-radiate size-2 rounded-full" />
              The only platform that rolls over unused monthly-plan credits
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CompareTable />
          </div>
          <p className="mt-4 text-center text-xs text-zinc-400">
            Based on publicly available information and customer feedback;
            competitor offerings may change.
          </p>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-radiate">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 py-16 text-center sm:flex-row sm:text-left">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Put your name in every mailbox.
          </h2>
          <Link href="/login?mode=signup">
            <Button size="lg" variant="secondary">
              Get started free
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

function FanCard({ kind, className = "" }: { kind: string; className?: string }) {
  const t = byKind(kind);
  return (
    <div
      className={`absolute w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl ${className}`}
    >
      <PostcardPreview kind={t.kind} fields={t.defaults} side="front" profile={null} />
    </div>
  );
}

const ic = (path: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const STEPS = [
  { title: "Design", body: "Template or upload", icon: ic(<><rect x="3" y="4" width="18" height="14" rx="2" /><path d="m21 15-5-5L5 21" /></>) },
  { title: "Audience", body: "Your list or ours", icon: ic(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>) },
  { title: "Send", body: "Now or scheduled", icon: ic(<><path d="m3 11 18-5v12L3 14v-3Z" /></>) },
  { title: "Track", body: "Deliveries & scans", icon: ic(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h7v7h-7z" /></>) },
];

const VALUE = [
  { title: "Verified addresses", body: "Bad addresses skipped — never charged.", icon: ic(<><path d="M20 6 9 17l-5-5" /></>) },
  { title: "QR scan tracking", body: "Real engagement, per piece.", icon: ic(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 21v.01M17 21h.01M21 17v.01" /></>) },
  { title: "Credits that roll over", body: "Subscribe or top up. Never expire.", icon: ic(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>) },
];

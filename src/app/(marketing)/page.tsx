import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PostcardPreview } from "@/components/postcard/postcard-side";
import { PricingCalculator } from "@/components/marketing/pricing-calculator";
import { CompareTable } from "@/components/marketing/compare-table";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { Reveal, CountUp } from "@/components/marketing/motion";
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
        <div className="bg-radiate-anim pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full opacity-20 blur-3xl" />
        <div className="bg-radiate-anim pointer-events-none absolute -left-32 top-40 size-[24rem] rounded-full opacity-10 blur-3xl" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:py-24">
          <Reveal>
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
          </Reveal>

          {/* Fanned postcards — gently floating */}
          <div className="relative mx-auto hidden h-[380px] w-full max-w-md lg:block">
            <FanCard
              kind="neighbor_intro"
              accent="#0f766e"
              headline="Just listed in your neighborhood"
              subhead="See what your home could sell for."
              pos="left-0 top-10"
              base="rotate(-8deg)"
              floatClass="animate-float-slow"
            />
            <FanCard
              kind="neighbor_intro"
              accent="#3a63e6"
              headline="What's your home worth today?"
              subhead="Get a free, no-pressure estimate."
              pos="right-0 top-14"
              base="rotate(8deg)"
              floatClass="animate-float"
              delay={1.2}
            />
            <FanCard
              kind="neighbor_intro"
              pos="left-1/2 top-0 z-10 shadow-2xl"
              base="translateX(-50%)"
              floatClass="animate-float"
              delay={0.5}
            />
          </div>
          {/* mobile: single */}
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 shadow-xl lg:hidden">
            <PostcardPreview
              kind={byKind("neighbor_intro").kind}
              theme={byKind("neighbor_intro").theme}
              accent={byKind("neighbor_intro").defaults.accent || byKind("neighbor_intro").accent}
              layout={byKind("neighbor_intro").layout}
              font={byKind("neighbor_intro").defaults.font || undefined}
              fields={byKind("neighbor_intro").defaults}
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
            { big: <>1:1</>, small: "credit per postcard" },
            { big: <>QR</>, small: "tracked, every piece" },
            { big: <CountUp value={100} suffix="%" />, small: "addresses verified" },
            { big: <>Mins</>, small: "design to mailbox" },
          ].map((s, i) => (
            <Reveal key={s.small} delay={i * 90} className="text-center">
              <div className="text-2xl font-semibold text-radiate">{s.big}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{s.small}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Brokerage logo marquee */}
      <LogoMarquee />

      {/* Why postcards work — stats */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900">
            Why the mailbox still wins
          </h2>
          <p className="mt-3 text-lg text-zinc-600">
            For US real-estate farming, showing up in the mailbox — again and
            again — is how you become the agent people already trust.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 100}
              className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition-shadow duration-300 hover:shadow-lg"
            >
              <div className="text-4xl font-bold text-radiate">
                <CountUp value={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
              </div>
              <div className="mt-2 text-sm font-semibold text-zinc-900">
                {s.label}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">{s.sub}</div>
            </Reveal>
          ))}
        </div>

        <Reveal
          delay={120}
          className="mx-auto mt-10 max-w-3xl rounded-2xl bg-zinc-50 p-6 text-center"
        >
          <p className="text-lg leading-relaxed text-zinc-700">
            It takes{" "}
            <span className="font-semibold text-zinc-900">
              around 7 touches
            </span>{" "}
            before a prospect remembers your name — yet most buyers and sellers
            hire the first agent they think of. Consistent, tracked postcards
            keep <span className="font-semibold text-zinc-900">you</span> top of
            mind for that moment.
          </p>
        </Reveal>

        <p className="mt-5 text-center text-xs text-zinc-400">
          Sources: NAR Profile of Home Buyers &amp; Sellers (2025); ANA/DMA
          Response Rate Report; the marketing &ldquo;Rule of 7.&rdquo; US
          figures.
        </p>
      </section>

      {/* Pricing calculator */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <Reveal className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Transparent, credit-based pricing
          </h2>
          <p className="mt-3 text-zinc-600">
            Slide to size your campaign. Toggle done-for-you on or off.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <PricingCalculator />
        </Reveal>
      </section>

      {/* How it works */}
      <section className="bg-zinc-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 110} className="text-center">
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {VALUE.map((v, i) => (
            <Reveal
              key={v.title}
              delay={i * 110}
              className="rounded-2xl border border-zinc-200 p-6 transition-shadow duration-300 hover:shadow-lg"
            >
              <div className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                {v.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">
                {v.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">{v.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-zinc-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-zinc-900">
              How Radiate compares
            </h2>
            <p className="mt-3 text-lg text-zinc-600">
              Radiate vs. the platforms agents leave behind.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-700">
              <span className="bg-radiate size-2 rounded-full" />
              The only platform that rolls over unused monthly-plan credits
            </p>
          </Reveal>
          <Reveal delay={100} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <CompareTable />
          </Reveal>
          <p className="mt-4 text-center text-xs text-zinc-400">
            Competitor columns reflect publicly available information and quotes
            verified June 2026. Where a capability couldn&apos;t be confirmed, it&apos;s
            marked as such rather than assumed.
          </p>

          {/* Simple, rolling credits */}
          <Reveal className="bg-radiate-anim mx-auto mt-14 max-w-3xl rounded-2xl px-8 py-10 text-center text-white shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
              Simple, rolling credits
            </p>
            <h3 className="mt-2 text-3xl font-bold tracking-tight">
              One credit. One postcard. Everything included.
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/90">
              Every credit covers First-Class printing, postage, premium UV stock,
              and address verification. Credits are granted monthly and roll over —
              unused credits stay in your wallet.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-radiate-anim">
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

function FanCard({
  kind,
  pos = "",
  base = "translateY(0)",
  floatClass = "animate-float",
  delay = 0,
  accent,
  headline,
  subhead,
}: {
  kind: string;
  pos?: string;
  base?: string;
  floatClass?: string;
  delay?: number;
  accent?: string;
  headline?: string;
  subhead?: string;
}) {
  const t = byKind(kind);
  const fields = {
    ...t.defaults,
    ...(headline ? { headline } : {}),
    ...(subhead ? { subhead } : {}),
  };
  return (
    <div
      className={`absolute w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl ${pos} ${floatClass}`}
      style={
        { "--float-base": base, animationDelay: `${delay}s` } as React.CSSProperties
      }
    >
      <PostcardPreview
        kind={t.kind}
        theme={t.theme}
        accent={accent || t.defaults.accent || t.accent}
        layout={t.layout}
        font={t.defaults.font || undefined}
        fields={fields}
        side="front"
        profile={null}
      />
    </div>
  );
}

const ic = (path: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const STATS: {
  value: number;
  suffix: string;
  decimals?: number;
  label: string;
  sub: string;
}[] = [
  { value: 4.4, decimals: 1, suffix: "%", label: "Direct-mail response rate", sub: "vs 0.12% for email" },
  { value: 7, suffix: "+", label: "Touches to be remembered", sub: "the marketing “Rule of 7”" },
  { value: 88, suffix: "%", label: "of buyers use an agent", sub: "NAR, 2025" },
  { value: 91, suffix: "%", label: "of sellers use an agent", sub: "NAR, 2025" },
];

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

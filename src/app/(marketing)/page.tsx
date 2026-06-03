import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PostcardPreview } from "@/components/postcard/postcard-side";
import { TEMPLATES } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Postcard — tracked direct mail for real estate agents",
  description:
    "Design, mail, and measure postcard campaigns. Verified addresses, QR scan tracking, and per-piece pricing — self-service or full-service.",
};

const justListed = TEMPLATES.find((t) => t.kind === "just_listed")!;

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 to-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
              Direct mail that proves its ROI
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl">
              Postcard campaigns that close deals.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600">
              Design a postcard, pick (or let us build) your mailing list, and
              send tracked direct mail in minutes. Every piece carries a QR code,
              so you see deliveries and scans land on your dashboard — not guesses.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?mode=signup">
                <Button size="lg">Start sending</Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="secondary">
                  See pricing
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              No contracts · Pay per piece or subscribe · Credits roll over
            </p>
          </div>

          <div className="relative">
            <div className="rotate-2 overflow-hidden rounded-2xl border border-zinc-200 shadow-xl">
              <PostcardPreview
                kind={justListed.kind}
                fields={justListed.defaults}
                side="front"
                profile={null}
              />
            </div>
            <div className="absolute -bottom-6 -left-4 hidden w-44 -rotate-3 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg sm:block">
              <PostcardPreview
                kind={justListed.kind}
                fields={justListed.defaults}
                side="back"
                profile={null}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-100 bg-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {[
            ["1 credit", "= 1 postcard"],
            ["QR-tracked", "every piece"],
            ["Verified", "addresses before send"],
            ["Minutes", "from design to mailbox"],
          ].map(([big, small]) => (
            <div key={small} className="text-center">
              <div className="text-2xl font-semibold text-zinc-900">{big}</div>
              <div className="mt-1 text-sm text-zinc-500">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Everything you need to farm a neighborhood
          </h2>
          <p className="mt-3 text-lg text-zinc-600">
            From the first design to the last scan, it&rsquo;s one workflow — no
            print shop, no spreadsheets, no guesswork.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-zinc-200 p-6">
              <div className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                {f.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title}>
                <div className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-brand-700">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 py-14 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Ready to put your name in every mailbox?
            </h2>
            <p className="mt-2 text-brand-100">
              Create an account and send your first campaign today.
            </p>
          </div>
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

const ic = (path: React.ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const FEATURES = [
  {
    title: "Designs in minutes",
    body: "Personalize a Just Listed, Just Sold, or Open House template with your photo, headshot, and listing details — or upload your own art.",
    icon: ic(<><rect x="3" y="4" width="18" height="14" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 21" /></>),
  },
  {
    title: "Verified addresses",
    body: "Every list is run through address verification before anything mails, so you never pay to send to a dead address.",
    icon: ic(<><path d="M20 6 9 17l-5-5" /></>),
  },
  {
    title: "QR scan tracking",
    body: "A unique QR code on every postcard means you see real engagement — deliveries and scans, per campaign and per piece.",
    icon: ic(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 21v.01M17 21h.01M21 17v.01" /></>),
  },
  {
    title: "Credits or subscription",
    body: "Buy add-on packs as you go, or subscribe for the best per-piece rate. Unused credits roll over — they never expire.",
    icon: ic(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>),
  },
  {
    title: "We can build your list",
    body: "Don't have a list? Choose full-service and tell us the ZIP or neighborhood — we source the audience and mail it for you.",
    icon: ic(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>),
  },
  {
    title: "One clear dashboard",
    body: "Sends, deliveries, scans, delivery rate, and credit balance — all in one place, segmented by campaign.",
    icon: ic(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>),
  },
];

const STEPS = [
  { title: "Design", body: "Personalize a template or upload your own front and back." },
  { title: "Choose your audience", body: "Upload your mailing list, or have us build one for your target area." },
  { title: "Send", body: "Confirm the credit cost and send now — or schedule it for later." },
  { title: "Track", body: "Watch deliveries and QR scans roll into your dashboard." },
];

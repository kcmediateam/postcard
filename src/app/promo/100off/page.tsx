import Link from "next/link";
import type { Metadata } from "next";
import { Signal } from "@/components/marketing/signal";

// Unlisted: not linked anywhere, and kept out of search results.
export const metadata: Metadata = {
  title: "First 100 postcards free — Radiate",
  robots: { index: false, follow: false },
};

const CODE = "$100off";

/** The coral offer seal — only used on this promo page. */
function OfferBadge() {
  return (
    <div
      className="grid size-32 place-items-center rounded-full text-center text-white [transform:rotate(-9deg)]"
      style={{
        background: "radial-gradient(circle at 50% 38%, #FF5D6C, #E8324A)",
        boxShadow:
          "0 12px 30px -6px rgba(232,50,74,.6), inset 0 2px 0 rgba(255,255,255,.25)",
      }}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-90">
        First
      </span>
      <span className="font-display text-5xl font-extrabold leading-[0.85]">
        100
      </span>
      <span className="text-sm font-extrabold uppercase tracking-wide">
        Free
      </span>
    </div>
  );
}

export default function PromoPage() {
  return (
    <div className="bg-radiate relative min-h-screen overflow-hidden">
      <Signal className="pointer-events-none absolute inset-0 h-full w-full opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,12,46,0.5)_0%,rgba(13,12,46,0.78)_100%)]" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
        <OfferBadge />

        <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold backdrop-blur-sm">
          <span className="bg-signal size-2 rounded-full" />
          Limited-time offer
        </span>

        <h1 className="font-display mt-6 text-5xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
          Your first 100 postcards,{" "}
          <span className="text-signal text-signal-glow">on us.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
          Radiate sends tracked, QR-coded direct mail for local businesses,
          agents, and home-service pros — verified addresses, live delivery
          tracking, and per-recipient scan analytics. Redeem the code for{" "}
          <strong className="text-white">100 free mailers</strong> toward any
          campaign.
        </p>

        <div className="mt-9 w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-6 text-left backdrop-blur-md">
          <div className="text-xs font-medium uppercase tracking-wide text-white/60">
            Your promo code
          </div>
          <div className="mt-2 select-all rounded-lg border-2 border-dashed border-gold/60 bg-white/10 px-4 py-3 text-center text-2xl font-bold tracking-wide text-gold">
            {CODE}
          </div>
          <p className="mt-2 text-xs text-white/60">
            One use per customer. Apply it when you redeem in your account.
          </p>

          <Link
            href={`/login?promo=${encodeURIComponent(CODE)}`}
            className="mt-5 block w-full rounded-full bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Claim your free 100 →
          </Link>
          <Link
            href="/login"
            className="mt-2 block text-center text-xs font-medium text-white/60 hover:text-white"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <div className="mt-14 grid gap-6 text-left sm:grid-cols-3">
          {[
            {
              t: "Upload or paste your list",
              d: "We verify every address with USPS — you never pay to mail a bad one.",
            },
            {
              t: "Send tracked postcards",
              d: "Real 4×6 or 6×9 mail with a scannable QR code linking to your site.",
            },
            {
              t: "See every result",
              d: "Live delivery status + QR scans, and a share link for your clients.",
            },
          ].map((f) => (
            <div key={f.t}>
              <div className="text-sm font-semibold text-white">{f.t}</div>
              <div className="mt-1 text-sm text-white/65">{f.d}</div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-white/45">
          Offer limited to one redemption per customer and one per sender
          address. Radiate reserves the right to void codes used for abuse or
          duplicate accounts.
        </p>
      </div>
    </div>
  );
}

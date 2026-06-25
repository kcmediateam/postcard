import Link from "next/link";
import type { Metadata } from "next";

// Unlisted: not linked anywhere, and kept out of search results.
export const metadata: Metadata = {
  title: "$100 off your first mailing — Radiate",
  robots: { index: false, follow: false },
};

const CODE = "$100off";

export default function PromoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
        <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Limited-time offer
        </span>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Get <span className="text-brand-600">$100 off</span> your first
          postcard campaign
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600">
          Radiate sends tracked, QR-coded direct mail for real-estate agents —
          verified addresses, live delivery tracking, and per-recipient scan
          analytics. Use the code below toward any mailing or credit purchase.
        </p>

        <div className="mt-8 w-full max-w-sm rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Your promo code
          </div>
          <div className="mt-2 select-all rounded-lg border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-2xl font-bold tracking-wide text-brand-700">
            {CODE}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            One use per customer. Apply it when you redeem in your account.
          </p>

          <Link
            href={`/login?promo=${encodeURIComponent(CODE)}`}
            className="mt-5 block w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Claim $100 off
          </Link>
          <Link
            href="/login"
            className="mt-2 block text-center text-xs font-medium text-zinc-500 hover:text-zinc-700"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
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
            <div key={f.t} className="text-left">
              <div className="text-sm font-semibold text-zinc-900">{f.t}</div>
              <div className="mt-1 text-sm text-zinc-500">{f.d}</div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-zinc-400">
          Offer limited to one redemption per customer. Radiate reserves the
          right to void codes used for abuse or duplicate accounts.
        </p>
      </div>
    </div>
  );
}

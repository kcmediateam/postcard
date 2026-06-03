import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Services — Radiate",
  description:
    "Self-service and full-service postcard campaigns: design, list building, address verification, delivery and QR-scan tracking.",
};

const SERVICES = [
  {
    title: "Self-service campaigns",
    body: "Bring your own mailing list and send on your schedule. The lowest per-piece rate — you're in full control from design to send.",
  },
  {
    title: "Full-service list building",
    body: "No list? Tell us the ZIP or neighborhood and how many homes to reach. We source the audience — pay once per radius and re-send to that list any time, no re-buying.",
  },
  {
    title: "Design & personalization",
    body: "Start from a Just Listed, Just Sold, or Open House template and drop in your photo, headshot, price, and details — or upload finished artwork.",
  },
  {
    title: "Address verification",
    body: "Every contact is checked against postal address data before a campaign sends. Undeliverable addresses are flagged and skipped — never charged.",
  },
  {
    title: "Delivery & scan tracking",
    body: "Each postcard prints with a unique QR code. As pieces move through the mail stream and recipients scan, your dashboard updates automatically.",
  },
  {
    title: "Scheduling",
    body: "Send immediately or schedule a campaign for a future date. Set it once and it goes out on time, automatically.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50/70 to-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Services
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-600">
            Everything from a single postcard to a fully-managed neighborhood
            farming program — pick how hands-on you want to be.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="rounded-xl border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold text-zinc-900">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        {/* Self vs full service */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-8">
            <div className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              Self-service
            </div>
            <h3 className="mt-2 text-xl font-semibold text-zinc-900">
              You bring the list
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Upload a CSV of addresses, choose a design, and send. Best per-piece
              rate, full control, instant or scheduled sends.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-brand-500 bg-brand-50/40 p-8">
            <div className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              Full-service
            </div>
            <h3 className="mt-2 text-xl font-semibold text-zinc-900">
              We build the list
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Tell us the area and quantity. We pull the audience and handle the
              mailing — you just approve. A small premium per piece for the
              done-for-you convenience.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link href="/login?mode=signup">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="secondary">
              See pricing
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

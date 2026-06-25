import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PostcardPreview } from "@/components/postcard/postcard-side";
import { TEMPLATES, KIND_LABEL } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Products — Radiate",
  description:
    "Personalizable postcard templates, QR-tracked mail, and flexible credits or subscriptions.",
};

export default function ProductsPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50/70 to-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Products
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-600">
            Professionally designed postcards for any local business —
            personalize them in minutes, then mail and track. Browse the{" "}
            <Link href="/pricing" className="font-medium text-brand-600 hover:text-brand-700">
              pricing
            </Link>{" "}
            or see{" "}
            <Link href="/services" className="font-medium text-brand-600 hover:text-brand-700">
              done-for-you mailing
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Template showcase */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Postcard templates
        </h2>
        <p className="mt-2 max-w-2xl text-zinc-600">
          Start from a template and make it yours — your photo, headshot, price,
          and details drop right in.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {TEMPLATES.filter((t) => t.active).map((t) => (
            <div key={t.id} className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
              <PostcardPreview
                kind={t.kind}
                theme={t.theme}
                accent={t.accent}
                layout={t.layout}
                fields={t.defaults}
                side="front"
                profile={null}
              />
              <div className="px-4 py-3">
                <div className="text-sm font-semibold text-zinc-900">
                  {t.name}
                </div>
                <div className="text-xs text-zinc-500">Fully personalizable</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product pillars */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          <Pillar
            title="QR-tracked postcards"
            body="Every piece prints with a unique QR code, so scans tie back to the exact campaign and recipient."
          />
          <Pillar
            title="Credits & subscriptions"
            body="Buy add-on packs as you need them, or subscribe monthly for the best rate. Credits roll over and never expire."
          />
          <Pillar
            title="Your brand, your design"
            body="Upload your own front and back artwork, or personalize a template with your photos and contact info."
          />
        </div>
      </section>

      <section className="bg-zinc-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 py-14 sm:flex-row">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            See the full pricing
          </h2>
          <div className="flex gap-3">
            <Link href="/pricing">
              <Button size="lg">View pricing</Button>
            </Link>
            <Link href="/login?mode=signup">
              <Button size="lg" variant="secondary">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-6">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{body}</p>
    </div>
  );
}

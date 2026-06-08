"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

const icon = (path: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const ITEMS = [
  {
    title: "Webhooks",
    body: "Get a real-time ping when a postcard is delivered or its QR is scanned — pipe events straight into your tools.",
    icon: icon(<><path d="M18 8a3 3 0 1 0-2.83-4" /><path d="m9 12 3-5" /><circle cx="6" cy="16" r="3" /><path d="M9 16h7a3 3 0 0 0 2.6-4.5" /></>),
  },
  {
    title: "API access",
    body: "Create designs, upload lists, and launch campaigns programmatically with a REST API and keys.",
    icon: icon(<><path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" /></>),
  },
  {
    title: "Brokerage CRM sync",
    body: "Connect your CRM so new leads and listing-status changes automatically trigger the right postcard — custom triggers, hands-free.",
    icon: icon(<><path d="M12 3v18" /><path d="M3 7.5 12 12l9-4.5" /><path d="M3 12l9 4.5L21 12" /><circle cx="12" cy="12" r="9" /></>),
  },
];

export default function IntegrationsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <PageHeader
        title="Integrations"
        description="Automate Radiate with the tools you already use."
      />

      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
        <span className="bg-radiate size-2 rounded-full" />
        Coming soon
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {ITEMS.map((it) => (
          <Card key={it.title} className="relative p-6">
            <span className="absolute right-4 top-4 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
              soon
            </span>
            <div className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
              {it.icon}
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-900">{it.title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{it.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6 text-center">
        <h3 className="text-lg font-semibold text-zinc-900">Want early access?</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
          We&rsquo;re building webhooks, an API, and CRM triggers next. Tell us
          what you&rsquo;d connect and we&rsquo;ll bring you into the beta.
        </p>
        <a
          href="mailto:info@kcmediateam.me?subject=Radiate%20integrations%20early%20access"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Request early access
        </a>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useData } from "@/lib/data/data-context";
import type { Campaign, CampaignStatus } from "@/lib/types";
import type { CampaignStats } from "@/lib/data/provider";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  scheduled: "bg-brand-50 text-brand-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  canceled: "bg-zinc-100 text-zinc-500",
};

export default function DashboardPage() {
  const { db, wallet, refreshWallet } = useData();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});
  const [loaded, setLoaded] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const reload = useCallback(async () => {
    const list = await db.listCampaigns();
    const entries = await Promise.all(
      list.map(async (c) => [c.id, await db.getCampaignStats(c.id)] as const)
    );
    setCampaigns(list);
    setStats(Object.fromEntries(entries));
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function loadSample() {
    setSeeding(true);
    try {
      await db.seedSampleData();
      await refreshWallet();
      await reload();
    } finally {
      setSeeding(false);
    }
  }

  // aggregate totals
  const totals = campaigns.reduce(
    (acc, c) => {
      const s = stats[c.id];
      acc.sent += s?.pieces ?? 0;
      acc.delivered += s?.delivered ?? 0;
      acc.scans += s?.scans ?? 0;
      return acc;
    },
    { sent: 0, delivered: 0, scans: 0 }
  );
  const balance = wallet?.balance ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Dashboard"
        description="Your campaigns at a glance — sends, deliveries, and QR scans."
        action={
          <Link href="/campaigns/new">
            <Button>New campaign</Button>
          </Link>
        }
      />

      {/* stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Credit balance" value={balance} accent />
        <StatCard label="Postcards sent" value={totals.sent} />
        <StatCard label="Delivered" value={totals.delivered} />
        <StatCard label="QR scans" value={totals.scans} />
      </div>

      {/* campaigns table */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Campaigns</h2>

        {!loaded ? (
          <div className="text-sm text-zinc-400">Loading…</div>
        ) : campaigns.length === 0 ? (
          <EmptyState onSeed={loadSample} seeding={seeding} />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-5 py-2.5 font-medium">Campaign</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 text-right font-medium">Pieces</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      Delivered
                    </th>
                    <th className="px-5 py-2.5 text-right font-medium">Scans</th>
                    <th className="px-5 py-2.5 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const s = stats[c.id];
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-zinc-50 last:border-0"
                      >
                        <td className="px-5 py-3 font-medium text-zinc-800">
                          {c.name}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[c.status]}`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                          {c.piece_count.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                          {s ? s.delivered.toLocaleString() : "—"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                          {s ? s.scans.toLocaleString() : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-zinc-500">
                          {c.status === "scheduled" && c.scheduled_at
                            ? `Scheduled ${formatDate(c.scheduled_at)}`
                            : formatDate(c.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card className={`p-4 ${accent ? "bg-brand-600" : ""}`}>
      <div className={`text-xs ${accent ? "text-brand-100" : "text-zinc-500"}`}>
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          accent ? "text-white" : "text-zinc-900"
        }`}
      >
        {value.toLocaleString()}
      </div>
    </Card>
  );
}

function EmptyState({
  onSeed,
  seeding,
}: {
  onSeed: () => void;
  seeding: boolean;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 11 18-5v12L3 14v-3Z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">
        No campaigns yet
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        Create your first campaign to start mailing — or load sample data to see
        how the dashboard looks with results.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/campaigns/new">
          <Button>Create a campaign</Button>
        </Link>
        <Button variant="secondary" onClick={onSeed} loading={seeding}>
          Load sample data
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-zinc-400">
        Sample data is mock-only, for previewing the dashboard.
      </p>
    </Card>
  );
}

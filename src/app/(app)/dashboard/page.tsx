"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PostcardSide } from "@/components/postcard/postcard-side";
import { PostcardHtmlPreview } from "@/components/postcard/postcard-html-preview";
import { isHtmlLayout } from "@/lib/templates";
import { useData } from "@/lib/data/data-context";
import type { Campaign, CampaignStatus, Design } from "@/lib/types";
import type { CampaignPiece, CampaignStats } from "@/lib/data/provider";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

// Per-piece (mail_piece) status → friendly label + chip color.
const PIECE_STATUS: Record<string, { label: string; cls: string }> = {
  created: { label: "Printing", cls: "bg-amber-100 text-amber-700" },
  in_transit: { label: "In transit", cls: "bg-brand-50 text-brand-700" },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700" },
  returned: { label: "Returned", cls: "bg-red-100 text-red-700" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
};

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  scheduled: "bg-brand-50 text-brand-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  canceled: "bg-zinc-100 text-zinc-500",
  awaiting_list: "bg-amber-100 text-amber-700",
};

export default function DashboardPage() {
  const { db, wallet, refreshWallet } = useData();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});
  const [loaded, setLoaded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);

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

  if (selected) {
    return (
      <CampaignDetail
        campaign={selected}
        stats={stats[selected.id]}
        onBack={() => setSelected(null)}
        onDeleted={async () => {
          setSelected(null);
          await reload();
        }}
      />
    );
  }

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

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Credit balance" value={balance} accent />
        <StatCard label="Postcards sent" value={totals.sent} />
        <StatCard
          label="Delivered"
          value={totals.delivered}
          sub={`${pct(totals.delivered, totals.sent)}% of sent`}
        />
        <StatCard
          label="QR scans"
          value={totals.scans}
          sub={`${pct(totals.scans, totals.delivered)}% of delivered`}
        />
      </div>

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
                    <th className="px-5 py-2.5 text-right font-medium">Delivered</th>
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
                        onClick={() => setSelected(c)}
                        className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                      >
                        <td className="px-5 py-3 font-medium text-zinc-800">
                          {c.name}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[c.status]}`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                          {c.piece_count.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                          {s ? (
                            <>
                              {s.delivered.toLocaleString()}
                              <span className="ml-1 text-xs text-zinc-400">
                                {pct(s.delivered, s.pieces)}%
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                          {s ? (
                            <>
                              {s.scans.toLocaleString()}
                              <span className="ml-1 text-xs text-zinc-400">
                                {pct(s.scans, s.delivered)}%
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
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
  sub,
  accent = false,
}: {
  label: string;
  value: number;
  sub?: string;
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
      {sub && (
        <div className={`mt-0.5 text-xs ${accent ? "text-brand-100" : "text-zinc-400"}`}>
          {sub}
        </div>
      )}
    </Card>
  );
}

function EmptyState({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 11 18-5v12L3 14v-3Z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">No campaigns yet</h3>
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

// ---- per-campaign drill-in ----------------------------------------------

function CampaignDetail({
  campaign,
  stats,
  onBack,
  onDeleted,
}: {
  campaign: Campaign;
  stats?: CampaignStats;
  onBack: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const { db } = useData();
  const [pieces, setPieces] = useState<CampaignPiece[]>([]);
  const [design, setDesign] = useState<Design | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, designs] = await Promise.all([
      db.listCampaignPieces(campaign.id),
      db.listDesigns(),
    ]);
    setPieces(p);
    setDesign(designs.find((d) => d.id === campaign.design_id) ?? null);
    setLoaded(true);
  }, [db, campaign.id, campaign.design_id]);

  useEffect(() => {
    load();
  }, [load]);

  async function share() {
    setShareNote("Generating link…");
    try {
      const url = await db.getCampaignShareUrl(campaign.id);
      try {
        await navigator.clipboard.writeText(url);
        setShareNote("Link copied to clipboard!");
      } catch {
        setShareNote(url);
      }
    } catch (e) {
      setShareNote(e instanceof Error ? e.message : "Could not create link.");
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete "${campaign.name}"? This removes it from your dashboard (already-mailed postcards are unaffected). Spent credits aren't refunded.`
      )
    )
      return;
    await db.deleteCampaign(campaign.id);
    await onDeleted();
  }

  async function syncFromLob() {
    setSyncing(true);
    setSyncNote(null);
    try {
      const { updated } = await db.syncCampaignStatus(campaign.id);
      await load();
      setSyncNote(
        updated > 0
          ? `Updated ${updated} piece${updated === 1 ? "" : "s"}.`
          : "Already up to date."
      );
    } catch (e) {
      setSyncNote(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  const s = stats;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        ← Dashboard
      </button>

      <PageHeader
        title={campaign.name}
        description={
          campaign.status === "scheduled" && campaign.scheduled_at
            ? `Scheduled for ${new Date(campaign.scheduled_at).toLocaleString()}`
            : `Created ${formatDate(campaign.created_at)}`
        }
        action={
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[campaign.status]}`}
            >
              {campaign.status.replace("_", " ")}
            </span>
            <Button variant="secondary" onClick={share}>
              Share with client
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </div>
        }
      />

      {shareNote && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800">
          <span className="break-all">{shareNote}</span>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
        {/* design preview */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Design
          </div>
          {design ? (
            <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
              {isHtmlLayout(design.fields) ? (
                <PostcardHtmlPreview design={design} side="front" />
              ) : (
                <PostcardSide design={design} side="front" />
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
              Design unavailable
            </div>
          )}
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MiniStat label="Pieces" value={campaign.piece_count} />
          <MiniStat label="Delivered" value={s?.delivered ?? 0} sub={`${pct(s?.delivered ?? 0, s?.pieces ?? 0)}%`} tone="green" />
          <MiniStat label="In transit" value={s?.in_transit ?? 0} />
          <MiniStat label="Returned" value={s?.returned ?? 0} tone={s && s.returned > 0 ? "red" : "zinc"} />
          <MiniStat label="QR scans" value={s?.scans ?? 0} sub={`${pct(s?.scans ?? 0, s?.delivered ?? 0)}% of delivered`} />
          <MiniStat label="Credits spent" value={campaign.credit_cost} />
        </div>
      </div>

      {/* pieces table */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">Recipients</h2>
          <div className="flex items-center gap-3">
            {syncNote && (
              <span className="text-xs text-zinc-500">{syncNote}</span>
            )}
            <Button
              variant="secondary"
              onClick={syncFromLob}
              loading={syncing}
              disabled={campaign.piece_count === 0}
            >
              Sync for print
            </Button>
          </div>
        </div>
        <Card className="overflow-hidden">
          {!loaded ? (
            <div className="px-5 py-8 text-sm text-zinc-400">Loading…</div>
          ) : pieces.length === 0 ? (
            <div className="px-5 py-8 text-sm text-zinc-500">
              No pieces yet{campaign.status === "scheduled" ? " — sends when scheduled." : "."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-5 py-2.5 font-medium">Recipient</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 text-right font-medium">Scans</th>
                    <th className="px-5 py-2.5 text-right font-medium">Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {pieces.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-zinc-800">
                        {p.contact_name}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            PIECE_STATUS[p.status]?.cls ??
                            "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {PIECE_STATUS[p.status]?.label ??
                            p.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                        {p.scan_count}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-zinc-500">
                        {p.delivered_at ? formatDate(p.delivered_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone = "zinc",
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "zinc" | "green" | "red";
}) {
  const color =
    tone === "green" ? "text-green-700" : tone === "red" ? "text-red-700" : "text-zinc-900";
  return (
    <Card className="p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>
        {value.toLocaleString()}
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>}
    </Card>
  );
}

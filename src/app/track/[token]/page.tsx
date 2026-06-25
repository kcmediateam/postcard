import { getAdminSupabase } from "@/lib/supabase/admin";
import { verifyCampaignToken } from "@/lib/share";

export const runtime = "nodejs";

const PIECE_STATUS: Record<string, { label: string; cls: string }> = {
  created: { label: "Printing", cls: "bg-amber-100 text-amber-700" },
  in_transit: { label: "In transit", cls: "bg-blue-100 text-blue-700" },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700" },
  returned: { label: "Returned", cls: "bg-red-100 text-red-700" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
};

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

type PieceRow = {
  id: string;
  status: string;
  scan_count: number;
  delivered_at: string | null;
  contacts: { full_name?: string } | null;
};

export default async function TrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const campaignId = verifyCampaignToken(token);

  if (!campaignId) return <Invalid />;

  const admin = getAdminSupabase();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, name, status, piece_count, created_at")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return <Invalid />;

  const { data: pieceData } = await admin
    .from("mail_pieces")
    .select("id, status, scan_count, delivered_at, contacts(full_name)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  const pieces = (pieceData ?? []) as unknown as PieceRow[];

  const total = pieces.length;
  const delivered = pieces.filter((p) => p.status === "delivered").length;
  const inTransit = pieces.filter((p) => p.status === "in_transit").length;
  const printing = pieces.filter((p) => p.status === "created").length;
  const scans = pieces.reduce((s, p) => s + (p.scan_count ?? 0), 0);

  const c = campaign as {
    name: string;
    piece_count: number;
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold text-brand-700">Radiate</span>
          <span className="text-xs text-zinc-400">Campaign tracking</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{c.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Live delivery tracking for your postcard campaign.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Postcards" value={total || c.piece_count} />
          <Stat
            label="Delivered"
            value={delivered}
            sub={`${pct(delivered, total)}%`}
            tone="green"
          />
          <Stat label="In transit" value={inTransit} />
          <Stat label="QR scans" value={scans} sub={`${pct(scans, delivered)}% of delivered`} />
        </div>

        {printing > 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            {printing.toLocaleString()} still printing — tracking updates as they
            mail.
          </p>
        )}

        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
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
              {pieces.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-sm text-zinc-500">
                    Postcards are being prepared — check back soon.
                  </td>
                </tr>
              ) : (
                pieces.map((p) => {
                  const st = PIECE_STATUS[p.status] ?? {
                    label: p.status,
                    cls: "bg-zinc-100 text-zinc-600",
                  };
                  return (
                    <tr key={p.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-zinc-800">
                        {p.contacts?.full_name ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                        {p.scan_count ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-zinc-500">
                        {p.delivered_at
                          ? new Date(p.delivered_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Powered by Radiate · This is a private tracking link.
        </p>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "zinc",
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "zinc" | "green";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "green" ? "text-green-700" : "text-zinc-900"
        }`}
      >
        {value.toLocaleString()}
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

function Invalid() {
  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 px-6 text-center">
      <div>
        <div className="text-lg font-semibold text-zinc-900">
          Tracking link not found
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          This link is invalid or has expired. Ask your sender for an updated
          link.
        </p>
      </div>
    </div>
  );
}

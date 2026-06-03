"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { useData } from "@/lib/data/data-context";
import { parseContactsCsv, type ParsedContacts } from "@/lib/csv";

interface Order {
  id: string;
  name: string;
  status: string;
  audience_tier: string;
  piece_count: number;
  credit_cost: number;
  created_at: string;
  agent_email: string;
}
interface ListRequest {
  id: string;
  name: string;
  target_area: string | null;
  requested_quantity: number | null;
  credit_cost: number;
  created_at: string;
  agent_email: string;
  design_name: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const { session, loading } = useData();
  const [tab, setTab] = useState<"requests" | "orders">("requests");
  const isAdmin = session?.profile.is_admin === true;

  useEffect(() => {
    if (!loading && session && !isAdmin) router.replace("/dashboard");
  }, [loading, session, isAdmin, router]);

  if (loading || !session) return <FullScreenLoader />;
  if (!isAdmin) return <FullScreenLoader />;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Admin"
        description="Platform-wide orders and full-service list fulfillment."
      />

      <div className="mt-5 grid w-full max-w-sm grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 text-sm font-medium">
        {(["requests", "orders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-9 rounded-md transition-colors ${
              tab === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            {t === "requests" ? "List requests" : "All orders"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "requests" ? <ListRequests /> : <AllOrders />}
      </div>
    </div>
  );
}

function AllOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((j) => setOrders(j.orders ?? []));
  }, []);

  if (!orders) return <div className="text-sm text-zinc-400">Loading…</div>;
  if (orders.length === 0)
    return <Card className="p-8 text-sm text-zinc-500">No orders yet.</Card>;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-5 py-2.5 font-medium">Agent</th>
              <th className="px-5 py-2.5 font-medium">Campaign</th>
              <th className="px-5 py-2.5 font-medium">Tier</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 text-right font-medium">Pieces</th>
              <th className="px-5 py-2.5 text-right font-medium">Credits</th>
              <th className="px-5 py-2.5 text-right font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-zinc-50 last:border-0">
                <td className="px-5 py-3 text-zinc-700">{o.agent_email}</td>
                <td className="px-5 py-3 font-medium text-zinc-800">{o.name}</td>
                <td className="px-5 py-3 text-zinc-600">
                  {o.audience_tier === "managed" ? "Full-service" : "Self-serve"}
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600">
                    {o.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                  {o.piece_count.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                  {o.credit_cost.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-zinc-500">
                  {formatDate(o.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ListRequests() {
  const [requests, setRequests] = useState<ListRequest[] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const j = await (await fetch("/api/admin/list-requests")).json();
    setRequests(j.requests ?? []);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  function showFlash(m: string) {
    setFlash(m);
    window.setTimeout(() => setFlash(null), 6000);
  }

  if (!requests) return <div className="text-sm text-zinc-400">Loading…</div>;

  return (
    <div>
      {flash && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {flash}
        </div>
      )}
      {requests.length === 0 ? (
        <Card className="p-8 text-sm text-zinc-500">
          No full-service requests awaiting a list. When an agent picks
          &ldquo;Build my list for me,&rdquo; it shows up here pending your
          upload.
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onFulfilled={async (msg) => {
                showFlash(msg);
                await reload();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  onFulfilled,
}: {
  request: ListRequest;
  onFulfilled: (msg: string) => void | Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedContacts | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(file: File | undefined) {
    setError(null);
    setParsed(null);
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseContactsCsv(String(reader.result));
      setParsed(result);
      if (result.unmappedRequired.length > 0)
        setError(`Missing column(s): ${result.unmappedRequired.join(", ")}`);
    };
    reader.readAsText(file);
  }

  async function confirm() {
    if (!parsed || parsed.contacts.length === 0) {
      setError("Upload a CSV with valid addresses first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: request.id, contacts: parsed.contacts }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "insufficient_credits"
            ? `Agent is short on credits (needs ${json.required}, has ${json.available}).`
            : json.error || "Fulfillment failed."
        );
        setBusy(false);
        return;
      }
      await onFulfilled(
        `Sent ${json.sent} postcard(s) for "${request.name}".`
      );
    } catch {
      setError("Fulfillment failed.");
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-zinc-900">{request.name}</div>
          <div className="mt-0.5 text-sm text-zinc-500">
            {request.agent_email} · requested {formatDate(request.created_at)}
          </div>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Awaiting list
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Target area">{request.target_area ?? "—"}</Field>
        <Field label="Quantity">
          {(request.requested_quantity ?? 0).toLocaleString()} postcards
        </Field>
        <Field label="Design">{request.design_name}</Field>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4">
        <div className="mb-1.5 text-sm font-medium text-zinc-700">
          Upload the address list (CSV)
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Columns: full_name, address_line1, address_line2 (optional), city,
          state, zip.
        </p>

        {parsed && (
          <div className="mt-2 text-sm text-zinc-700">
            {fileName}: <span className="font-medium">{parsed.contacts.length}</span>{" "}
            valid address(es)
            {parsed.skipped > 0 && (
              <span className="text-amber-700"> · {parsed.skipped} skipped</span>
            )}
          </div>
        )}
        {error && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          className="mt-3"
          onClick={confirm}
          loading={busy}
          disabled={!parsed || parsed.contacts.length === 0}
        >
          Confirm &amp; send to Lob
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-zinc-800">{children}</div>
    </div>
  );
}

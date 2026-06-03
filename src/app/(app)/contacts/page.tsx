"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { useData } from "@/lib/data/data-context";
import { parseContactsCsv, SAMPLE_CSV, type ParsedContacts } from "@/lib/csv";
import type { Contact, ContactList } from "@/lib/types";
import type { VerificationStats } from "@/lib/data/provider";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContactsPage() {
  const { db } = useData();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [stats, setStats] = useState<Record<string, VerificationStats>>({});
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<ContactList | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const reload = useCallback(async () => {
    const l = await db.listContactLists();
    const entries = await Promise.all(
      l.map(async (list) => [list.id, await db.getContactListStats(list.id)] as const)
    );
    setLists(l);
    setStats(Object.fromEntries(entries));
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (selected) {
    return (
      <ContactListDetail
        list={selected}
        onBack={() => setSelected(null)}
        onChanged={async () => {
          await reload();
        }}
        onDeleted={async () => {
          setSelected(null);
          await reload();
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Contacts"
        description="Upload a CSV of mailing addresses. We verify each address before any postcard is sent — undeliverable addresses are excluded and never charged."
        action={<Button onClick={() => setUploadOpen(true)}>Upload CSV</Button>}
      />

      {!loaded ? (
        <div className="mt-10 text-sm text-zinc-400">Loading…</div>
      ) : lists.length === 0 ? (
        <EmptyState onUpload={() => setUploadOpen(true)} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => {
            const s = stats[list.id];
            return (
              <Card key={list.id} className="p-5">
                <button
                  onClick={() => setSelected(list)}
                  className="block text-left"
                >
                  <div className="text-base font-semibold text-zinc-900 hover:text-brand-700">
                    {list.name}
                  </div>
                </button>
                <div className="mt-1 text-sm text-zinc-500">
                  {list.contact_count.toLocaleString()} contacts ·{" "}
                  {formatDate(list.created_at)}
                </div>
                {s && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    <StatPill kind="verified" n={s.verified} />
                    <StatPill kind="undeliverable" n={s.undeliverable} />
                    {s.unverified > 0 && (
                      <StatPill kind="unverified" n={s.unverified} />
                    )}
                  </div>
                )}
                <button
                  onClick={() => setSelected(list)}
                  className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  View contacts →
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={async (list) => {
          setUploadOpen(false);
          await reload();
          setSelected(list);
        }}
      />
    </div>
  );
}

function StatPill({
  kind,
  n,
}: {
  kind: "verified" | "undeliverable" | "unverified";
  n: number;
}) {
  const map = {
    verified: "bg-green-100 text-green-700",
    undeliverable: "bg-red-100 text-red-700",
    unverified: "bg-zinc-100 text-zinc-600",
  };
  const label = {
    verified: "verified",
    undeliverable: "undeliverable",
    unverified: "unverified",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${map[kind]}`}>
      {n.toLocaleString()} {label[kind]}
    </span>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <Card className="mt-6 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">
        No contact lists yet
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        Upload a CSV with names and mailing addresses. We&rsquo;ll verify every
        address so you only pay to mail deliverable ones.
      </p>
      <Button className="mt-5" onClick={onUpload}>
        Upload your first list
      </Button>
    </Card>
  );
}

// ---- detail view ---------------------------------------------------------

function ContactListDetail({
  list,
  onBack,
  onChanged,
  onDeleted,
}: {
  list: ContactList;
  onBack: () => void;
  onChanged: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}) {
  const { db } = useData();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    setContacts(await db.listContacts(list.id));
    setLoaded(true);
  }, [db, list.id]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = {
    total: contacts.length,
    verified: contacts.filter((c) => c.lob_verification_status === "verified")
      .length,
    undeliverable: contacts.filter(
      (c) => c.lob_verification_status === "undeliverable"
    ).length,
    unverified: contacts.filter(
      (c) => c.lob_verification_status === "unverified"
    ).length,
  };

  async function reverify() {
    setVerifying(true);
    try {
      await db.verifyContactList(list.id);
      await load();
      await onChanged();
    } finally {
      setVerifying(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${list.name}" and its contacts?`)) return;
    await db.deleteContactList(list.id);
    await onDeleted();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        ← All lists
      </button>

      <PageHeader
        title={list.name}
        description={`${list.contact_count.toLocaleString()} contacts · uploaded ${formatDate(
          list.created_at
        )}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={reverify}
              loading={verifying}
            >
              Re-verify
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete list
            </Button>
          </div>
        }
      />

      {/* summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Total" value={counts.total} tone="zinc" />
        <SummaryStat label="Verified" value={counts.verified} tone="green" />
        <SummaryStat
          label="Undeliverable"
          value={counts.undeliverable}
          tone="red"
        />
        <SummaryStat
          label="Unverified"
          value={counts.unverified}
          tone="zinc"
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Only verified addresses are mailed and charged. Undeliverable ones are
        skipped automatically.
      </p>

      {/* table */}
      <Card className="mt-6 overflow-hidden">
        {!loaded ? (
          <div className="px-5 py-8 text-sm text-zinc-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Address</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-50 last:border-0"
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-800">
                      {c.full_name}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {c.address_line1}
                      {c.address_line2 ? `, ${c.address_line2}` : ""}, {c.city},{" "}
                      {c.state} {c.zip}
                    </td>
                    <td className="px-5 py-3">
                      <VerifyChip status={c.lob_verification_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "zinc" | "green" | "red";
}) {
  const color =
    tone === "green"
      ? "text-green-700"
      : tone === "red"
      ? "text-red-700"
      : "text-zinc-900";
  return (
    <Card className="p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>
        {value.toLocaleString()}
      </div>
    </Card>
  );
}

function VerifyChip({
  status,
}: {
  status: Contact["lob_verification_status"];
}) {
  const map = {
    verified: "bg-green-100 text-green-700",
    undeliverable: "bg-red-100 text-red-700",
    unverified: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status]}`}
    >
      {status}
    </span>
  );
}

// ---- upload modal --------------------------------------------------------

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contacts-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function UploadModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (list: ContactList) => void | Promise<void>;
}) {
  const { db } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [parsed, setParsed] = useState<ParsedContacts | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setName("");
    setParsed(null);
    setFileName(null);
    setError(null);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  function onFile(file: File | undefined) {
    setError(null);
    setParsed(null);
    if (!file) return;
    setFileName(file.name);
    if (!name.trim()) setName(file.name.replace(/\.csv$/i, ""));
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseContactsCsv(String(reader.result));
      setParsed(result);
      if (result.unmappedRequired.length > 0) {
        setError(
          `Missing required column(s): ${result.unmappedRequired.join(", ")}. Check the sample format.`
        );
      }
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  async function submit() {
    if (!parsed || parsed.contacts.length === 0) {
      setError("No valid contacts to import.");
      return;
    }
    if (!name.trim()) {
      setError("Give this list a name.");
      return;
    }
    setBusy(true);
    try {
      const list = await db.createContactList({
        name,
        contacts: parsed.contacts,
      });
      // simulate Lob verification immediately after upload
      await db.verifyContactList(list.id);
      reset();
      await onUploaded(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy(false);
    }
  }

  const canSubmit =
    parsed !== null &&
    parsed.contacts.length > 0 &&
    parsed.unmappedRequired.length === 0;

  return (
    <Modal open={open} onClose={close} title="Upload contact list" size="lg">
      <div className="space-y-4">
        <TextField
          label="List name"
          placeholder="78704 farm — spring 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">CSV file</span>
            <button
              type="button"
              onClick={downloadSample}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Download sample CSV
            </button>
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
        </div>

        {parsed && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <div className="font-medium text-zinc-800">
              {fileName} — {parsed.contacts.length.toLocaleString()} valid
              contact{parsed.contacts.length === 1 ? "" : "s"}
            </div>
            {parsed.skipped > 0 && (
              <div className="mt-0.5 text-xs text-amber-700">
                {parsed.skipped} row(s) skipped (missing required fields).
              </div>
            )}
            {parsed.contacts.length > 0 && (
              <div className="mt-2 text-xs text-zinc-500">
                Preview:{" "}
                {parsed.contacts
                  .slice(0, 3)
                  .map((c) => c.full_name)
                  .join(", ")}
                {parsed.contacts.length > 3 ? "…" : ""}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={!canSubmit}>
            Upload &amp; verify
          </Button>
        </div>
      </div>
    </Modal>
  );
}

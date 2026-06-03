"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { PostcardImage } from "@/components/ui/postcard-image";
import { useData } from "@/lib/data/data-context";
import { InsufficientCreditsError } from "@/lib/data";
import type { Campaign, ContactList, Design } from "@/lib/types";
import type { CampaignPreview } from "@/lib/data/provider";

type Timing = "now" | "schedule";

/** yyyy-MM-ddThh:mm in local time, for <input type="datetime-local">. */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function NewCampaignPage() {
  const { db, wallet, refreshWallet } = useData();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [name, setName] = useState("");
  const [designId, setDesignId] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [timing, setTiming] = useState<Timing>("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Campaign | null>(null);

  useEffect(() => {
    Promise.all([db.listDesigns(), db.listContactLists()]).then(([d, l]) => {
      setDesigns(d);
      setLists(l);
      setLoaded(true);
    });
  }, [db]);

  // Load cost preview whenever the selected list changes.
  const loadPreview = useCallback(
    async (id: string) => {
      setPreview(await db.previewCampaign(id));
    },
    [db]
  );
  useEffect(() => {
    if (listId) loadPreview(listId);
    else setPreview(null);
  }, [listId, loadPreview]);

  const selectedDesign = useMemo(
    () => designs.find((d) => d.id === designId) ?? null,
    [designs, designId]
  );
  const selectedList = useMemo(
    () => lists.find((l) => l.id === listId) ?? null,
    [lists, listId]
  );

  const balance = wallet?.balance ?? 0;
  const cost = preview?.credit_cost ?? 0;
  const remaining = balance - cost;
  const affordable = timing === "schedule" || balance >= cost;
  const minDatetime = toLocalInputValue(new Date(Date.now() + 5 * 60 * 1000));

  function validate(): string | null {
    if (!name.trim()) return "Give your campaign a name.";
    if (!designId) return "Pick a design.";
    if (!listId) return "Pick a contact list.";
    if (!preview || preview.deliverable === 0)
      return "The selected list has no deliverable addresses.";
    if (timing === "schedule") {
      if (!scheduledAt) return "Choose a date and time to schedule.";
      if (new Date(scheduledAt).getTime() <= Date.now())
        return "Schedule a time in the future.";
    }
    if (timing === "now" && !affordable)
      return "Not enough credits to send now.";
    return null;
  }

  async function confirm() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const campaign = await db.createCampaign({
        name,
        design_id: designId!,
        contact_list_id: listId!,
        scheduled_at:
          timing === "schedule" ? new Date(scheduledAt).toISOString() : null,
        send_now: timing === "now",
      });
      await refreshWallet();
      setCreated(campaign);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        setError(
          `Not enough credits — need ${e.required.toLocaleString()}, have ${e.available.toLocaleString()}.`
        );
      } else {
        setError(e instanceof Error ? e.message : "Could not create campaign.");
      }
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName("");
    setDesignId(null);
    setListId(null);
    setTiming("now");
    setScheduledAt("");
    setPreview(null);
    setError(null);
    setSubmitting(false);
    setCreated(null);
  }

  if (created) {
    return (
      <SuccessView campaign={created} onAnother={resetForm} />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="New campaign"
        description="Pick a design and a contact list, choose when to send, and confirm the credit cost."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* form */}
        <div className="space-y-8">
          {/* name */}
          <section>
            <SectionTitle n={1} title="Campaign name" />
            <TextField
              label=""
              placeholder="Spring farming — 78704"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </section>

          {/* design */}
          <section>
            <SectionTitle n={2} title="Choose a design" />
            {!loaded ? (
              <div className="text-sm text-zinc-400">Loading…</div>
            ) : designs.length === 0 ? (
              <PromptCard
                text="You don't have any designs yet."
                href="/designs"
                cta="Create a design"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {designs.map((d) => {
                  const active = d.id === designId;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDesignId(d.id)}
                      className={`overflow-hidden rounded-lg border text-left transition-all ${
                        active
                          ? "border-brand-500 ring-2 ring-brand-500"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <PostcardImage src={d.front_image_url} alt={d.name} />
                      <div className="truncate px-2.5 py-2 text-xs font-medium text-zinc-800">
                        {d.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* list */}
          <section>
            <SectionTitle n={3} title="Choose a contact list" />
            {!loaded ? (
              <div className="text-sm text-zinc-400">Loading…</div>
            ) : lists.length === 0 ? (
              <PromptCard
                text="You haven't uploaded any contact lists yet."
                href="/contacts"
                cta="Upload contacts"
              />
            ) : (
              <div className="space-y-2">
                {lists.map((l) => {
                  const active = l.id === listId;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setListId(l.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-800">
                        {l.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {l.contact_count.toLocaleString()} contacts
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* timing */}
          <section>
            <SectionTitle n={4} title="When should it send?" />
            <div className="space-y-2">
              <TimingOption
                active={timing === "now"}
                onClick={() => setTiming("now")}
                title="Send now"
                subtitle="Postcards go to print as soon as you confirm."
              />
              <TimingOption
                active={timing === "schedule"}
                onClick={() => setTiming("schedule")}
                title="Schedule for later"
                subtitle="Pick a future date and time."
              />
              {timing === "schedule" && (
                <div className="pl-1 pt-1">
                  <input
                    type="datetime-local"
                    min={minDatetime}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* summary */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-zinc-900">
              Order summary
            </h3>

            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Design">
                {selectedDesign ? selectedDesign.name : <Muted>None</Muted>}
              </SummaryRow>
              <SummaryRow label="List">
                {selectedList ? selectedList.name : <Muted>None</Muted>}
              </SummaryRow>

              {preview && selectedList && (
                <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>Deliverable (verified)</span>
                    <span className="font-medium text-zinc-900">
                      {preview.deliverable.toLocaleString()}
                    </span>
                  </div>
                  {preview.undeliverable > 0 && (
                    <div className="mt-1 flex justify-between text-zinc-400">
                      <span>Undeliverable (skipped)</span>
                      <span>{preview.undeliverable.toLocaleString()}</span>
                    </div>
                  )}
                  {preview.unverified > 0 && (
                    <div className="mt-1 flex justify-between text-amber-600">
                      <span>Unverified (skipped)</span>
                      <span>{preview.unverified.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-zinc-100 pt-3">
                <SummaryRow label="Credit cost">
                  <span className="text-base font-semibold text-zinc-900">
                    {cost.toLocaleString()} credits
                  </span>
                </SummaryRow>
                <div className="mt-1 flex justify-between text-xs text-zinc-500">
                  <span>Balance</span>
                  <span className="tabular-nums">
                    {balance.toLocaleString()}
                  </span>
                </div>
                <div className="mt-0.5 flex justify-between text-xs">
                  <span className="text-zinc-500">After send</span>
                  <span
                    className={`tabular-nums ${
                      remaining < 0 ? "text-red-600" : "text-zinc-700"
                    }`}
                  >
                    {timing === "schedule"
                      ? "—"
                      : remaining.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {timing === "schedule" && cost > 0 && (
              <p className="mt-3 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
                Credits are charged when the campaign sends, not now.
              </p>
            )}

            {timing === "now" && !affordable && cost > 0 && (
              <div className="mt-3 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                Not enough credits.{" "}
                <Link href="/billing" className="font-medium underline">
                  Buy more
                </Link>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <Button
              className="mt-4"
              fullWidth
              size="lg"
              loading={submitting}
              onClick={confirm}
            >
              {timing === "now"
                ? `Send ${cost > 0 ? cost.toLocaleString() + " " : ""}postcards`
                : "Schedule campaign"}
            </Button>
            <p className="mt-2 text-center text-[11px] text-zinc-400">
              Mock preview — no real mail is sent.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid size-6 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
        {n}
      </span>
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-right text-zinc-800">{children}</span>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-zinc-400">{children}</span>;
}

function TimingOption({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
        active
          ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
          : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      <span
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
          active ? "border-brand-600" : "border-zinc-300"
        }`}
      >
        {active && <span className="size-2 rounded-full bg-brand-600" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-zinc-800">
          {title}
        </span>
        <span className="block text-xs text-zinc-500">{subtitle}</span>
      </span>
    </button>
  );
}

function PromptCard({
  text,
  href,
  cta,
}: {
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm">
      <span className="text-zinc-600">{text}</span>
      <Link
        href={href}
        className="font-medium text-brand-600 hover:text-brand-700"
      >
        {cta} →
      </Link>
    </div>
  );
}

function SuccessView({
  campaign,
  onAnother,
}: {
  campaign: Campaign;
  onAnother: () => void;
}) {
  const sentNow = campaign.status === "sent";
  return (
    <div className="mx-auto w-full max-w-lg px-6 py-16">
      <Card className="p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-green-100 text-green-700">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          {sentNow ? "Campaign sent!" : "Campaign scheduled"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {sentNow ? (
            <>
              <span className="font-medium text-zinc-700">{campaign.name}</span>{" "}
              — {campaign.piece_count.toLocaleString()} postcards sent,{" "}
              {campaign.credit_cost.toLocaleString()} credits debited.
            </>
          ) : (
            <>
              <span className="font-medium text-zinc-700">{campaign.name}</span>{" "}
              — {campaign.piece_count.toLocaleString()} postcards scheduled for{" "}
              {campaign.scheduled_at
                ? new Date(campaign.scheduled_at).toLocaleString()
                : ""}
              . Credits are charged when it sends.
            </>
          )}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={onAnother}>
            New campaign
          </Button>
          <Link href="/dashboard">
            <Button>View dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

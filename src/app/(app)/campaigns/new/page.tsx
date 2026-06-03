"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { PostcardSide } from "@/components/postcard/postcard-side";
import { useData } from "@/lib/data/data-context";
import { InsufficientCreditsError } from "@/lib/data";
import { CREDITS_PER_PIECE, creditCost, type AudienceTier } from "@/lib/billing";
import type { Campaign, ContactList, Design } from "@/lib/types";
import type { CampaignPreview } from "@/lib/data/provider";

type Timing = "now" | "schedule";

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

  const [audience, setAudience] = useState<AudienceTier>("self_service");
  const [name, setName] = useState("");
  const [designId, setDesignId] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [timing, setTiming] = useState<Timing>("now");
  const [scheduledAt, setScheduledAt] = useState("");

  // managed ("build my list") fields
  const [targetArea, setTargetArea] = useState("");
  const [quantity, setQuantity] = useState("");

  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Campaign | null>(null);
  const [managedDone, setManagedDone] = useState<{
    quantity: number;
    cost: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([db.listDesigns(), db.listContactLists()]).then(([d, l]) => {
      setDesigns(d);
      setLists(l);
      setLoaded(true);
    });
  }, [db]);

  const loadPreview = useCallback(
    async (id: string) => setPreview(await db.previewCampaign(id)),
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

  const isManaged = audience === "managed";
  const rate = CREDITS_PER_PIECE[audience];
  const balance = wallet?.balance ?? 0;

  const selfPieces = preview?.deliverable ?? 0;
  const managedQty = Math.max(0, parseInt(quantity || "0", 10) || 0);
  const pieces = isManaged ? managedQty : selfPieces;
  const cost = creditCost(pieces, audience);
  const remaining = balance - cost;
  const affordable = isManaged || timing === "schedule" || balance >= cost;
  const minDatetime = toLocalInputValue(new Date(Date.now() + 5 * 60 * 1000));

  function validateSelf(): string | null {
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
    if (timing === "now" && !affordable) return "Not enough credits to send now.";
    return null;
  }

  function validateManaged(): string | null {
    if (!name.trim()) return "Give your campaign a name.";
    if (!designId) return "Pick a design.";
    if (!targetArea.trim()) return "Describe the area you want to target.";
    if (managedQty < 1) return "Enter how many postcards to send.";
    return null;
  }

  async function confirm() {
    if (isManaged) {
      const v = validateManaged();
      if (v) return setError(v);
      setError(null);
      setSubmitting(true);
      try {
        // Persisted as a pending order — we build the list and confirm later.
        await db.createManagedCampaign({
          name,
          design_id: designId!,
          target_area: targetArea,
          quantity: managedQty,
        });
        setManagedDone({ quantity: managedQty, cost });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not submit request.");
        setSubmitting(false);
      }
      return;
    }

    const v = validateSelf();
    if (v) return setError(v);
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
    setAudience("self_service");
    setName("");
    setDesignId(null);
    setListId(null);
    setTiming("now");
    setScheduledAt("");
    setTargetArea("");
    setQuantity("");
    setPreview(null);
    setError(null);
    setSubmitting(false);
    setCreated(null);
    setManagedDone(null);
  }

  if (created) return <SentView campaign={created} onAnother={resetForm} />;
  if (managedDone)
    return (
      <ManagedRequestView
        name={name}
        quantity={managedDone.quantity}
        cost={managedDone.cost}
        onAnother={resetForm}
      />
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="New campaign"
        description="Choose your audience, pick a design, and confirm the credit cost."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          {/* audience tier */}
          <section>
            <SectionTitle n={1} title="Who are we mailing?" />
            <div className="grid gap-3 sm:grid-cols-2">
              <AudienceCard
                active={audience === "self_service"}
                onClick={() => {
                  setAudience("self_service");
                  setError(null);
                }}
                title="Upload my list"
                subtitle="Self-service — you provide the mailing list."
                rate={CREDITS_PER_PIECE.self_service}
                badge="Best rate"
              />
              <AudienceCard
                active={audience === "managed"}
                onClick={() => {
                  setAudience("managed");
                  setError(null);
                }}
                title="Build my list for me"
                subtitle="We source addresses for your target area."
                rate={CREDITS_PER_PIECE.managed}
              />
            </div>
          </section>

          {/* name */}
          <section>
            <SectionTitle n={2} title="Campaign name" />
            <TextField
              label=""
              placeholder="Spring farming — 78704"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </section>

          {/* design (both tiers) */}
          <section>
            <SectionTitle n={3} title="Choose a design" />
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
                      <PostcardSide design={d} side="front" />
                      <div className="truncate px-2.5 py-2 text-xs font-medium text-zinc-800">
                        {d.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* self-service: list + timing */}
          {!isManaged && (
            <>
              <section>
                <SectionTitle n={4} title="Choose a contact list" />
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

              <section>
                <SectionTitle n={5} title="When should it send?" />
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
            </>
          )}

          {/* managed: target area + quantity */}
          {isManaged && (
            <>
              <section>
                <SectionTitle n={4} title="Target area" />
                <textarea
                  rows={3}
                  value={targetArea}
                  onChange={(e) => setTargetArea(e.target.value)}
                  placeholder="e.g. ZIP 78704, or a 1-mile radius around 123 Maple Ave — single-family homes, owner-occupied."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </section>
              <section>
                <SectionTitle n={5} title="How many postcards?" />
                <TextField
                  label=""
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  hint="Choose how many to send — we build a list of this size."
                />
              </section>
            </>
          )}
        </div>

        {/* summary */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-zinc-900">Order summary</h3>

            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Audience">
                {isManaged ? "We build your list" : "Your uploaded list"}
              </SummaryRow>
              <SummaryRow label="Design">
                {selectedDesign ? selectedDesign.name : <Muted>None</Muted>}
              </SummaryRow>

              {!isManaged && preview && selectedList && (
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
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Pieces</span>
                  <span className="tabular-nums">{pieces.toLocaleString()}</span>
                </div>
                <div className="mt-0.5 flex justify-between text-xs text-zinc-500">
                  <span>Rate</span>
                  <span className="tabular-nums">
                    {rate} credit{rate === 1 ? "" : "s"} / postcard
                  </span>
                </div>
                <SummaryRow label={isManaged ? "Estimated cost" : "Credit cost"}>
                  <span className="text-base font-semibold text-zinc-900">
                    {cost.toLocaleString()} credits
                  </span>
                </SummaryRow>
                <div className="mt-1 flex justify-between text-xs text-zinc-500">
                  <span>Balance</span>
                  <span className="tabular-nums">{balance.toLocaleString()}</span>
                </div>
                {!isManaged && (
                  <div className="mt-0.5 flex justify-between text-xs">
                    <span className="text-zinc-500">After send</span>
                    <span
                      className={`tabular-nums ${
                        remaining < 0 ? "text-red-600" : "text-zinc-700"
                      }`}
                    >
                      {timing === "schedule" ? "—" : remaining.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isManaged && (
              <p className="mt-3 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
                We&rsquo;ll build your list and confirm details. Credits are
                charged when it&rsquo;s built and sent — nothing now.
              </p>
            )}
            {!isManaged && timing === "schedule" && cost > 0 && (
              <p className="mt-3 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
                Credits are charged when the campaign sends, not now.
              </p>
            )}
            {!isManaged && timing === "now" && !affordable && cost > 0 && (
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
              {isManaged
                ? "Request list build"
                : timing === "now"
                ? `Send ${cost > 0 ? cost.toLocaleString() + " " : ""}postcards`
                : "Schedule campaign"}
            </Button>
            <p className="mt-2 text-center text-[11px] text-zinc-400">
              Stripe/Lob in test mode — no real charges or mail.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AudienceCard({
  active,
  onClick,
  title,
  subtitle,
  rate,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  rate: number;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border p-4 text-left transition-all ${
        active
          ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500"
          : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {badge}
        </span>
      )}
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
      <div className="mt-3 text-sm font-medium text-brand-700">
        {rate} credit{rate === 1 ? "" : "s"} / postcard
      </div>
    </button>
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
        <span className="block text-sm font-medium text-zinc-800">{title}</span>
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
      <Link href={href} className="font-medium text-brand-600 hover:text-brand-700">
        {cta} →
      </Link>
    </div>
  );
}

function SentView({
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
              <span className="font-medium text-zinc-700">{campaign.name}</span> —{" "}
              {campaign.piece_count.toLocaleString()} postcards sent,{" "}
              {campaign.credit_cost.toLocaleString()} credits debited.
            </>
          ) : (
            <>
              <span className="font-medium text-zinc-700">{campaign.name}</span> —{" "}
              {campaign.piece_count.toLocaleString()} postcards scheduled for{" "}
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

function ManagedRequestView({
  name,
  quantity,
  cost,
  onAnother,
}: {
  name: string;
  quantity: number;
  cost: number;
  onAnother: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-lg px-6 py-16">
      <Card className="p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-100 text-brand-700">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v12H5.2L4 17.2V4Z" />
            <path d="M8 9h8M8 12h5" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          List build requested
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          <span className="font-medium text-zinc-700">{name}</span> —
          we&rsquo;ll source {quantity.toLocaleString()} addresses for your
          target area and follow up to confirm. Estimated{" "}
          {cost.toLocaleString()} credits, charged when it&rsquo;s built and
          sent.
        </p>
        <p className="mt-3 text-xs text-zinc-400">
          Managed list-building isn&rsquo;t automated yet — this records your
          request.
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

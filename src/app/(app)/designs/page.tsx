"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { ImageDrop } from "@/components/ui/image-drop";
import { fitImageToExactDataUrl } from "@/lib/image";
import { buildTrackedUrl } from "@/lib/utm";
import {
  PostcardPreview,
  PostcardSide,
} from "@/components/postcard/postcard-side";
import { PostcardHtmlPreview } from "@/components/postcard/postcard-html-preview";
import { useData } from "@/lib/data/data-context";
import {
  ACCENT_PRESETS,
  DEFAULT_FONT,
  DEFAULT_LAYOUT,
  FONTS,
  emptyFields,
  findTemplate,
  designFromTemplate,
  isHtmlLayout,
} from "@/lib/templates";
import type {
  Design,
  DesignFields,
  PostcardSize,
  Profile,
  Template,
} from "@/lib/types";

/** Upload size options + the EXACT print resolution Lob needs for each
 * (landscape width × height, including Lob's 0.125in bleed). Uploaded art is
 * auto-resized to these exact dimensions, so any reasonable image works. */
const UPLOAD_SIZES: {
  value: PostcardSize;
  label: string;
  w: number;
  h: number;
}[] = [
  { value: "4x6", label: "4 × 6", w: 1875, h: 1275 },
  { value: "6x9", label: "6 × 9", w: 2775, h: 1875 },
  { value: "6x11", label: "6 × 11", w: 3375, h: 1875 },
];


/**
 * Which editor fields to show for a template — gated by the layout/kind that
 * actually renders them, so agents never fill in data that won't appear (and
 * never see two image slots that silently override each other).
 */
function fieldVis(template: Template) {
  // Premium HTML print layouts gate fields to exactly what they render — plus
  // headshot + logo, which brokerages require for compliance.
  const printLayout = template.defaults?.layout;
  if (printLayout && isHtmlLayout(template.defaults)) {
    const showProps =
      printLayout === "editorial" ||
      printLayout === "split" ||
      printLayout === "minimal" ||
      printLayout === "collage";
    return {
      photoMain: true,
      headshot: true,
      isIntro: false,
      collage: printLayout === "collage",
      logo: true,
      eventDateTime: false,
      price: showProps,
      stats:
        printLayout === "editorial" ||
        printLayout === "split" ||
        printLayout === "collage",
      propertyAddress: true,
      features: printLayout === "service",
    };
  }

  const layout = template.layout ?? DEFAULT_LAYOUT[template.kind];
  const isMarket = template.kind === "market_update";
  const isElegant = layout === "elegant_split";
  const isIntro = layout === "intro";
  const isShowcase = layout === "showcase";
  const isPhotoBanner = layout === "photo_banner";
  const isTriptych = layout === "triptych";
  const isSummary = layout === "summary";
  const isAerial = layout === "aerial";
  const isOpenHouse = layout === "open_house";
  const isBadge = layout === "badge";
  // Full property listing details (beds/baths/sqft) only render on showcases.
  const showcaseProps = isShowcase && !isMarket;
  const anyPhoto =
    isElegant || showcaseProps || isPhotoBanner || isTriptych || isSummary || isAerial || isOpenHouse || isBadge;
  return {
    photoMain: anyPhoto,
    // intro renders ONE portrait via the headshot slot; showcase has a headshot
    // in the header band; the rest manage their own imagery.
    headshot: isShowcase || isIntro,
    isIntro, // the intro portrait is a tall photo, not a square headshot
    collage: showcaseProps || isTriptych || isOpenHouse, // 3-photo rows
    logo: isShowcase || isIntro || isAerial,
    eventDateTime: template.kind === "open_house",
    price: showcaseProps || isPhotoBanner, // photo_banner shows a price chip
    stats: showcaseProps || isOpenHouse, // beds / baths / sqft
    propertyAddress: showcaseProps || isPhotoBanner || isTriptych || isOpenHouse,
    features: isTriptych || isSummary, // bullet/checklist list
  };
}

type Mode =
  | { type: "list" }
  | { type: "editor"; template: Template; design?: Design };

export default function DesignsPage() {
  const { db } = useData();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [mode, setMode] = useState<Mode>({ type: "list" });
  const [chooserOpen, setChooserOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [canvaOpen, setCanvaOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [preview, setPreview] = useState<Design | null>(null);
  const [resyncing, setResyncing] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [d, t] = await Promise.all([db.listDesigns(), db.listTemplates()]);
    setDesigns(d);
    setTemplates(t);
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Returned from the Canva OAuth redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const canva = params.get("canva");
    if (!canva) return;
    window.history.replaceState({}, "", "/designs");
    if (canva === "connected") {
      setFlash("Canva connected — pick a design to import.");
      setCanvaOpen(true);
    } else if (canva === "error") {
      setFlash("Couldn't connect to Canva. Please try again.");
    }
  }, []);

  // Open the Canva picker if connected, else start the OAuth connect flow.
  async function openCanva() {
    setChooserOpen(false);
    try {
      const res = await fetch("/api/canva/status");
      const json = await res.json();
      if (json.connected) setCanvaOpen(true);
      else window.location.href = "/api/canva/connect";
    } catch {
      window.location.href = "/api/canva/connect";
    }
  }

  async function handleDelete(design: Design) {
    if (!window.confirm(`Delete "${design.name}"?`)) return;
    await db.deleteDesign(design.id);
    await reload();
  }

  async function resyncCanva(design: Design) {
    setResyncing(design.id);
    try {
      const res = await fetch("/api/canva/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: design.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "resync_failed");
      await reload();
      setFlash(`Pulled the latest of "${design.name}" from Canva.`);
    } catch (e) {
      setFlash(
        e instanceof Error ? `Re-sync failed: ${e.message}` : "Re-sync failed."
      );
    } finally {
      setResyncing(null);
    }
  }

  if (mode.type === "editor") {
    return (
      <PersonalizeEditor
        template={mode.template}
        design={mode.design}
        onCancel={() => setMode({ type: "list" })}
        onSaved={async () => {
          setMode({ type: "list" });
          await reload();
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Designs"
        description="Personalize a template with your photos and property details, or upload your own art. You'll pick a design when creating a campaign."
        action={<Button onClick={() => setChooserOpen(true)}>New design</Button>}
      />

      {flash && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {flash}
        </div>
      )}

      {!loaded ? (
        <div className="mt-10 text-sm text-zinc-400">Loading…</div>
      ) : designs.length === 0 ? (
        <EmptyState onCreate={() => setChooserOpen(true)} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              d={d}
              templates={templates}
              resyncing={resyncing}
              onEditTemplate={(tpl) =>
                setMode({ type: "editor", template: tpl, design: d })
              }
              onPreview={() => setPreview(d)}
              onResync={() => resyncCanva(d)}
              onDelete={() => handleDelete(d)}
            />
          ))}
        </div>
      )}

      {/* New design chooser */}
      <Modal
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        title="New design"
        size="lg"
      >
        <p className="text-sm text-zinc-500">
          Start from a template and personalize it, or upload your own front and
          back.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              {isHtmlLayout(t.defaults) ? (
                <PostcardHtmlPreview design={designFromTemplate(t)} side="front" />
              ) : (
                <PostcardPreview
                  kind={t.kind}
                  theme={t.theme}
                  accent={t.accent}
                  layout={t.layout}
                  fields={t.defaults}
                  side="front"
                  profile={null}
                />
              )}
              <div className="px-3 py-3">
                <div className="text-sm font-medium text-zinc-900">
                  {t.name}
                </div>
                <Button
                  className="mt-2"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setChooserOpen(false);
                    setMode({ type: "editor", template: t });
                  }}
                >
                  Personalize
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3">
          <span className="text-sm text-zinc-600">
            Already have finished artwork?
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={openCanva}>
              Import from Canva
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setChooserOpen(false);
                setUploadOpen(true);
              }}
            >
              Upload your own
            </Button>
          </div>
        </div>
      </Modal>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCreated={async () => {
          setUploadOpen(false);
          await reload();
        }}
      />

      <CanvaImportModal
        open={canvaOpen}
        onClose={() => setCanvaOpen(false)}
        onImported={async () => {
          setCanvaOpen(false);
          await reload();
        }}
      />

      <PreviewModal design={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

interface CanvaDesignItem {
  id: string;
  title: string;
  thumbnail: string | null;
  editUrl: string | null;
}

function CanvaImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void | Promise<void>;
}) {
  const [designs, setDesigns] = useState<CanvaDesignItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDesigns(null);
    setError(null);
    fetch("/api/canva/designs")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) {
          setError(
            j.error === "not_connected"
              ? "Not connected to Canva."
              : "Couldn't load your Canva designs."
          );
          setDesigns([]);
          return;
        }
        setDesigns(j.designs ?? []);
      })
      .catch(() => {
        setError("Couldn't load your Canva designs.");
        setDesigns([]);
      });
  }, [open]);

  async function importDesign(d: CanvaDesignItem) {
    setImporting(d.id);
    setError(null);
    try {
      const r = await fetch("/api/canva/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId: d.id, title: d.title, editUrl: d.editUrl }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Import failed");
      await onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setImporting(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import from Canva" size="lg">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {!designs ? (
        <div className="py-8 text-sm text-zinc-400">
          Loading your Canva designs…
        </div>
      ) : designs.length === 0 ? (
        <div className="py-8 text-sm text-zinc-500">
          No Canva designs found in your account.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {designs.map((d) => (
            <Card key={d.id} className="overflow-hidden">
              {d.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={d.thumbnail}
                  alt={d.title}
                  className="aspect-[3/2] w-full bg-zinc-50 object-cover"
                />
              ) : (
                <div className="aspect-[3/2] w-full bg-zinc-100" />
              )}
              <div className="px-3 py-3">
                <div className="truncate text-sm font-medium text-zinc-900">
                  {d.title}
                </div>
                <Button
                  className="mt-2"
                  size="sm"
                  fullWidth
                  loading={importing === d.id}
                  onClick={() => importDesign(d)}
                >
                  Import
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-zinc-400">
        Tip: design a 2-page postcard (front + back) in Canva — page 1 becomes
        the front, page 2 the back.
      </p>
    </Modal>
  );
}

function SourceBadge({ source }: { source: Design["source"] }) {
  const isTemplate = source === "template";
  return (
    <span
      className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
        isTemplate ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {isTemplate ? "Personalized template" : "Uploaded"}
    </span>
  );
}

function DesignCard({
  d,
  templates,
  resyncing,
  onEditTemplate,
  onPreview,
  onResync,
  onDelete,
}: {
  d: Design;
  templates: Template[];
  resyncing: string | null;
  onEditTemplate: (tpl: Template) => void;
  onPreview: () => void;
  onResync: () => void;
  onDelete: () => void;
}) {
  const { session } = useData();
  const [side, setSide] = useState<"front" | "back">("front");
  const hasTwoSides = Boolean(d.back_image_url || d.source === "template");
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <button
          onClick={onPreview}
          className="block w-full"
          title="Preview front & back"
        >
          {isHtmlLayout(d.fields) ? (
            <PostcardHtmlPreview
              design={d}
              profile={session?.profile ?? null}
              side={side}
            />
          ) : (
            <PostcardSide design={d} side={side} />
          )}
        </button>
        {hasTwoSides && (
          <div className="absolute right-2 top-2 flex gap-0.5 rounded-md bg-white/85 p-0.5 text-[10px] font-medium shadow-sm backdrop-blur">
            {(["front", "back"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`rounded px-1.5 py-0.5 capitalize transition-colors ${
                  side === s
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-900">
            {d.name}
          </div>
          <SourceBadge source={d.source} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {d.source === "template" && d.template_id && (
            <button
              onClick={() => {
                // Look up across ALL templates (incl. inactive) so designs made
                // from a now-inactive template are still editable.
                const tpl =
                  templates.find((t) => t.id === d.template_id) ??
                  findTemplate(d.template_id!);
                if (tpl) onEditTemplate(tpl);
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              Edit
            </button>
          )}
          {d.external_edit_url && (
            <>
              <a
                href={d.external_edit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
              >
                Edit in Canva
              </a>
              <button
                onClick={onResync}
                disabled={resyncing === d.id}
                title="Pull the latest version from Canva"
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-60"
              >
                {resyncing === d.id ? "Syncing…" : "Re-sync"}
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete design"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="mt-6 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">
        No designs yet
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        Personalize a template with your photos and listing details, or upload
        your own postcard art.
      </p>
      <Button className="mt-5" onClick={onCreate}>
        Create your first design
      </Button>
    </Card>
  );
}

function PreviewModal({
  design,
  onClose,
}: {
  design: Design | null;
  onClose: () => void;
}) {
  const { session } = useData();
  return (
    <Modal
      open={Boolean(design)}
      onClose={onClose}
      title={design?.name ?? ""}
      size="lg"
    >
      {design && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["front", "back"] as const).map((side) => (
            <div key={side}>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                {side}
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                {isHtmlLayout(design.fields) ? (
                  <PostcardHtmlPreview
                    design={design}
                    profile={session?.profile ?? null}
                    side={side}
                  />
                ) : (
                  <PostcardSide design={design} side={side} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ---- personalize editor --------------------------------------------------

function prefillAgent(fields: DesignFields, profile: Profile | null): DesignFields {
  return {
    ...fields,
    agent_name:
      fields.agent_name || profile?.return_name || profile?.full_name || "",
    agent_email: fields.agent_email || profile?.email || "",
  };
}

function PersonalizeEditor({
  template,
  design,
  onCancel,
  onSaved,
}: {
  template: Template;
  design?: Design;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { db, session } = useData();
  const profile = session?.profile ?? null;
  const vis = fieldVis(template);
  const photoLabel = vis.collage
    ? "Property photo 1"
    : (template.layout ?? DEFAULT_LAYOUT[template.kind]) === "elegant_split"
      ? "Home photo"
      : "Photo";

  const [name, setName] = useState(design?.name ?? template.name);
  const [fields, setFields] = useState<DesignFields>(
    design?.fields ?? prefillAgent({ ...template.defaults }, profile)
  );
  const [side, setSide] = useState<"front" | "back">("front");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof DesignFields>(key: K, value: DesignFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!name.trim()) {
      setError("Give your design a name.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (design) {
        await db.updateDesign(design.id, { name, fields });
      } else {
        await db.createTemplateDesign({
          name,
          template_id: template.id,
          fields,
        });
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save design.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <button
        onClick={onCancel}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        ← All designs
      </button>
      <PageHeader
        title={design ? "Edit design" : `Personalize: ${template.name}`}
        description="Add your photos and details. The preview updates as you type."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {design ? "Save changes" : "Save design"}
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* form */}
        <div className="space-y-5">
          <TextField
            label="Design name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="Just for you — not printed."
          />

          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Style
            </legend>

            <div className="text-sm font-medium text-zinc-700">Accent color</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {[
                template.accent,
                ...ACCENT_PRESETS.filter((c) => c !== template.accent),
              ].map((col) => {
                const active =
                  (fields.accent || template.accent).toLowerCase() ===
                  col.toLowerCase();
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => set("accent", col)}
                    aria-label={`Use ${col}`}
                    className={`size-7 rounded-full transition ${
                      active
                        ? "ring-2 ring-zinc-900 ring-offset-2"
                        : "ring-1 ring-inset ring-black/10 hover:scale-110"
                    }`}
                    style={{ background: col }}
                  />
                );
              })}
              <label
                className="grid size-7 cursor-pointer place-items-center rounded-full ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50"
                title="Custom color"
              >
                <span className="text-sm text-zinc-500">+</span>
                <input
                  type="color"
                  value={fields.accent || template.accent}
                  onChange={(e) => set("accent", e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="mt-4 text-sm font-medium text-zinc-700">Font</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(FONTS).map(([key, opt]) => {
                const active = (fields.font || DEFAULT_FONT) === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("font", key)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      active
                        ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                        : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {(vis.photoMain || vis.headshot) && (
            <div
              className={`grid gap-4 ${
                vis.photoMain && vis.headshot ? "sm:grid-cols-[1fr_8rem]" : ""
              }`}
            >
              {vis.photoMain && (
                <ImageDrop
                  label={photoLabel}
                  value={fields.property_photo_url}
                  onChange={(v) => set("property_photo_url", v)}
                  maxDim={1400}
                />
              )}
              {vis.headshot && (
                <ImageDrop
                  label={vis.isIntro ? "Your photo" : "Your headshot"}
                  value={fields.headshot_url}
                  onChange={(v) => set("headshot_url", v)}
                  maxDim={vis.isIntro ? 1200 : 500}
                  aspect={vis.isIntro ? "aspect-[3/4]" : "aspect-square"}
                  hint={vis.isIntro ? "Portrait" : "Square"}
                />
              )}
            </div>
          )}

          {vis.collage && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageDrop
                label="Property photo 2 (optional)"
                value={fields.property_photo_url_2}
                onChange={(v) => set("property_photo_url_2", v)}
                maxDim={1200}
              />
              <ImageDrop
                label="Property photo 3 (optional)"
                value={fields.property_photo_url_3}
                onChange={(v) => set("property_photo_url_3", v)}
                maxDim={1200}
              />
            </div>
          )}

          {vis.logo && (
            <ImageDrop
              label="Brokerage logo (optional)"
              value={fields.logo_url}
              onChange={(v) => set("logo_url", v)}
              maxDim={600}
              aspect="aspect-[3/1]"
              hint="Wide logo, transparent PNG works best"
            />
          )}

          <TextField
            label="Headline"
            value={fields.headline}
            onChange={(e) => set("headline", e.target.value)}
          />
          <TextField
            label="Subheading"
            value={fields.subhead}
            onChange={(e) => set("subhead", e.target.value)}
          />

          {vis.eventDateTime && (
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Event date"
                placeholder="Saturday, June 14"
                value={fields.event_date}
                onChange={(e) => set("event_date", e.target.value)}
              />
              <TextField
                label="Event time"
                placeholder="1:00 – 4:00 PM"
                value={fields.event_time}
                onChange={(e) => set("event_time", e.target.value)}
              />
            </div>
          )}

          {(vis.price || vis.stats) && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {vis.price && (
                <TextField
                  label="Price"
                  placeholder="$749,000"
                  value={fields.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              )}
              {vis.stats && (
                <>
                  <TextField
                    label="Beds"
                    value={fields.beds}
                    onChange={(e) => set("beds", e.target.value)}
                  />
                  <TextField
                    label="Baths"
                    value={fields.baths}
                    onChange={(e) => set("baths", e.target.value)}
                  />
                  <TextField
                    label="Sq ft"
                    value={fields.sqft}
                    onChange={(e) => set("sqft", e.target.value)}
                  />
                </>
              )}
            </div>
          )}

          {vis.propertyAddress && (
            <TextField
              label="Property address"
              value={fields.property_address}
              onChange={(e) => set("property_address", e.target.value)}
            />
          )}

          {vis.features && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Features list
              </label>
              <textarea
                rows={6}
                value={fields.features}
                onChange={(e) => set("features", e.target.value)}
                placeholder={"2,100 square feet\nlisted at $524,000\n2 bedroom / 2 bath"}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <p className="mt-1 text-xs text-zinc-400">
                One per line. Shown as a checklist on the card.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Back message
            </label>
            <textarea
              rows={4}
              value={fields.body}
              onChange={(e) => set("body", e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <TextField
            label="Call to action (near the QR)"
            placeholder="Scan for the full listing"
            value={fields.cta}
            onChange={(e) => set("cta", e.target.value)}
          />

          <TextField
            label="QR code links to"
            placeholder="https://your-site.com/listing"
            value={fields.qr_url}
            onChange={(e) => set("qr_url", e.target.value)}
            hint="Where the scannable QR code sends people."
          />

          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Testimonial (optional, shows on back)
            </legend>
            <div className="space-y-3">
              <textarea
                rows={2}
                value={fields.testimonial}
                onChange={(e) => set("testimonial", e.target.value)}
                placeholder="Great agent — sold our house in under a month!"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <TextField
                label="Attribution"
                placeholder="John, Client"
                value={fields.testimonial_author}
                onChange={(e) => set("testimonial_author", e.target.value)}
              />
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Your contact info
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Name"
                value={fields.agent_name}
                onChange={(e) => set("agent_name", e.target.value)}
              />
              <TextField
                label="Phone"
                value={fields.agent_phone}
                onChange={(e) => set("agent_phone", e.target.value)}
              />
              <TextField
                label="Email"
                value={fields.agent_email}
                onChange={(e) => set("agent_email", e.target.value)}
              />
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Return address (FROM)
            </legend>
            <p className="mb-3 text-xs text-zinc-400">
              Leave blank to use your profile&apos;s return address.
            </p>
            <div className="space-y-3">
              <TextField
                label="Name"
                placeholder={profile?.return_name ?? "Your name"}
                value={fields.return_name}
                onChange={(e) => set("return_name", e.target.value)}
              />
              <TextField
                label="Company / brokerage"
                placeholder={profile?.company_name ?? "Your brokerage"}
                value={fields.return_company}
                onChange={(e) => set("return_company", e.target.value)}
              />
              <TextField
                label="Street address"
                placeholder={profile?.return_line1 ?? "123 Main St"}
                value={fields.return_line1}
                onChange={(e) => set("return_line1", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <TextField
                  label="City"
                  placeholder={profile?.return_city ?? "City"}
                  value={fields.return_city}
                  onChange={(e) => set("return_city", e.target.value)}
                />
                <TextField
                  label="State"
                  placeholder={profile?.return_state ?? "ST"}
                  value={fields.return_state}
                  onChange={(e) => set("return_state", e.target.value)}
                />
                <TextField
                  label="ZIP"
                  placeholder={profile?.return_zip ?? "00000"}
                  value={fields.return_zip}
                  onChange={(e) => set("return_zip", e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Compliance logos
            </legend>
            <p className="mb-3 text-xs text-zinc-400">
              The Equal Housing Opportunity logo always appears on the back.
            </p>
            <label className="flex items-center gap-2.5 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={fields.nar_member === "yes"}
                onChange={(e) => set("nar_member", e.target.checked ? "yes" : "")}
                className="size-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              />
              I&apos;m a NAR member — show the REALTOR<sup>®</sup> logo
            </label>
          </fieldset>
        </div>

        {/* live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Live preview
            </span>
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 text-xs font-medium">
              {(["front", "back"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`rounded-md px-2.5 py-1 capitalize ${
                    side === s
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
            {isHtmlLayout(fields) ? (
              <PostcardHtmlPreview
                design={
                  {
                    id: template.id,
                    profile_id: "preview",
                    name: template.name,
                    source: "template",
                    front_image_url: null,
                    back_image_url: null,
                    template_id: template.id,
                    template_kind: template.kind,
                    fields,
                    created_at: "",
                  } as Design
                }
                profile={profile}
                side={side}
              />
            ) : (
              <PostcardPreview
                kind={template.kind}
                theme={template.theme}
                accent={fields.accent || template.accent}
                font={fields.font || DEFAULT_FONT}
                layout={template.layout}
                fields={fields}
                side={side}
                profile={profile}
              />
            )}
          </div>
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <p className="mt-2 text-xs text-zinc-400">
            Return address on the back is pulled from your profile.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- upload modal (unchanged behavior, now downscales) -------------------

function UploadModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const { db } = useData();
  const [name, setName] = useState("");
  const [size, setSize] = useState<PostcardSize>("4x6");
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [ret, setRet] = useState({
    return_name: "",
    return_company: "",
    return_line1: "",
    return_city: "",
    return_state: "",
    return_zip: "",
  });
  const [qrBase, setQrBase] = useState("");
  const [utm, setUtm] = useState({
    source: "postcard",
    medium: "direct_mail",
    campaign: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const spec = UPLOAD_SIZES.find((s) => s.value === size) ?? UPLOAD_SIZES[0];
  const specPx = `${spec.w} × ${spec.h}px`;
  const setRetField = (k: keyof typeof ret) => (v: string) =>
    setRet((r) => ({ ...r, [k]: v }));
  const setUtmField = (k: keyof typeof utm) => (v: string) =>
    setUtm((u) => ({ ...u, [k]: v }));
  const qrPreview = buildTrackedUrl(qrBase, utm);

  function resetAndClose() {
    setName("");
    setSize("4x6");
    setFront(null);
    setBack(null);
    setRet({
      return_name: "",
      return_company: "",
      return_line1: "",
      return_city: "",
      return_state: "",
      return_zip: "",
    });
    setQrBase("");
    setUtm({ source: "postcard", medium: "direct_mail", campaign: "" });
    setError(null);
    setSaving(false);
    onClose();
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Give your design a name.");
    if (!front || !back) return setError("Upload both a front and a back image.");
    setSaving(true);
    try {
      // Auto-fit both sides to Lob's exact required dimensions for this size.
      const [frontFit, backFit] = await Promise.all([
        fitImageToExactDataUrl(front, spec.w, spec.h),
        fitImageToExactDataUrl(back, spec.w, spec.h),
      ]);
      await db.createDesignFromUpload({
        name,
        front_image_url: frontFit,
        back_image_url: backFit,
        size,
        qr_url: qrPreview,
        return_fields: ret,
      });
      resetAndClose();
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save design.");
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Upload your own" size="lg">
      <div className="space-y-4">
        <TextField
          label="Design name"
          placeholder="Spring farming postcard"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <div className="mb-1.5 text-sm font-medium text-zinc-700">
            Postcard size
          </div>
          <div className="flex gap-2">
            {UPLOAD_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSize(s.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                  size === s.value
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="font-medium text-zinc-800">{s.label}</div>
                <div className="text-[11px] text-zinc-500">{`${s.w} × ${s.h}px`}</div>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            We fit your whole design to {specPx} (landscape) for print — nothing
            is cropped. Keep key text ~0.25in from the edges (print trim).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageDrop
            label="Front"
            value={front}
            onChange={setFront}
            maxDim={4000}
            hint="Landscape, high-res PNG/JPG"
          />
          <ImageDrop
            label="Back"
            value={back}
            onChange={setBack}
            maxDim={4000}
            hint="Landscape, high-res PNG/JPG"
          />
        </div>

        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="text-sm font-medium text-zinc-700">
            QR code link
          </div>
          <p className="mt-0.5 mb-2.5 text-xs text-zinc-500">
            Where the postcard&rsquo;s QR code sends people when scanned —
            usually the client&rsquo;s website or a specific listing. Leave blank
            to point at Radiate.
          </p>
          <TextField
            label="Destination URL"
            placeholder="https://janerealty.com/123-main-st"
            value={qrBase}
            onChange={(e) => setQrBase(e.target.value)}
          />

          <div className="mt-3 rounded-md bg-zinc-50 p-2.5">
            <div className="text-xs font-medium text-zinc-700">
              Campaign tracking tags (UTMs)
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
              UTMs are little labels added to the link so the client&rsquo;s
              website analytics (e.g. Google Analytics) can see that a visitor
              came from this postcard — and how many did.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <TextField
                label="Source"
                placeholder="postcard"
                value={utm.source}
                onChange={(e) => setUtmField("source")(e.target.value)}
              />
              <TextField
                label="Medium"
                placeholder="direct_mail"
                value={utm.medium}
                onChange={(e) => setUtmField("medium")(e.target.value)}
              />
              <TextField
                label="Campaign"
                placeholder="spring-farm"
                value={utm.campaign}
                onChange={(e) => setUtmField("campaign")(e.target.value)}
              />
            </div>
            {qrPreview && (
              <p className="mt-2 break-all text-[11px] text-zinc-500">
                <span className="font-medium text-zinc-600">QR opens:</span>{" "}
                {qrPreview}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="text-sm font-medium text-zinc-700">
            Return (“From”) address
          </div>
          <p className="mt-0.5 mb-2.5 text-xs text-zinc-500">
            Printed as the sender on every card for this design. Set your
            client&rsquo;s address here. Leave blank to use your profile&rsquo;s
            return address.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <TextField
              label="Name"
              placeholder="Jane Agent"
              value={ret.return_name}
              onChange={(e) => setRetField("return_name")(e.target.value)}
            />
            <TextField
              label="Company (optional)"
              placeholder="Jane Realty"
              value={ret.return_company}
              onChange={(e) => setRetField("return_company")(e.target.value)}
            />
            <div className="sm:col-span-2">
              <TextField
                label="Street address"
                placeholder="123 Main St"
                value={ret.return_line1}
                onChange={(e) => setRetField("return_line1")(e.target.value)}
              />
            </div>
            <TextField
              label="City"
              placeholder="Overland Park"
              value={ret.return_city}
              onChange={(e) => setRetField("return_city")(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <TextField
                label="State"
                placeholder="KS"
                value={ret.return_state}
                onChange={(e) => setRetField("return_state")(e.target.value)}
              />
              <TextField
                label="ZIP"
                placeholder="66061"
                value={ret.return_zip}
                onChange={(e) => setRetField("return_zip")(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save design
          </Button>
        </div>
      </div>
    </Modal>
  );
}

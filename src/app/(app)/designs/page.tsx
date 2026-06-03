"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { ImageDrop } from "@/components/ui/image-drop";
import {
  PostcardPreview,
  PostcardSide,
} from "@/components/postcard/postcard-side";
import { useData } from "@/lib/data/data-context";
import { emptyFields } from "@/lib/templates";
import type { Design, DesignFields, Profile, Template } from "@/lib/types";

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
  const [preview, setPreview] = useState<Design | null>(null);

  const reload = useCallback(async () => {
    const [d, t] = await Promise.all([db.listDesigns(), db.listTemplates()]);
    setDesigns(d);
    setTemplates(t);
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleDelete(design: Design) {
    if (!window.confirm(`Delete "${design.name}"?`)) return;
    await db.deleteDesign(design.id);
    await reload();
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

      {!loaded ? (
        <div className="mt-10 text-sm text-zinc-400">Loading…</div>
      ) : designs.length === 0 ? (
        <EmptyState onCreate={() => setChooserOpen(true)} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => (
            <Card key={d.id} className="overflow-hidden">
              <button
                onClick={() => setPreview(d)}
                className="block w-full"
                title="Preview front & back"
              >
                <PostcardSide design={d} side="front" />
              </button>
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
                        const tpl = templates.find(
                          (t) => t.id === d.template_id
                        );
                        if (tpl)
                          setMode({ type: "editor", template: tpl, design: d });
                      }}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(d)}
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
              <PostcardPreview
                kind={t.kind}
                fields={t.defaults}
                side="front"
                profile={null}
              />
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
        <div className="mt-5 flex items-center justify-between rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3">
          <span className="text-sm text-zinc-600">
            Already have finished artwork?
          </span>
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
      </Modal>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCreated={async () => {
          setUploadOpen(false);
          await reload();
        }}
      />

      <PreviewModal design={preview} onClose={() => setPreview(null)} />
    </div>
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
                <PostcardSide design={design} side={side} />
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
  const isOpenHouse = template.kind === "open_house";

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

          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <ImageDrop
              label="Property photo"
              value={fields.property_photo_url}
              onChange={(v) => set("property_photo_url", v)}
              maxDim={1400}
            />
            <ImageDrop
              label="Your headshot"
              value={fields.headshot_url}
              onChange={(v) => set("headshot_url", v)}
              maxDim={500}
              aspect="aspect-square"
              hint="Square"
            />
          </div>

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

          {isOpenHouse && (
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

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <TextField
              label="Price"
              placeholder="$749,000"
              value={fields.price}
              onChange={(e) => set("price", e.target.value)}
            />
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
          </div>

          <TextField
            label="Property address"
            value={fields.property_address}
            onChange={(e) => set("property_address", e.target.value)}
          />

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
            <PostcardPreview
              kind={template.kind}
              fields={fields}
              side={side}
              profile={profile}
            />
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
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetAndClose() {
    setName("");
    setFront(null);
    setBack(null);
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
      await db.createDesignFromUpload({
        name,
        front_image_url: front,
        back_image_url: back,
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
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageDrop label="Front" value={front} onChange={setFront} maxDim={1800} />
          <ImageDrop label="Back" value={back} onChange={setBack} maxDim={1800} />
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { ImageDrop } from "@/components/ui/image-drop";
import { PostcardImage } from "@/components/ui/postcard-image";
import { useData } from "@/lib/data/data-context";
import type { Design, Template } from "@/lib/types";

type CreateTab = "upload" | "template";

export default function DesignsPage() {
  const { db } = useData();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
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

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Designs"
        description="Upload your own postcard art, or start from a template. You'll pick a design when creating a campaign."
        action={<Button onClick={() => setCreateOpen(true)}>New design</Button>}
      />

      {!loaded ? (
        <div className="mt-10 text-sm text-zinc-400">Loading…</div>
      ) : designs.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => (
            <Card key={d.id} className="overflow-hidden">
              <button
                onClick={() => setPreview(d)}
                className="block w-full"
                title="Preview front & back"
              >
                <PostcardImage src={d.front_image_url} alt={d.name} />
              </button>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {d.name}
                  </div>
                  <SourceBadge source={d.source} />
                </div>
                <button
                  onClick={() => handleDelete(d)}
                  className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete design"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateDesignModal
        open={createOpen}
        templates={templates}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
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
        isTemplate
          ? "bg-brand-50 text-brand-700"
          : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {isTemplate ? "From template" : "Uploaded"}
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
        Upload your own postcard front and back, or pick one of our templates to
        get started.
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
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Front
            </div>
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <PostcardImage src={design.front_image_url} alt="Front" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Back
            </div>
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <PostcardImage src={design.back_image_url} alt="Back" />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CreateDesignModal({
  open,
  templates,
  onClose,
  onCreated,
}: {
  open: boolean;
  templates: Template[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const { db } = useData();
  const [tab, setTab] = useState<CreateTab>("upload");

  // upload state
  const [name, setName] = useState("");
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  function resetAndClose() {
    setTab("upload");
    setName("");
    setFront(null);
    setBack(null);
    setError(null);
    setSaving(null);
    onClose();
  }

  async function saveUpload() {
    setError(null);
    if (!name.trim()) return setError("Give your design a name.");
    if (!front || !back)
      return setError("Upload both a front and a back image.");
    setSaving("upload");
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
      setSaving(null);
    }
  }

  async function useTemplate(t: Template) {
    setSaving(t.id);
    try {
      await db.createDesignFromTemplate(t.id);
      resetAndClose();
      await onCreated();
    } catch {
      setSaving(null);
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="New design" size="lg">
      {/* tabs */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 text-sm font-medium">
        {(["upload", "template"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={`h-9 rounded-md transition-colors ${
              tab === t
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t === "upload" ? "Upload your own" : "Use a template"}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <div className="space-y-4">
          <TextField
            label="Design name"
            placeholder="Spring farming postcard"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageDrop label="Front" value={front} onChange={setFront} />
            <ImageDrop label="Back" value={back} onChange={setBack} />
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
            <Button onClick={saveUpload} loading={saving === "upload"}>
              Save design
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <PostcardImage src={t.front_image_url} alt={t.name} />
              <div className="px-3 py-3">
                <div className="text-sm font-medium text-zinc-900">
                  {t.name}
                </div>
                <Button
                  className="mt-2"
                  size="sm"
                  fullWidth
                  loading={saving === t.id}
                  onClick={() => useTemplate(t)}
                >
                  Use template
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}

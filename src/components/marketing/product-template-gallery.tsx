"use client";

import { useState } from "react";
import { PostcardHtmlPreview } from "@/components/postcard/postcard-html-preview";
import {
  designFromTemplate,
  categoryOf,
  templateCategories,
} from "@/lib/templates";
import type { Template } from "@/lib/types";

export function ProductTemplateGallery({ templates }: { templates: Template[] }) {
  const [cat, setCat] = useState("All");
  const shown =
    cat === "All" ? templates : templates.filter((t) => categoryOf(t) === cat);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {["All", ...templateCategories(templates)].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              cat === c
                ? "bg-brand-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {shown.map((t) => (
          <div
            key={t.id}
            className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm"
          >
            <PostcardHtmlPreview design={designFromTemplate(t)} side="front" />
            <div className="px-4 py-3">
              <div className="text-sm font-semibold text-zinc-900">{t.name}</div>
              <div className="text-xs text-zinc-500">
                {categoryOf(t)} · Fully personalizable
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

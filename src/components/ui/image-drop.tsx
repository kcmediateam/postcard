"use client";

import { useId, useState } from "react";
import { fileToDownscaledDataUrl } from "@/lib/image";

const MAX_BYTES = 12 * 1024 * 1024; // 12MB pre-downscale

export function ImageDrop({
  label,
  value,
  onChange,
  maxDim = 1400,
  aspect = "aspect-[3/2]",
  hint = "PNG or JPG, up to 12MB",
}: {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  maxDim?: number;
  aspect?: string;
  hint?: string;
}) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large (max 12MB).");
      return;
    }
    setBusy(true);
    try {
      onChange(await fileToDownscaledDataUrl(file, maxDim));
    } catch {
      setError("Could not process that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {label && (
        <div className="mb-1.5 text-sm font-medium text-zinc-700">{label}</div>
      )}
      {value ? (
        <div className={`relative overflow-hidden rounded-lg border border-zinc-200 ${aspect}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} preview`}
            className="h-full w-full bg-zinc-50 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-white"
          >
            Replace
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex ${aspect} w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40`}
        >
          {busy ? (
            <span className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-brand-600" />
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M7 9l5-5 5 5" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              <span className="text-sm font-medium text-zinc-600">
                Click to upload
              </span>
              <span className="text-xs text-zinc-400">{hint}</span>
            </>
          )}
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useId, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export function ImageDrop({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-zinc-700">{label}</div>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-zinc-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} preview`}
            className="aspect-[3/2] w-full bg-zinc-50 object-contain"
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
          className="flex aspect-[3/2] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#71717a"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span className="text-sm font-medium text-zinc-600">
            Click to upload
          </span>
          <span className="text-xs text-zinc-400">PNG or JPG, 6×4, up to 5MB</span>
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

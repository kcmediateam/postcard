"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

export interface TextFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function TextField({
  label,
  hint,
  error,
  className = "",
  id,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-sm font-medium text-zinc-700"
      >
        {label}
      </label>
      <input
        id={fieldId}
        className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
          error
            ? "border-red-400 focus:border-red-500"
            : "border-zinc-300 focus:border-brand-500"
        }`}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

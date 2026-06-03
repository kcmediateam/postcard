"use client";

import type { SelectHTMLAttributes } from "react";
import { useId } from "react";

export interface SelectFieldProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | null;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({
  label,
  error,
  options,
  placeholder,
  className = "",
  id,
  ...rest
}: SelectFieldProps) {
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
      <select
        id={fieldId}
        className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
          error
            ? "border-red-400 focus:border-red-500"
            : "border-zinc-300 focus:border-brand-500"
        }`}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Radiate mark — an envelope with radiating ripples. Uses currentColor. */
export function RadiateMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* radiating ripples */}
      <circle cx="20" cy="20" r="17" strokeWidth="1.6" opacity="0.25" />
      <circle cx="20" cy="20" r="13" strokeWidth="1.6" opacity="0.5" />
      <circle cx="20" cy="20" r="9.2" strokeWidth="1.6" opacity="0.8" />
      {/* envelope */}
      <rect x="11" y="14.5" width="18" height="12" rx="2.2" strokeWidth="2" />
      <path
        d="M11.6 15.8 20 22l8.4-6.2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Radiate lockup. `default` = gradient tile + dark wordmark (light backgrounds).
 * `light` = white mark + white wordmark (for dark / gradient panels).
 */
export function Logo({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  const light = variant === "light";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {light ? (
        <RadiateMark className="size-8 text-white" />
      ) : (
        <span className="bg-radiate grid size-8 place-items-center rounded-[9px] shadow-sm">
          <RadiateMark className="size-5 text-white" />
        </span>
      )}
      <span
        className={`text-[19px] font-medium tracking-tight ${
          light ? "text-white" : "text-zinc-900"
        }`}
      >
        Radiate
      </span>
    </span>
  );
}

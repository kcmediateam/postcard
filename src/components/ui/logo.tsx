/** Radiate mark — the "burst": warm rays radiating from a center dot.
 *  Keeps its warm colors on every background (per brand guidelines). */
export function RadiateMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g stroke="#FF8A4C" strokeWidth="3" strokeLinecap="round">
        <line x1="20" y1="4" x2="20" y2="13" />
        <line x1="20" y1="27" x2="20" y2="36" />
        <line x1="4" y1="20" x2="13" y2="20" />
        <line x1="27" y1="20" x2="36" y2="20" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="25" y1="25" x2="31" y2="31" />
        <line x1="31" y1="9" x2="25" y2="15" />
        <line x1="15" y1="25" x2="9" y2="31" />
      </g>
      <circle cx="20" cy="20" r="4.5" fill="#FFB02E" />
    </svg>
  );
}

/**
 * Radiate lockup: the burst locked to the Bricolage wordmark.
 * `default` = ink wordmark (for light/paper backgrounds).
 * `light`   = white wordmark (for the indigo field / dark panels).
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
      <RadiateMark className="size-7" />
      <span
        className={`font-display text-[21px] font-extrabold tracking-tight ${
          light ? "text-white" : "text-ink"
        }`}
      >
        Radiate
      </span>
    </span>
  );
}

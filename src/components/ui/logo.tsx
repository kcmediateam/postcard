export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">
        {/* simple postcard glyph */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="6"
            width="18"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M13 10h5M13 13h5M7 10.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-zinc-900">
        Postcard
      </span>
    </span>
  );
}

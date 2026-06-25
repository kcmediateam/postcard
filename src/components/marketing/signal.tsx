/**
 * The Signal — Radiate's signature radiating-rings element.
 * A pin at the origin, warm rings spreading outward (with a few animated
 * "ripple" rings that continuously emanate), and small homes on the rings.
 * Ambient backdrop for the indigo field — always emanating from a corner.
 */
export function Signal({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="signal-rg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FFC23D" />
          <stop offset="0.5" stopColor="#FF8A4C" />
          <stop offset="1" stopColor="#7C74F2" />
        </linearGradient>
        <radialGradient id="signal-pin" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFC23D" />
          <stop offset="1" stopColor="#FF8A4C" />
        </radialGradient>
      </defs>

      {/* Static base rings — faint texture */}
      <g fill="none" stroke="url(#signal-rg)" strokeWidth="1.5">
        <circle cx="90" cy="320" r="90" opacity="0.5" />
        <circle cx="90" cy="320" r="170" opacity="0.38" />
        <circle cx="90" cy="320" r="260" opacity="0.28" />
        <circle cx="90" cy="320" r="360" opacity="0.2" />
        <circle cx="90" cy="320" r="470" opacity="0.12" />
      </g>

      {/* Animated ripple rings — emanate outward on a loop */}
      <g fill="none" stroke="url(#signal-rg)" strokeWidth="2">
        <circle className="signal-ripple" cx="90" cy="320" r="470" />
        <circle className="signal-ripple signal-ripple-2" cx="90" cy="320" r="470" />
        <circle className="signal-ripple signal-ripple-3" cx="90" cy="320" r="470" />
      </g>

      {/* Homes sitting on the rings */}
      <g fill="#FFC23D">
        <g transform="translate(300,200)">
          <path d="M0,-8 L9,0 L9,10 L-9,10 L-9,0 Z" opacity=".8" />
        </g>
        <g transform="translate(420,150)">
          <path d="M0,-6 L7,0 L7,8 L-7,8 L-7,0 Z" opacity=".55" />
        </g>
        <g transform="translate(380,290)">
          <path d="M0,-6 L7,0 L7,8 L-7,8 L-7,0 Z" opacity=".5" />
        </g>
      </g>

      {/* Pin at the origin */}
      <circle cx="90" cy="320" r="12" fill="url(#signal-pin)" />
      <circle
        className="signal-pin-pulse"
        cx="90"
        cy="320"
        r="22"
        fill="none"
        stroke="#FFC23D"
        strokeWidth="2"
        opacity=".5"
      />
    </svg>
  );
}

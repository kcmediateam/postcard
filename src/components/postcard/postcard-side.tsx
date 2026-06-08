"use client";

import { useId } from "react";
import type {
  Design,
  DesignFields,
  DesignTheme,
  PostcardLayout,
  Profile,
  TemplateKind,
} from "@/lib/types";
import {
  DEFAULT_FONT,
  DEFAULT_LAYOUT,
  FONTS,
  KIND_LABEL,
  resolveStyle,
} from "@/lib/templates";
import { useData } from "@/lib/data/data-context";
import { PostcardImage } from "@/components/ui/postcard-image";

/** CSS custom properties that pick the design's font pairing. */
function fontVars(fontKey: string): React.CSSProperties {
  const f = FONTS[fontKey] ?? FONTS[DEFAULT_FONT];
  return {
    ["--pc-display"]: f.display,
    ["--pc-body"]: f.body,
  } as React.CSSProperties;
}

interface Colors {
  bg: string;
  text: string;
  sub: string;
  muted: string;
  panel: string;
  line: string;
  badgeBg: string;
  badgeText: string;
  highlight: string;
  footerBg: string;
  footerText: string;
  // bold blocking
  headerBg: string;
  headerText: string;
  chipBg: string;
  chipText: string;
  priceBg: string;
  priceText: string;
}

function themeColors(theme: DesignTheme, accent: string): Colors {
  if (theme === "dark") {
    return {
      bg: "#111114",
      text: "#ffffff",
      sub: "rgba(255,255,255,0.82)",
      muted: "rgba(255,255,255,0.5)",
      panel: "rgba(255,255,255,0.07)",
      line: "rgba(255,255,255,0.16)",
      badgeBg: accent,
      badgeText: "#15181e",
      highlight: accent,
      footerBg: accent,
      footerText: "#15181e",
      headerBg: accent,
      headerText: "#15181e",
      chipBg: "#15181e",
      chipText: accent,
      priceBg: accent,
      priceText: "#15181e",
    };
  }
  if (theme === "bold") {
    return {
      bg: accent,
      text: "#ffffff",
      sub: "rgba(255,255,255,0.9)",
      muted: "rgba(255,255,255,0.7)",
      panel: "rgba(255,255,255,0.16)",
      line: "rgba(255,255,255,0.28)",
      badgeBg: "#ffffff",
      badgeText: accent,
      highlight: "#ffffff",
      footerBg: "rgba(0,0,0,0.20)",
      footerText: "#ffffff",
      headerBg: "rgba(0,0,0,0.18)",
      headerText: "#ffffff",
      chipBg: "#ffffff",
      chipText: accent,
      priceBg: "#ffffff",
      priceText: accent,
    };
  }
  return {
    bg: "#ffffff",
    text: "#15181e",
    sub: "#52525b",
    muted: "#a1a1aa",
    panel: "#f4f4f5",
    line: "#e4e4e7",
    badgeBg: accent,
    badgeText: "#ffffff",
    highlight: accent,
    footerBg: accent,
    footerText: "#ffffff",
    headerBg: accent,
    headerText: "#ffffff",
    chipBg: "#ffffff",
    chipText: accent,
    priceBg: accent,
    priceText: "#ffffff",
  };
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else cur = (cur + " " + w).trim();
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function statsLine(f: DesignFields): string {
  return [f.beds && `${f.beds} bd`, f.baths && `${f.baths} ba`, f.sqft && `${f.sqft} sqft`]
    .filter(Boolean)
    .join("   ·   ");
}

function Photo({
  url,
  x,
  y,
  w,
  h,
  c,
  uid,
}: {
  url: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  c: Colors;
  uid: string;
}) {
  const rx = 10;
  if (!url) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={rx} fill={c.panel} />
        <path
          d={`M${x + w / 2 - 14} ${y + h / 2 + 6} l14 -12 l14 12`}
          fill="none"
          stroke={c.muted}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x={x + w / 2 - 9} y={y + h / 2 + 2} width="18" height="12" fill={c.muted} opacity="0.5" />
      </g>
    );
  }
  return (
    <g>
      <clipPath id={`p-${uid}`}>
        <rect x={x} y={y} width={w} height={h} rx={rx} />
      </clipPath>
      <image href={url} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#p-${uid})`} />
    </g>
  );
}

function Headshot({
  url,
  cx,
  cy,
  r,
  c,
  uid,
}: {
  url: string | null;
  cx: number;
  cy: number;
  r: number;
  c: Colors;
  uid: string;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={c.panel} />
      {url && (
        <>
          <clipPath id={`h-${uid}`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <image href={url} x={cx - r} y={cy - r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#h-${uid})`} />
        </>
      )}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.badgeBg} strokeWidth="2.5" />
    </g>
  );
}

function Footer({
  f,
  c,
  uid,
}: {
  f: DesignFields;
  c: Colors;
  uid: string;
}) {
  return (
    <g>
      <rect x={0} y={352} width={600} height={48} fill={c.footerBg} />
      <text x={28} y={376} fill={c.footerText} fontSize="16" fontWeight="800">
        {f.agent_name || "Your name"}
      </text>
      <text x={28} y={392} fill={c.footerText} fontSize="12" opacity="0.88" fontWeight="500">
        {[f.agent_phone, f.agent_email].filter(Boolean).join("   ·   ")}
      </text>
      {f.logo_url ? (
        <>
          <clipPath id={`lg-${uid}`}>
            <rect x={496} y={361} width={80} height={32} />
          </clipPath>
          <image
            href={f.logo_url}
            x={496}
            y={361}
            width={80}
            height={32}
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#lg-${uid})`}
          />
        </>
      ) : (
        f.cta && (
          <text x={572} y={381} textAnchor="end" fill={c.footerText} fontSize="13" fontWeight="700">
            {f.cta} →
          </text>
        )
      )}
    </g>
  );
}

function FullBleedPhotos({
  photos,
  top,
  bottom,
  c,
  uid,
}: {
  photos: string[];
  top: number;
  bottom: number;
  c: Colors;
  uid: string;
}) {
  const cols = Math.min(3, photos.length || 1);
  const gap = cols > 1 ? 6 : 0;
  const h = bottom - top;
  const wEach = (600 - gap * (cols - 1)) / cols;
  return (
    <>
      {Array.from({ length: cols }).map((_, i) => {
        const x = i * (wEach + gap);
        const url = photos[i] ?? null;
        if (!url) {
          return (
            <g key={i}>
              <rect x={x} y={top} width={wEach} height={h} fill={c.panel} />
              <path
                d={`M${x + wEach / 2 - 18} ${top + h / 2 + 8} l18 -16 l18 16`}
                fill="none"
                stroke={c.muted}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={x + wEach / 2 + 14} cy={top + h / 2 - 14} r={5} fill={c.muted} opacity={0.6} />
            </g>
          );
        }
        return (
          <g key={i}>
            <clipPath id={`fb-${uid}-${i}`}>
              <rect x={x} y={top} width={wEach} height={h} />
            </clipPath>
            <image
              href={url}
              x={x}
              y={top}
              width={wEach}
              height={h}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#fb-${uid}-${i})`}
            />
          </g>
        );
      })}
    </>
  );
}

function ShowcaseFront({
  kind,
  f,
  c,
  uid,
}: {
  kind: TemplateKind;
  f: DesignFields;
  c: Colors;
  uid: string;
}) {
  const badge = KIND_LABEL[kind].toUpperCase();
  const hasHeadshot = Boolean(f.headshot_url);
  const isMarket = kind === "market_update";
  const isOpen = kind === "open_house";
  const headlineLines = wrapText(
    f.headline || KIND_LABEL[kind],
    hasHeadshot ? 13 : 18,
    2
  );
  const twoLine = headlineLines.length > 1;
  const bandH = twoLine ? 134 : 104;

  const photos = [f.property_photo_url, f.property_photo_url_2, f.property_photo_url_3].filter(Boolean) as string[];

  return (
    <>
      <rect width="600" height="400" fill={c.bg} />

      {/* ── header color block ── */}
      <rect x={0} y={0} width={600} height={bandH} fill={c.headerBg} />
      <rect x={28} y={22} width={badge.length * 9 + 28} height={28} rx={14} fill={c.chipBg} />
      <text x={42} y={41} fill={c.chipText} fontSize="13" fontWeight="800" letterSpacing="2">
        {badge}
      </text>
      <text
        x={28}
        fill={c.headerText}
        fontSize="40"
        fontWeight="800"
        className="pc-display"
        letterSpacing="-0.8"
      >
        {headlineLines.map((l, i) => (
          <tspan key={i} x={28} y={twoLine ? 80 + i * 42 : 88}>
            {l}
          </tspan>
        ))}
      </text>
      {hasHeadshot && (
        <Headshot url={f.headshot_url} cx={544} cy={bandH / 2 + 4} r={36} c={c} uid={`hs${uid}`} />
      )}

      {/* ── body: market copy OR full-bleed photos ── */}
      {isMarket ? (
        <text x={28} y={bandH + 38} fill={c.text} fontSize="17" fontWeight="500">
          {wrapText(f.body, 56, 4).map((l, i) => (
            <tspan key={i} x={28} dy={i === 0 ? 0 : 26}>
              {l}
            </tspan>
          ))}
        </text>
      ) : (
        <FullBleedPhotos photos={photos} top={bandH} bottom={296} c={c} uid={uid} />
      )}

      {/* ── chunky info block ── */}
      {isOpen ? (
        <g>
          <rect x={0} y={296} width={600} height={56} fill={c.priceBg} />
          <text x={28} y={324} fill={c.priceText} fontSize="22" fontWeight="800">
            {f.event_date || "This weekend"}
          </text>
          <text x={28} y={344} fill={c.priceText} fontSize="14" fontWeight="600" opacity="0.92">
            {[f.event_time, f.property_address].filter(Boolean).join("  ·  ")}
          </text>
        </g>
      ) : f.price ? (
        <g>
          <rect x={0} y={296} width={258} height={56} fill={c.priceBg} />
          <text x={28} y={335} fill={c.priceText} fontSize="34" fontWeight="800">
            {f.price}
          </text>
          {statsLine(f) && (
            <text x={278} y={322} fill={c.text} fontSize="16" fontWeight="800">
              {statsLine(f)}
            </text>
          )}
          {f.property_address && (
            <text x={278} y={343} fill={c.sub} fontSize="14" fontWeight="500">
              {wrapText(f.property_address, 24, 1)[0]}
            </text>
          )}
        </g>
      ) : (
        <g>
          <rect x={0} y={296} width={600} height={56} fill={c.priceBg} />
          {statsLine(f) ? (
            <text x={28} y={331} fill={c.priceText} fontSize="22" fontWeight="800">
              {statsLine(f)}
            </text>
          ) : (
            <text x={28} y={331} fill={c.priceText} fontSize="20" fontWeight="800">
              {wrapText(f.subhead || f.property_address || "", 46, 1)[0]}
            </text>
          )}
          {f.property_address && statsLine(f) && (
            <text x={572} y={331} textAnchor="end" fill={c.priceText} fontSize="14" fontWeight="600" opacity="0.92">
              {wrapText(f.property_address, 26, 1)[0]}
            </text>
          )}
        </g>
      )}

      <Footer f={f} c={c} uid={uid} />
    </>
  );
}

function IntroFront({
  f,
  c,
  uid,
}: {
  f: DesignFields;
  c: Colors;
  uid: string;
}) {
  const portrait = f.headshot_url || f.property_photo_url;
  const headLines = wrapText(f.headline || "Hi, I'm your neighbor", 18, 2);
  return (
    <>
      <rect width="600" height="400" fill={c.bg} />
      {/* portrait left, full bleed */}
      {portrait ? (
        <>
          <clipPath id={`ip-${uid}`}>
            <rect x={0} y={0} width={244} height={400} />
          </clipPath>
          <image href={portrait} x={0} y={0} width={244} height={400} preserveAspectRatio="xMidYMid slice" clipPath={`url(#ip-${uid})`} />
        </>
      ) : (
        <rect x={0} y={0} width={244} height={400} fill={c.panel} />
      )}
      {/* accent spine between photo and text */}
      <rect x={244} y={0} width={10} height={400} fill={c.headerBg} />

      {/* headline */}
      <text x={276} fill={c.text} fontSize="34" fontWeight="800" className="pc-display" letterSpacing="-0.6">
        {headLines.map((l, i) => (
          <tspan key={i} x={276} y={78 + i * 38}>
            {l}
          </tspan>
        ))}
      </text>
      {/* subhead chip */}
      {f.subhead && (
        <>
          <rect x={276} y={headLines.length > 1 ? 132 : 96} width={wrapText(f.subhead, 30, 1)[0].length * 8.2 + 22} height={26} rx={13} fill={c.chipBg} />
          <text x={288} y={(headLines.length > 1 ? 132 : 96) + 18} fill={c.chipText} fontSize="13" fontWeight="700">
            {wrapText(f.subhead, 30, 1)[0]}
          </text>
        </>
      )}
      {/* body */}
      <text x={276} y={headLines.length > 1 ? 184 : 150} fill={c.sub} fontSize="15" fontWeight="500">
        {wrapText(f.body, 36, 7).map((l, i) => (
          <tspan key={i} x={276} dy={i === 0 ? 0 : 23}>
            {l}
          </tspan>
        ))}
      </text>

      <Footer f={f} c={c} uid={uid} />
    </>
  );
}

/**
 * Elegant diagonal split — cream panel + serif headline on the left, a
 * property photo behind a diagonal edge on the right. Warm taupe (accent)
 * for the serif + rule; an italic-serif tagline echoes a script flourish.
 * Ignores theme palette by design (always the warm cream/taupe look).
 */
function ElegantSplitFront({
  f,
  accent,
  uid,
}: {
  f: DesignFields;
  accent: string;
  uid: string;
}) {
  const cream = "#f7f3ea";
  const ink = "#262a33";
  const taupe = accent;
  const photo = f.property_photo_url;
  // photo trapezoid: narrower at top (x≥470), wider at bottom (x≥300).
  const poly = "470,0 600,0 600,400 300,400";

  const headLines = wrapText(
    (f.headline || "Looking to buy or sell your home?").toUpperCase(),
    12,
    4
  );
  const startY = 132 - (headLines.length - 1) * 19;
  const ruleY = startY + (headLines.length - 1) * 38 + 30;
  const tagLines = wrapText(
    f.subhead || "Let's turn your dreams into reality.",
    30,
    2
  );

  return (
    <>
      <rect width="600" height="400" fill={cream} />

      {/* diagonal photo on the right */}
      <clipPath id={`es-${uid}`}>
        <polygon points={poly} />
      </clipPath>
      {photo ? (
        <image
          href={photo}
          x={250}
          y={0}
          width={350}
          height={400}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#es-${uid})`}
        />
      ) : (
        <g clipPath={`url(#es-${uid})`}>
          <rect x={250} y={0} width={350} height={400} fill="#e8e1d2" />
          <path
            d="M422 214 l72 -56 l72 56"
            fill="none"
            stroke={taupe}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
          <rect x={450} y={210} width={88} height={74} fill="none" stroke={taupe} strokeWidth="3" opacity="0.5" />
        </g>
      )}

      {/* serif headline, taupe, uppercase */}
      <text className="pc-display" fill={taupe} fontSize="30" fontWeight="500" letterSpacing="0.5">
        {headLines.map((l, i) => (
          <tspan key={i} x={44} y={startY + i * 38}>
            {l}
          </tspan>
        ))}
      </text>

      {/* thin rule */}
      <line x1={44} y1={ruleY} x2={250} y2={ruleY} stroke={taupe} strokeWidth="1.5" />

      {/* italic-serif tagline (script flourish) */}
      <text x={44} y={ruleY + 34} fill={ink} className="pc-display" fontStyle="italic" fontSize="19" fontWeight="500">
        {tagLines.map((l, i) => (
          <tspan key={i} x={44} dy={i === 0 ? 0 : 24}>
            {l}
          </tspan>
        ))}
      </text>

      {/* slim contact line (front carries no footer band) */}
      {(f.agent_name || f.agent_phone) && (
        <text x={44} y={384} fill={ink} fontSize="11.5" fontWeight="600" opacity="0.72">
          {[f.agent_name, f.agent_phone].filter(Boolean).join("   ·   ")}
        </text>
      )}
    </>
  );
}

/**
 * Full-bleed property photo with a price chip (top-left) and a banner along
 * the bottom (label · address), inside a thin white frame. Bands use the
 * accent color so the design recolors with the brand.
 */
function PhotoBannerFront({
  f,
  accent,
  uid,
}: {
  f: DesignFields;
  accent: string;
  uid: string;
}) {
  const photo = f.property_photo_url;
  const label = f.headline || "New Listing";
  const addrLines = wrapText(f.property_address || "", 30, 2);
  const priceW = Math.max(120, (f.price?.length || 0) * 19 + 44);

  return (
    <>
      {photo ? (
        <>
          <clipPath id={`pb-${uid}`}>
            <rect width={600} height={400} />
          </clipPath>
          <image
            href={photo}
            x={0}
            y={0}
            width={600}
            height={400}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#pb-${uid})`}
          />
        </>
      ) : (
        <>
          <rect width={600} height={400} fill="#e8e6e2" />
          <path
            d="M252 214 l48 -40 l48 40"
            fill="none"
            stroke="#bcb7ae"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x={270} y={210} width={60} height={50} fill="none" stroke="#bcb7ae" strokeWidth="3" />
        </>
      )}

      {/* thin inset frame */}
      <rect x={20} y={20} width={560} height={360} fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.9" />

      {/* price chip */}
      {f.price && (
        <>
          <rect x={20} y={42} width={priceW} height={54} fill={accent} opacity="0.92" />
          <text x={42} y={78} fill="#ffffff" fontSize="30" fontWeight="700" letterSpacing="3">
            {f.price}
          </text>
        </>
      )}

      {/* bottom banner */}
      <rect x={20} y={318} width={560} height={62} fill={accent} opacity="0.88" />
      <text x={44} y={357} fill="#ffffff" fontSize="29" fontWeight="400" letterSpacing="0.5">
        {label}
      </text>
      <line x1={252} y1={332} x2={252} y2={368} stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
      <text
        x={418}
        y={addrLines.length > 1 ? 347 : 356}
        fill="#ffffff"
        fontSize="14"
        letterSpacing="1.2"
        textAnchor="middle"
        opacity="0.92"
      >
        {addrLines.map((l, i) => (
          <tspan key={i} x={418} dy={i === 0 ? 0 : 18}>
            {l}
          </tspan>
        ))}
      </text>
    </>
  );
}

/** Equal Housing Opportunity mark — simplified monochrome (house + "="). */
function EqualHousingMark({ x, y, s, fill, cut }: { x: number; y: number; s: number; fill: string; cut: string }) {
  return (
    <g transform={`translate(${x},${y})`} aria-label="Equal Housing Opportunity">
      <path
        d={`M0 ${0.42 * s} L${0.5 * s} 0 L${s} ${0.42 * s} L${0.84 * s} ${0.42 * s} L${0.84 * s} ${s} L${0.16 * s} ${s} L${0.16 * s} ${0.42 * s} Z`}
        fill={fill}
      />
      <rect x={0.34 * s} y={0.54 * s} width={0.32 * s} height={0.08 * s} fill={cut} />
      <rect x={0.34 * s} y={0.7 * s} width={0.32 * s} height={0.08 * s} fill={cut} />
    </g>
  );
}

/** REALTOR® block-R mark — simplified monochrome. */
function RealtorMark({ x, y, s, fill, cut }: { x: number; y: number; s: number; fill: string; cut: string }) {
  return (
    <g transform={`translate(${x},${y})`} aria-label="REALTOR">
      <rect x={0.08 * s} width={0.84 * s} height={s} rx={0.06 * s} fill={fill} />
      <text
        x={0.5 * s}
        y={0.8 * s}
        textAnchor="middle"
        fontSize={0.84 * s}
        fontWeight="800"
        fill={cut}
        fontFamily="var(--font-sans), Arial, sans-serif"
      >
        R
      </text>
    </g>
  );
}

/** Trim a URL to its host + path for display under the QR. */
function prettyUrl(url: string): string {
  const u = url.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return u.length > 30 ? u.slice(0, 29) + "…" : u;
}

function BackCard({
  kind,
  f,
  c,
  profile,
}: {
  kind: TemplateKind;
  f: DesignFields;
  c: Colors;
  profile: Profile | null;
}) {
  // Left message column is ~270px wide → wrap tight so it never crosses the
  // divider. Allow more lines (back has the room) so copy isn't truncated.
  const bodyLines = wrapText(f.body, 33, 6);
  const bodyTop = 86;
  const lh = 20;
  const bodyBottom = bodyTop + (bodyLines.length - 1) * lh;
  const testiTop = bodyBottom + 32;

  // FROM: per-design override falls back to the profile.
  const ret = [
    f.return_name || profile?.return_name || "",
    f.return_company || profile?.company_name || "",
    f.return_line1 || profile?.return_line1 || "",
    [
      f.return_city || profile?.return_city || "",
      f.return_state || profile?.return_state || "",
    ]
      .filter(Boolean)
      .join(", ") +
      (f.return_zip || profile?.return_zip
        ? ` ${f.return_zip || profile?.return_zip}`
        : ""),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <rect width="600" height="400" fill={c.bg} />
      <rect x={0} y={0} width={600} height={12} fill={c.badgeBg} />

      {/* ── left: message ── */}
      <text x={40} y={54} fill={c.text} fontSize="20" fontWeight="800" className="pc-display">
        {wrapText(f.subhead || KIND_LABEL[kind], 26, 1)[0]}
      </text>
      <text x={40} y={bodyTop} fill={c.sub} fontSize="14" fontWeight="500">
        {bodyLines.map((l, i) => (
          <tspan key={i} x={40} dy={i === 0 ? 0 : lh}>
            {l}
          </tspan>
        ))}
      </text>

      {f.testimonial && (
        <g>
          <text x={40} y={testiTop} fill={c.highlight} fontSize="18" fontWeight="800">
            ★★★★★
          </text>
          <text x={40} y={testiTop + 22} fill={c.sub} fontSize="12.5" fontStyle="italic">
            {wrapText(`“${f.testimonial}”`, 38, 2).map((l, i) => (
              <tspan key={i} x={40} dy={i === 0 ? 0 : 17}>
                {l}
              </tspan>
            ))}
          </text>
          {f.testimonial_author && (
            <text x={40} y={testiTop + 62} fill={c.muted} fontSize="12">
              — {f.testimonial_author}
            </text>
          )}
        </g>
      )}

      {/* return address (bottom-left) */}
      <text x={40} y={304} fill={c.muted} fontSize="10" letterSpacing="2" fontWeight="700">
        FROM
      </text>
      {ret.map((line, i) => (
        <text key={i} x={40} y={320 + i * 15} fill={c.sub} fontSize="11.5">
          {line}
        </text>
      ))}

      {/* ── divider ── */}
      <line x1={318} y1={34} x2={318} y2={366} stroke={c.line} strokeWidth="1" strokeDasharray="3 4" />

      {/* ── right: stamp / address / QR ── */}
      <rect x={486} y={30} width={80} height={54} rx={4} fill="none" stroke={c.line} strokeDasharray="4 4" />
      <text x={526} y={61} textAnchor="middle" fill={c.muted} fontSize="10" letterSpacing="1">
        STAMP
      </text>

      <text x={344} y={140} fill={c.muted} fontSize="10" letterSpacing="2" fontWeight="700">
        DELIVER TO
      </text>
      <line x1={344} y1={164} x2={470} y2={164} stroke={c.line} strokeWidth="1" />
      <line x1={344} y1={186} x2={470} y2={186} stroke={c.line} strokeWidth="1" />
      <line x1={344} y1={208} x2={470} y2={208} stroke={c.line} strokeWidth="1" />
      <text x={344} y={226} fill={c.muted} fontSize="10.5">
        Each verified address printed at send.
      </text>

      {/* QR */}
      <g transform="translate(344,250)">
        <rect width={76} height={76} rx={6} fill={c.text} />
        <rect x={9} y={9} width={58} height={58} fill={c.bg} />
        <rect x={17} y={17} width={42} height={42} fill={c.text} />
        <rect x={28} y={28} width={20} height={20} fill={c.bg} />
      </g>
      <text x={432} y={272} fill={c.muted} fontSize="11">
        Scan goes to
      </text>
      <text x={432} y={290} fill={c.highlight} fontSize="11.5" fontWeight="700">
        {f.qr_url ? prettyUrl(f.qr_url) : "Set a link →"}
      </text>
      <text x={432} y={312} fill={c.sub} fontSize="11.5">
        {wrapText(f.cta || "Scan to learn more", 20, 2).map((l, i) => (
          <tspan key={i} x={432} dy={i === 0 ? 0 : 14}>
            {l}
          </tspan>
        ))}
      </text>

      {/* ── compliance logos (bottom-right) ── */}
      <EqualHousingMark x={f.nar_member === "yes" ? 506 : 540} y={364} s={26} fill={c.text} cut={c.bg} />
      {f.nar_member === "yes" && (
        <RealtorMark x={540} y={366} s={24} fill={c.text} cut={c.bg} />
      )}
    </>
  );
}

function Layout({
  kind,
  theme,
  accent,
  fields,
  side,
  profile,
  layout,
}: {
  kind: TemplateKind;
  theme: DesignTheme;
  accent: string;
  fields: DesignFields;
  side: "front" | "back";
  profile: Profile | null;
  layout: PostcardLayout;
}) {
  const uid = useId().replace(/:/g, "");
  const c = themeColors(theme, accent);
  if (side === "back") return <BackCard kind={kind} f={fields} c={c} profile={profile} />;
  if (layout === "photo_banner") return <PhotoBannerFront f={fields} accent={accent} uid={uid} />;
  if (layout === "elegant_split") return <ElegantSplitFront f={fields} accent={accent} uid={uid} />;
  if (layout === "intro") return <IntroFront f={fields} c={c} uid={uid} />;
  return <ShowcaseFront kind={kind} f={fields} c={c} uid={uid} />;
}

function Svg({
  children,
  label,
  style,
}: {
  children: React.ReactNode;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 600 400"
      width="100%"
      className="pc-svg block aspect-[3/2] w-full"
      style={style}
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

export function PostcardSide({
  design,
  side,
  className = "",
}: {
  design: Design;
  side: "front" | "back";
  className?: string;
}) {
  const { session } = useData();

  if (design.source === "uploaded") {
    const url = side === "front" ? design.front_image_url : design.back_image_url;
    return url ? (
      <PostcardImage src={url} alt={`${design.name} ${side}`} className={className} />
    ) : (
      <div className={`aspect-[3/2] w-full bg-zinc-100 ${className}`} />
    );
  }

  const fields = design.fields;
  if (!fields) return <div className={`aspect-[3/2] w-full bg-zinc-100 ${className}`} />;
  const { kind, theme, accent, layout, font } = resolveStyle(design);

  return (
    <div className={className}>
      <Svg label={`${design.name} ${side}`} style={fontVars(font)}>
        <Layout
          kind={kind}
          theme={theme}
          accent={accent}
          fields={fields}
          side={side}
          profile={session?.profile ?? null}
          layout={layout}
        />
      </Svg>
    </div>
  );
}

/** Preview from raw style + fields (editor + marketing). */
export function PostcardPreview({
  kind,
  theme,
  accent,
  fields,
  side,
  profile,
  layout,
  font,
}: {
  kind: TemplateKind;
  theme: DesignTheme;
  accent: string;
  fields: DesignFields;
  side: "front" | "back";
  profile: Profile | null;
  layout?: PostcardLayout;
  font?: string;
}) {
  const resolved = layout ?? DEFAULT_LAYOUT[kind];
  return (
    <Svg label={`${KIND_LABEL[kind]} ${side}`} style={fontVars(font || DEFAULT_FONT)}>
      <Layout kind={kind} theme={theme} accent={accent} fields={fields} side={side} profile={profile} layout={resolved} />
    </Svg>
  );
}

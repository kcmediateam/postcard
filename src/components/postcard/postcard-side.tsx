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
  const uid = useId().replace(/:/g, "");
  const bodyLines = wrapText(f.body, 46, 5);
  const ret = profile
    ? [
        profile.return_name,
        profile.company_name,
        profile.return_line1,
        [profile.return_city, profile.return_state, profile.return_zip].filter(Boolean).join(", "),
      ].filter(Boolean)
    : [];

  return (
    <>
      <rect width="600" height="400" fill={c.bg} />
      <rect x={0} y={0} width={600} height={14} fill={c.badgeBg} />

      <text x={40} y={62} fill={c.text} fontSize="22" fontWeight="800" className="pc-display">
        {wrapText(f.subhead || KIND_LABEL[kind], 30, 1)[0]}
      </text>
      <text x={40} y={92} fill={c.sub} fontSize="15" fontWeight="500">
        {bodyLines.map((l, i) => (
          <tspan key={i} x={40} dy={i === 0 ? 0 : 22}>
            {l}
          </tspan>
        ))}
      </text>

      {f.testimonial && (
        <g>
          <text x={40} y={216} fill={c.highlight} fontSize="22" fontWeight="800">
            ★★★★★
          </text>
          <text x={40} y={238} fill={c.sub} fontSize="12.5" fontStyle="italic">
            {wrapText(`“${f.testimonial}”`, 52, 2).map((l, i) => (
              <tspan key={i} x={40} dy={i === 0 ? 0 : 18}>
                {l}
              </tspan>
            ))}
          </text>
          {f.testimonial_author && (
            <text x={40} y={282} fill={c.muted} fontSize="12">
              — {f.testimonial_author}
            </text>
          )}
        </g>
      )}

      {/* return address */}
      <text x={40} y={312} fill={c.muted} fontSize="10.5" letterSpacing="2" fontWeight="600">
        FROM
      </text>
      {ret.map((line, i) => (
        <text key={i} x={40} y={330 + i * 17} fill={c.sub} fontSize="12.5">
          {line}
        </text>
      ))}

      <line x1={330} y1={40} x2={330} y2={360} stroke={c.line} strokeDasharray="4 4" />
      <rect x={470} y={40} width={90} height={62} fill="none" stroke={c.line} strokeDasharray="5 4" />
      <text x={515} y={76} textAnchor="middle" fill={c.muted} fontSize="11">
        STAMP
      </text>
      <text x={360} y={190} fill={c.sub} fontSize="14">
        [ Recipient address ]
      </text>
      <text x={360} y={210} fill={c.muted} fontSize="11.5">
        Printed per contact at send
      </text>

      <g transform="translate(360,250)">
        <rect width={74} height={74} rx={6} fill={c.text} />
        <rect x={9} y={9} width={56} height={56} fill={c.bg} />
        <rect x={17} y={17} width={40} height={40} fill={c.text} />
        <rect x={27} y={27} width={20} height={20} fill={c.bg} />
      </g>
      <text x={446} y={286} fill={c.muted} fontSize="11.5">
        Lob QR —
      </text>
      <text x={446} y={302} fill={c.highlight} fontSize="11.5" fontWeight="600">
        {f.cta || "Scan to learn more"}
      </text>
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

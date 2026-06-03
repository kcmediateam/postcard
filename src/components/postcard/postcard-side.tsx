"use client";

import { useId } from "react";
import type {
  Design,
  DesignFields,
  DesignTheme,
  Profile,
  TemplateKind,
} from "@/lib/types";
import { KIND_LABEL, resolveStyle } from "@/lib/templates";
import { useData } from "@/lib/data/data-context";
import { PostcardImage } from "@/components/ui/postcard-image";

const SERIF = "var(--font-serif), Georgia, serif";

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
    };
  }
  if (theme === "bold") {
    return {
      bg: accent,
      text: "#ffffff",
      sub: "rgba(255,255,255,0.9)",
      muted: "rgba(255,255,255,0.7)",
      panel: "rgba(255,255,255,0.14)",
      line: "rgba(255,255,255,0.28)",
      badgeBg: "#ffffff",
      badgeText: accent,
      highlight: "#ffffff",
      footerBg: "rgba(0,0,0,0.18)",
      footerText: "#ffffff",
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
      <rect x={0} y={356} width={600} height={44} fill={c.footerBg} />
      <text x={28} y={374} fill={c.footerText} fontSize="13" fontWeight="700">
        {f.agent_name || "Your name"}
      </text>
      <text x={28} y={390} fill={c.footerText} fontSize="11" opacity="0.85">
        {[f.agent_phone, f.agent_email].filter(Boolean).join("   ·   ")}
      </text>
      {f.logo_url ? (
        <>
          <clipPath id={`lg-${uid}`}>
            <rect x={500} y={363} width={76} height={30} />
          </clipPath>
          <image
            href={f.logo_url}
            x={500}
            y={363}
            width={76}
            height={30}
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#lg-${uid})`}
          />
        </>
      ) : (
        f.cta && (
          <text x={572} y={382} textAnchor="end" fill={c.footerText} fontSize="11.5" fontWeight="600">
            {f.cta}
          </text>
        )
      )}
    </g>
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
  const headlineLines = wrapText(f.headline || KIND_LABEL[kind], hasHeadshot ? 16 : 22, 2);
  const isMarket = kind === "market_update";

  const photos = [f.property_photo_url, f.property_photo_url_2, f.property_photo_url_3].filter(Boolean) as string[];
  const cols = isMarket ? 0 : Math.min(3, photos.length || 1);

  return (
    <>
      <rect width="600" height="400" fill={c.bg} />

      {/* header */}
      <g>
        <rect x={28} y={26} width={badge.length * 8.5 + 22} height={26} rx={13} fill={c.badgeBg} />
        <text x={39} y={43} fill={c.badgeText} fontSize="12" fontWeight="700" letterSpacing="1.5">
          {badge}
        </text>
      </g>
      <text x={28} y={92} fill={c.text} fontSize="34" fontWeight="800" fontFamily={SERIF} letterSpacing="-0.5">
        {headlineLines.map((l, i) => (
          <tspan key={i} x={28} dy={i === 0 ? 0 : 36}>
            {l}
          </tspan>
        ))}
      </text>
      {f.subhead && (
        <text x={28} y={headlineLines.length > 1 ? 132 : 116} fill={c.sub} fontSize="13.5">
          {wrapText(f.subhead, hasHeadshot ? 44 : 60, 1)[0]}
        </text>
      )}
      {hasHeadshot && <Headshot url={f.headshot_url} cx={548} cy={62} r={34} c={c} uid={`hs${uid}`} />}

      {/* photo row OR market body */}
      {isMarket ? (
        <text x={28} y={170} fill={c.sub} fontSize="14">
          {wrapText(f.body, 70, 4).map((l, i) => (
            <tspan key={i} x={28} dy={i === 0 ? 0 : 22}>
              {l}
            </tspan>
          ))}
        </text>
      ) : (
        (() => {
          const top = 150;
          const h = 120;
          const gap = 10;
          const left = 28;
          const total = 544;
          const wEach = (total - gap * (cols - 1)) / cols;
          return Array.from({ length: cols }).map((_, i) => (
            <Photo
              key={i}
              url={photos[i] ?? null}
              x={left + i * (wEach + gap)}
              y={top}
              w={wEach}
              h={h}
              c={c}
              uid={`${uid}-${i}`}
            />
          ));
        })()
      )}

      {/* info band */}
      {kind === "open_house" ? (
        <g>
          <rect x={28} y={290} width={4} height={48} fill={c.highlight} />
          <text x={44} y={308} fill={c.text} fontSize="16" fontWeight="700">
            {f.event_date || "Date"}
          </text>
          <text x={44} y={330} fill={c.sub} fontSize="13">
            {f.event_time || "Time"} · {f.property_address}
          </text>
        </g>
      ) : (
        <g>
          {f.price && (
            <text x={28} y={306} fill={c.highlight} fontSize="30" fontWeight="800">
              {f.price}
            </text>
          )}
          {statsLine(f) && (
            <text x={28} y={f.price ? 332 : 312} fill={c.sub} fontSize="13.5" fontWeight="600">
              {statsLine(f)}
            </text>
          )}
          {f.property_address && (
            <text x={f.price ? 300 : 28} y={f.price ? 306 : 336} fill={c.muted} fontSize="13">
              {f.property_address}
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
  return (
    <>
      <rect width="600" height="400" fill={c.bg} />
      {/* portrait left */}
      {portrait ? (
        <>
          <clipPath id={`ip-${uid}`}>
            <rect x={0} y={0} width={232} height={400} />
          </clipPath>
          <image href={portrait} x={0} y={0} width={232} height={400} preserveAspectRatio="xMidYMid slice" clipPath={`url(#ip-${uid})`} />
        </>
      ) : (
        <rect x={0} y={0} width={232} height={400} fill={c.panel} />
      )}

      {/* text right */}
      <text x={262} y={86} fill={c.text} fontSize="30" fontWeight="800" fontFamily={SERIF} letterSpacing="-0.5">
        {wrapText(f.headline || "Hi, I'm your neighbor", 22, 2).map((l, i) => (
          <tspan key={i} x={262} dy={i === 0 ? 0 : 34}>
            {l}
          </tspan>
        ))}
      </text>
      {f.subhead && (
        <text x={262} y={132} fill={c.highlight} fontSize="14" fontWeight="600">
          {wrapText(f.subhead, 38, 1)[0]}
        </text>
      )}
      <text x={262} y={170} fill={c.sub} fontSize="13.5">
        {wrapText(f.body, 40, 7).map((l, i) => (
          <tspan key={i} x={262} dy={i === 0 ? 0 : 21}>
            {l}
          </tspan>
        ))}
      </text>

      <Footer f={f} c={c} uid={uid} />
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
      <rect x={0} y={0} width={600} height={10} fill={c.badgeBg} />

      <text x={40} y={58} fill={c.text} fontSize="19" fontWeight="700" fontFamily={SERIF}>
        {f.subhead || KIND_LABEL[kind]}
      </text>
      <text x={40} y={88} fill={c.sub} fontSize="14">
        {bodyLines.map((l, i) => (
          <tspan key={i} x={40} dy={i === 0 ? 0 : 21}>
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
}: {
  kind: TemplateKind;
  theme: DesignTheme;
  accent: string;
  fields: DesignFields;
  side: "front" | "back";
  profile: Profile | null;
}) {
  const uid = useId().replace(/:/g, "");
  const c = themeColors(theme, accent);
  if (side === "back") return <BackCard kind={kind} f={fields} c={c} profile={profile} />;
  if (kind === "neighbor_intro") return <IntroFront f={fields} c={c} uid={uid} />;
  return <ShowcaseFront kind={kind} f={fields} c={c} uid={uid} />;
}

function Svg({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 600 400"
      width="100%"
      className="block aspect-[3/2] w-full"
      fontFamily="var(--font-sans), Arial, sans-serif"
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
  const { kind, theme, accent } = resolveStyle(design);

  return (
    <div className={className}>
      <Svg label={`${design.name} ${side}`}>
        <Layout
          kind={kind}
          theme={theme}
          accent={accent}
          fields={fields}
          side={side}
          profile={session?.profile ?? null}
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
}: {
  kind: TemplateKind;
  theme: DesignTheme;
  accent: string;
  fields: DesignFields;
  side: "front" | "back";
  profile: Profile | null;
}) {
  return (
    <Svg label={`${KIND_LABEL[kind]} ${side}`}>
      <Layout kind={kind} theme={theme} accent={accent} fields={fields} side={side} profile={profile} />
    </Svg>
  );
}

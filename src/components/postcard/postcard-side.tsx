"use client";

import { useId } from "react";
import type { Design, DesignFields, Profile, TemplateKind } from "@/lib/types";
import { KIND_ACCENT } from "@/lib/templates";
import { useData } from "@/lib/data/data-context";
import { PostcardImage } from "@/components/ui/postcard-image";

/** Naive word-wrap into at most `maxLines` lines of ~maxChars each. */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  // append remaining words to last line with ellipsis if truncated
  return lines;
}

function statsLine(f: DesignFields): string {
  const parts: string[] = [];
  if (f.beds) parts.push(`${f.beds} bd`);
  if (f.baths) parts.push(`${f.baths} ba`);
  if (f.sqft) parts.push(`${f.sqft} sqft`);
  return parts.join("  ·  ");
}

function PhotoOrPlaceholder({
  url,
  x,
  y,
  w,
  h,
  rx,
  clipId,
  label,
}: {
  url: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  clipId: string;
  label: string;
}) {
  if (!url) {
    return (
      <>
        <rect x={x} y={y} width={w} height={h} rx={rx} fill="#f4f4f5" />
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={rx}
          fill="none"
          stroke="#d4d4d8"
          strokeDasharray="6 5"
        />
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize="13"
        >
          {label}
        </text>
      </>
    );
  }
  return (
    <>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={w} height={h} rx={rx} />
      </clipPath>
      <image
        href={url}
        x={x}
        y={y}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
    </>
  );
}

function Headshot({
  url,
  cx,
  cy,
  r,
  clipId,
}: {
  url: string | null;
  cx: number;
  cy: number;
  r: number;
  clipId: string;
}) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.25)" />
      {url && (
        <>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <image
            href={url}
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        </>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
      />
    </>
  );
}

function FrontCard({
  kind,
  fields,
}: {
  kind: TemplateKind;
  fields: DesignFields;
}) {
  const accent = KIND_ACCENT[kind];
  const uid = useId().replace(/[:]/g, "");
  const badge =
    kind === "just_listed"
      ? "JUST LISTED"
      : kind === "just_sold"
      ? "JUST SOLD"
      : "OPEN HOUSE";
  const headlineLines = wrapText(fields.headline || badge, 13, 2);
  const subheadLines = wrapText(fields.subhead, 30, 2);

  return (
    <>
      <rect width="600" height="400" fill="#ffffff" />
      {/* property photo (right) */}
      <PhotoOrPlaceholder
        url={fields.property_photo_url}
        x={326}
        y={26}
        w={250}
        h={kind === "open_house" ? 196 : 252}
        rx={14}
        clipId={`ph-${uid}`}
        label="Property photo"
      />

      {/* SOLD ribbon for just_sold */}
      {kind === "just_sold" && (
        <g transform="rotate(-10 451 70)">
          <rect x={356} y={50} width={190} height={40} rx={4} fill="#f59e0b" />
          <text
            x={451}
            y={78}
            textAnchor="middle"
            fill="#3a2300"
            fontSize="26"
            fontWeight="800"
            letterSpacing="2"
          >
            SOLD
          </text>
        </g>
      )}

      {/* badge */}
      <g>
        <rect
          x={28}
          y={28}
          width={badge.length * 11 + 24}
          height={28}
          rx={14}
          fill={accent}
        />
        <text
          x={28 + 12}
          y={47}
          fill="#ffffff"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2"
        >
          {badge}
        </text>
      </g>

      {/* headline */}
      <text
        x={28}
        y={104}
        fill="#15181e"
        fontSize="42"
        fontWeight="800"
        letterSpacing="-1"
      >
        {headlineLines.map((l, i) => (
          <tspan key={i} x={28} dy={i === 0 ? 0 : 44}>
            {l}
          </tspan>
        ))}
      </text>

      {/* subhead */}
      <text x={28} y={headlineLines.length > 1 ? 196 : 152} fill="#52525b" fontSize="15">
        {subheadLines.map((l, i) => (
          <tspan key={i} x={28} dy={i === 0 ? 0 : 20}>
            {l}
          </tspan>
        ))}
      </text>

      {/* open house event block OR price */}
      {kind === "open_house" ? (
        <g>
          <rect x={28} y={232} width={4} height={60} fill={accent} />
          <text x={44} y={252} fill="#15181e" fontSize="18" fontWeight="700">
            {fields.event_date || "Date"}
          </text>
          <text x={44} y={276} fill="#52525b" fontSize="15">
            {fields.event_time || "Time"}
          </text>
        </g>
      ) : (
        fields.price && (
          <text x={28} y={258} fill="#15181e" fontSize="32" fontWeight="800">
            {fields.price}
          </text>
        )
      )}

      {/* stats */}
      {statsLine(fields) && (
        <text x={28} y={kind === "open_house" ? 316 : 290} fill="#3f3f46" fontSize="15" fontWeight="600">
          {statsLine(fields)}
        </text>
      )}
      {/* address */}
      {fields.property_address && (
        <text x={28} y={kind === "open_house" ? 338 : 312} fill="#71717a" fontSize="14">
          {fields.property_address}
        </text>
      )}

      {/* footer */}
      <rect x={0} y={356} width={600} height={44} fill={accent} />
      <Headshot
        url={fields.headshot_url}
        cx={30}
        cy={378}
        r={15}
        clipId={`hs-${uid}`}
      />
      <text x={56} y={374} fill="#ffffff" fontSize="13" fontWeight="700">
        {fields.agent_name || "Your name"}
      </text>
      <text x={56} y={390} fill="rgba(255,255,255,0.85)" fontSize="11">
        {[fields.agent_phone, fields.agent_email].filter(Boolean).join("  ·  ")}
      </text>
      {fields.cta && (
        <text x={572} y={382} textAnchor="end" fill="#ffffff" fontSize="12" fontWeight="600">
          {fields.cta}
        </text>
      )}
    </>
  );
}

function BackCard({
  kind,
  fields,
  profile,
}: {
  kind: TemplateKind;
  fields: DesignFields;
  profile: Profile | null;
}) {
  const accent = KIND_ACCENT[kind];
  const uid = useId().replace(/[:]/g, "");
  const bodyLines = wrapText(fields.body, 46, 6);

  const ret = profile
    ? [
        profile.return_name,
        profile.company_name,
        profile.return_line1,
        [profile.return_city, profile.return_state, profile.return_zip]
          .filter(Boolean)
          .join(", "),
      ].filter(Boolean)
    : [];

  return (
    <>
      <rect width="600" height="400" fill="#ffffff" />
      <rect x={0} y={0} width={600} height={10} fill={accent} />

      {/* message */}
      <text x={40} y={62} fill="#15181e" fontSize="20" fontWeight="700">
        {fields.subhead || "A note for your neighbors"}
      </text>
      <text x={40} y={94} fill="#3f3f46" fontSize="15">
        {bodyLines.map((l, i) => (
          <tspan key={i} x={40} dy={i === 0 ? 0 : 22}>
            {l}
          </tspan>
        ))}
      </text>

      {/* return address */}
      <text x={40} y={300} fill="#a1a1aa" fontSize="11" letterSpacing="2" fontWeight="600">
        FROM
      </text>
      {ret.map((line, i) => (
        <text key={i} x={40} y={320 + i * 18} fill="#52525b" fontSize="13">
          {line}
        </text>
      ))}

      {/* divider */}
      <line x1={330} y1={40} x2={330} y2={360} stroke="#e4e4e7" strokeDasharray="4 4" />

      {/* stamp */}
      <rect x={470} y={40} width={90} height={64} fill="none" stroke="#d4d4d8" strokeDasharray="5 4" />
      <text x={515} y={78} textAnchor="middle" fill="#a1a1aa" fontSize="12">
        STAMP
      </text>

      {/* recipient */}
      <text x={360} y={196} fill="#3f3f46" fontSize="15">
        [ Recipient address ]
      </text>
      <text x={360} y={218} fill="#a1a1aa" fontSize="12">
        Printed per contact at send
      </text>

      {/* QR */}
      <g transform="translate(360,260)">
        <rect width={76} height={76} fill="#15181e" rx={6} />
        <rect x={10} y={10} width={56} height={56} fill="#ffffff" />
        <rect x={18} y={18} width={40} height={40} fill="#15181e" />
        <rect x={28} y={28} width={20} height={20} fill="#ffffff" />
      </g>
      <text x={448} y={300} fill="#71717a" fontSize="12">
        Lob QR —
      </text>
      <text x={448} y={316} fill="#71717a" fontSize="12">
        scan tracking on
      </text>
      <text x={448} y={332} fill={accent} fontSize="12" fontWeight="600">
        {fields.cta || "Scan to learn more"}
      </text>
    </>
  );
}

/**
 * Renders one side of a postcard design at the container's width (3:2).
 * Uploaded designs render their image; template designs render the composited
 * SVG layout from the design's fields.
 */
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
    const url =
      side === "front" ? design.front_image_url : design.back_image_url;
    return url ? (
      <PostcardImage src={url} alt={`${design.name} ${side}`} className={className} />
    ) : (
      <div className={`aspect-[3/2] w-full bg-zinc-100 ${className}`} />
    );
  }

  const kind = design.template_kind ?? "just_listed";
  const fields = design.fields;
  if (!fields) return <div className={`aspect-[3/2] w-full bg-zinc-100 ${className}`} />;

  return (
    <svg
      viewBox="0 0 600 400"
      width="100%"
      className={`block aspect-[3/2] w-full ${className}`}
      fontFamily="var(--font-sans), Arial, sans-serif"
      role="img"
      aria-label={`${design.name} ${side}`}
    >
      {side === "front" ? (
        <FrontCard kind={kind} fields={fields} />
      ) : (
        <BackCard kind={kind} fields={fields} profile={session?.profile ?? null} />
      )}
    </svg>
  );
}

/** Lightweight wrapper for previewing raw fields (editor live preview). */
export function PostcardPreview({
  kind,
  fields,
  side,
  profile,
}: {
  kind: TemplateKind;
  fields: DesignFields;
  side: "front" | "back";
  profile: Profile | null;
}) {
  return (
    <svg
      viewBox="0 0 600 400"
      width="100%"
      className="block aspect-[3/2] w-full"
      fontFamily="var(--font-sans), Arial, sans-serif"
    >
      {side === "front" ? (
        <FrontCard kind={kind} fields={fields} />
      ) : (
        <BackCard kind={kind} fields={fields} profile={profile} />
      )}
    </svg>
  );
}

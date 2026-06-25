import type { Design, Profile } from "@/lib/types";
import { KIND_ACCENT } from "@/lib/templates";

/**
 * Server-side print HTML for a template design's front/back, sized for Lob's
 * 4x6 postcard (6.25in x 4.25in with bleed). Uploaded designs return null here
 * (their stored image URL is passed to Lob directly instead).
 *
 * Loads the design's real fonts from Google Fonts (Lob renders via headless
 * Chromium), so printed type is crisp and matches the in-app font choice.
 * The back leaves the right area clear for Lob's address block + QR.
 */

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );

// Map the design's font key to real families + the Google Fonts to load.
const PRINT_FONTS: Record<string, { display: string; body: string }> = {
  classic: { display: "'Playfair Display', Georgia, serif", body: "'Outfit', sans-serif" },
  modern: { display: "'Space Grotesk', sans-serif", body: "'Space Grotesk', sans-serif" },
  editorial: { display: "'Fraunces', Georgia, serif", body: "'Outfit', sans-serif" },
  geometric: { display: "'Outfit', sans-serif", body: "'Outfit', sans-serif" },
};
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap";

/** Equal Housing Opportunity mark (simplified, monochrome). */
const equalHousingSvg = (color: string) =>
  `<svg width="0.3in" height="0.3in" viewBox="0 0 100 100"><path d="M0 42 L50 0 L100 42 L84 42 L84 100 L16 100 L16 42 Z" fill="${color}"/><rect x="34" y="54" width="32" height="8" fill="#fff"/><rect x="34" y="70" width="32" height="8" fill="#fff"/></svg>`;

/** REALTOR® block-R mark (simplified, monochrome). */
const realtorSvg = (color: string) =>
  `<svg width="0.26in" height="0.3in" viewBox="0 0 84 100"><rect x="7" width="70" height="100" rx="6" fill="${color}"/><text x="42" y="80" text-anchor="middle" font-size="74" font-weight="800" fill="#fff" font-family="Helvetica,Arial">R</text></svg>`;

function doc(body: string, accent: string, fontKey: string): string {
  const f = PRINT_FONTS[fontKey] ?? PRINT_FONTS.editorial;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${FONTS_HREF}" rel="stylesheet"><style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; }
    * { box-sizing: border-box; }
    body { font-family: ${f.body}; color: #15181e; -webkit-font-smoothing: antialiased; }
    .card { position: relative; width: 6.25in; height: 4.25in; overflow: hidden; background: #fff; }
    .disp { font-family: ${f.display}; }
    .bg-accent { background: ${accent}; }
    .accent { color: ${accent}; }
  </style></head><body><div class="card">${body}</div></body></html>`;
}

export function postcardFrontHtml(design: Design): string | null {
  if (design.source !== "template" || !design.fields) return null;
  const f = design.fields;
  const fontKey = (f.font && f.font.trim()) || "editorial";
  const accent =
    (f.accent && f.accent.trim()) ||
    KIND_ACCENT[design.template_kind ?? "just_listed"];
  const badge =
    design.template_kind === "just_sold"
      ? "JUST SOLD"
      : design.template_kind === "open_house"
      ? "OPEN HOUSE"
      : design.template_kind === "coming_soon"
      ? "COMING SOON"
      : "JUST LISTED";
  const stats = [
    f.beds && `${esc(f.beds)} <span style="opacity:.6">bd</span>`,
    f.baths && `${esc(f.baths)} <span style="opacity:.6">ba</span>`,
    f.sqft && `${esc(f.sqft)} <span style="opacity:.6">sqft</span>`,
  ]
    .filter(Boolean)
    .join('<span style="opacity:.35;margin:0 0.1in">/</span>');

  // Full-height photo on the right; clean white content panel on the left.
  const PANEL = "2.95in";
  const photo = f.property_photo_url
    ? `<img src="${esc(f.property_photo_url)}" style="position:absolute;top:0;right:0;width:calc(6.25in - ${PANEL});height:100%;object-fit:cover" />`
    : `<div class="bg-accent" style="position:absolute;top:0;right:0;width:calc(6.25in - ${PANEL});height:100%;opacity:.16"></div>`;

  // Price / event accent block.
  const accentBlock =
    design.template_kind === "open_house"
      ? `<div style="margin-top:0.16in;border-left:4px solid ${accent};padding-left:0.14in">
           <div class="disp" style="font-size:17pt;font-weight:700;line-height:1.05">${esc(f.event_date) || "Date"}</div>
           <div style="font-size:10.5pt;color:#52525b;margin-top:2px">${esc(f.event_time) || "Time"}</div>
         </div>`
      : f.price
      ? `<div class="disp accent" style="margin-top:0.16in;font-size:27pt;font-weight:800;letter-spacing:-0.5px;line-height:1">${esc(f.price)}</div>`
      : "";

  const body = `
    ${photo}
    <div style="position:absolute;top:0;left:0;width:${PANEL};height:100%;background:#fff;padding:0.4in 0.34in 0.95in">
      <span class="bg-accent" style="display:inline-block;color:#fff;font-size:8.5pt;font-weight:700;letter-spacing:1.6px;padding:5px 11px;border-radius:999px">${badge}</span>
      <div class="disp" style="margin-top:0.18in;font-size:29pt;font-weight:800;letter-spacing:-1px;color:#12151c;line-height:0.98">${esc(f.headline) || badge}</div>
      ${f.subhead ? `<div style="margin-top:0.1in;font-size:11pt;color:#52525b;line-height:1.35">${esc(f.subhead)}</div>` : ""}
      ${accentBlock}
      ${stats ? `<div class="disp" style="margin-top:0.16in;font-size:12.5pt;font-weight:700;color:#27272a">${stats}</div>` : ""}
      ${f.property_address ? `<div style="margin-top:0.06in;font-size:9.5pt;color:#71717a">${esc(f.property_address)}</div>` : ""}
    </div>
    <div class="bg-accent" style="position:absolute;left:0;bottom:0;width:${PANEL};height:0.7in;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 0.34in">
      <div class="disp" style="font-size:11pt;font-weight:700;line-height:1.1">${esc(f.agent_name) || "Your name"}</div>
      <div style="font-size:8.5pt;opacity:.92;margin-top:1px">${[esc(f.agent_phone), esc(f.agent_email)].filter(Boolean).join("&nbsp;&nbsp;·&nbsp;&nbsp;")}</div>
    </div>`;
  return doc(body, accent, fontKey);
}

export function postcardBackHtml(design: Design, profile: Profile): string | null {
  if (design.source !== "template" || !design.fields) return null;
  const f = design.fields;
  const fontKey = (f.font && f.font.trim()) || "editorial";
  const accent =
    (f.accent && f.accent.trim()) ||
    KIND_ACCENT[design.template_kind ?? "just_listed"];
  // FROM: per-design override falls back to the profile.
  const ret = [
    f.return_name || profile.return_name,
    f.return_company || profile.company_name,
    f.return_line1 || profile.return_line1,
    [
      f.return_city || profile.return_city,
      f.return_state || profile.return_state,
      f.return_zip || profile.return_zip,
    ]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .map((l) => `<div>${esc(l)}</div>`)
    .join("");

  // Compliance: Equal Housing always; REALTOR® only for NAR members.
  const logos = `
    <div style="position:absolute;bottom:0.16in;left:0.4in;display:flex;align-items:flex-end;gap:0.12in">
      ${equalHousingSvg("#15181e")}
      ${f.nar_member === "yes" ? realtorSvg("#15181e") : ""}
    </div>`;

  // Left ~3.1in = message + return address. Right area stays clear for Lob's
  // address block + the QR code (added via the qr_code API param).
  const body = `
    <div class="bg-accent" style="position:absolute;top:0;left:0;right:0;height:0.16in"></div>
    <div style="position:absolute;top:0.5in;left:0.4in;width:3.1in">
      <div class="disp" style="font-size:16pt;font-weight:700;color:#12151c;line-height:1.1">${esc(f.subhead) || "A note for your neighbors"}</div>
      <div style="margin-top:0.12in;font-size:10.5pt;color:#3f3f46;line-height:1.45">${esc(f.body)}</div>
    </div>
    <div style="position:absolute;bottom:0.52in;left:0.4in;width:3.1in;font-size:8.5pt;color:#71717a;line-height:1.4">
      <div style="letter-spacing:1.2px;font-weight:700;color:#a1a1aa;margin-bottom:2px">FROM</div>
      ${ret}
    </div>
    ${logos}`;
  return doc(body, accent, fontKey);
}

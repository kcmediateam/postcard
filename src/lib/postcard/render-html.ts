import type { Design, Profile } from "@/lib/types";
import { KIND_ACCENT } from "@/lib/templates";

/**
 * Server-side print HTML for a template design's front/back, sized for Lob's
 * 4x6 postcard (6.25in x 4.25in with bleed). Uploaded designs return null here
 * (their stored image URL is passed to Lob directly instead).
 *
 * Editorial premium style: full-bleed photo with a cinematic scrim, copy set
 * over the art, a Fraunces display headline with an italic accent word, an
 * eyebrow + rule, and a warm mailing-side back. Loads real fonts from Google
 * Fonts (Lob renders via headless Chromium). The back keeps the right area
 * clear for Lob's address block + QR.
 */

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );

/** Italicize + accent the last word of a headline for an editorial lift. */
function headlineHtml(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return `<em>${esc(text)}</em>`;
  const last = words.pop() as string;
  return `${esc(words.join(" "))} <em>${esc(last)}</em>`;
}

const PRINT_FONTS: Record<string, { display: string; body: string }> = {
  classic: { display: "'Playfair Display', Georgia, serif", body: "'Inter', sans-serif" },
  modern: { display: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" },
  editorial: { display: "'Fraunces', Georgia, serif", body: "'Inter', sans-serif" },
  geometric: { display: "'Outfit', sans-serif", body: "'Inter', sans-serif" },
};
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,900;1,9..144,600;1,9..144,900&family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,800&family=Space+Grotesk:wght@500;600;700&display=swap";

/** Equal Housing Opportunity mark (simplified, monochrome). */
const equalHousingSvg = (color: string) =>
  `<svg width="0.28in" height="0.28in" viewBox="0 0 100 100"><path d="M0 42 L50 0 L100 42 L84 42 L84 100 L16 100 L16 42 Z" fill="${color}"/><rect x="34" y="54" width="32" height="8" fill="#fff"/><rect x="34" y="70" width="32" height="8" fill="#fff"/></svg>`;

/** REALTOR® block-R mark (simplified, monochrome). */
const realtorSvg = (color: string) =>
  `<svg width="0.24in" height="0.28in" viewBox="0 0 84 100"><rect x="7" width="70" height="100" rx="6" fill="${color}"/><text x="42" y="80" text-anchor="middle" font-size="74" font-weight="800" fill="#fff" font-family="Georgia,serif">R</text></svg>`;

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
  const eyebrow =
    design.template_kind === "just_sold"
      ? "Just Sold"
      : design.template_kind === "open_house"
      ? "Open House"
      : design.template_kind === "coming_soon"
      ? "Coming Soon"
      : design.template_kind === "market_update"
      ? "Market Update"
      : design.template_kind === "neighbor_intro"
      ? "Your Local Expert"
      : "Just Listed";

  const stats = [
    f.beds && `${esc(f.beds)} bd`,
    f.baths && `${esc(f.baths)} ba`,
    f.sqft && `${esc(f.sqft)} sqft`,
  ]
    .filter(Boolean)
    .join('<span style="opacity:.5;margin:0 8px">·</span>');

  // Full-bleed art (the property photo) with a cinematic left scrim.
  const scene = f.property_photo_url
    ? `<img src="${esc(f.property_photo_url)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />`
    : `<div style="position:absolute;inset:0;background:linear-gradient(120deg, ${accent} 0%, #12152e 90%)"></div>`;

  const priceOrEvent =
    design.template_kind === "open_house"
      ? `${f.event_date ? `<span class="disp" style="font-size:15pt;font-weight:700">${esc(f.event_date)}</span>` : ""}${f.event_time ? `<span style="font-size:10.5pt;opacity:.85;margin-left:10px">${esc(f.event_time)}</span>` : ""}`
      : f.price
      ? `<span class="disp accent-chip" style="display:inline-block;background:${accent};color:#fff;font-weight:800;font-size:15pt;padding:6px 16px;border-radius:999px">${esc(f.price)}</span>`
      : "";

  const body = `
    ${scene}
    <div style="position:absolute;inset:0;background:linear-gradient(100deg, rgba(11,12,30,.84) 0%, rgba(11,12,30,.55) 34%, rgba(11,12,30,0) 64%)"></div>

    <div style="position:absolute;left:0.5in;top:0.5in;bottom:0.5in;width:3.7in;display:flex;flex-direction:column;justify-content:center;color:#FFF8EC">
      <div style="font-size:8.5pt;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:#FFE9B0">${eyebrow}</div>
      <div class="disp" style="margin-top:0.14in;font-size:34pt;font-weight:900;line-height:0.98;letter-spacing:-.5px;text-shadow:0 2px 18px rgba(0,0,0,.4)">${headlineHtml(f.headline || eyebrow)}</div>
      <style>.disp em{font-style:italic;font-weight:600;color:${accent === "#ffffff" ? "#FFD874" : "#FFD874"}}</style>
      <div style="width:54px;height:3px;background:#FFD874;border-radius:3px;margin:0.18in 0 0.14in"></div>
      ${f.subhead ? `<div style="font-size:10.5pt;line-height:1.45;max-width:3.2in;color:#fbeede;text-shadow:0 1px 8px rgba(0,0,0,.45)">${esc(f.subhead)}</div>` : ""}
      ${priceOrEvent ? `<div style="margin-top:0.2in">${priceOrEvent}</div>` : ""}
      ${stats ? `<div style="margin-top:0.12in;font-size:10pt;font-weight:600;color:#fbeede">${stats}</div>` : ""}
      ${f.property_address ? `<div style="margin-top:0.04in;font-size:9pt;color:#e7dccb;opacity:.85">${esc(f.property_address)}</div>` : ""}
    </div>

    <div style="position:absolute;left:0.5in;bottom:0.34in;color:#FFF8EC">
      <span class="disp" style="font-size:10.5pt;font-weight:700">${esc(f.agent_name) || "Your name"}</span>
      <span style="font-size:8.5pt;opacity:.85;margin-left:10px">${[esc(f.agent_phone), esc(f.agent_email)].filter(Boolean).join("&nbsp;&nbsp;·&nbsp;&nbsp;")}</span>
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

  const brand = f.return_company || profile.company_name || "";
  const ret = [
    f.return_name || profile.return_name,
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

  const logos = `
    <div style="display:flex;align-items:flex-end;gap:0.12in;margin-top:0.16in">
      ${equalHousingSvg("#2B2540")}
      ${f.nar_member === "yes" ? realtorSvg("#2B2540") : ""}
    </div>`;

  // Warm paper. Left ~3.2in = brand + message + FROM. Right area stays clear
  // for Lob's address block + QR (added via the qr_code API param).
  const body = `
    <div style="position:absolute;inset:0;background:#FBF6EC"></div>
    <div class="bg-accent" style="position:absolute;top:0;left:0;right:0;height:0.14in"></div>
    <div style="position:absolute;top:0.46in;left:0.42in;width:3.2in;color:#2B2540">
      ${brand ? `<div class="disp" style="font-size:12pt;font-weight:700;letter-spacing:.02em">${esc(brand)}</div>` : ""}
      <div class="accent" style="font-size:8pt;font-weight:700;letter-spacing:.24em;text-transform:uppercase;margin-top:0.14in">${esc(f.subhead) ? "A note for you" : "Hello, neighbor"}</div>
      <div class="disp" style="font-size:19pt;font-weight:900;line-height:1.04;letter-spacing:-.3px;margin-top:0.06in">${headlineHtml(f.subhead || f.headline || "Let’s talk")}</div>
      <style>.disp em{font-style:italic;font-weight:600;color:${accent}}</style>
      <div style="margin-top:0.12in;font-size:10pt;line-height:1.5;color:#4a4360;max-width:3.0in">${esc(f.body)}</div>
    </div>
    <div style="position:absolute;bottom:0.42in;left:0.42in;width:3.0in;font-size:8.5pt;color:#8a8071;line-height:1.45">
      <div style="letter-spacing:1.2px;font-weight:700;color:#b3a890;margin-bottom:2px">FROM</div>
      ${ret}
      ${logos}
    </div>`;
  return doc(body, accent, fontKey);
}

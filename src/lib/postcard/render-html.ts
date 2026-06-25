import type { Design, Profile } from "@/lib/types";
import { KIND_ACCENT } from "@/lib/templates";

/**
 * Server-side print HTML for a template design's front/back, sized for Lob's
 * 4x6 postcard (6.25in x 4.25in with bleed). Uploaded designs return null here
 * (their stored image URL is passed to Lob directly instead).
 *
 * Multiple premium layouts, chosen by `fields.layout`:
 *   - "editorial" (default): copy over a full-bleed photo with a cinematic scrim
 *   - "banner": high-impact full-bleed photo with a huge headline + brand bar
 *   - "service": colored header, framed photo, headline + checklist (home-services)
 *
 * Loads real fonts from Google Fonts (Lob renders via headless Chromium). The
 * back keeps the right area clear for Lob's address block + QR.
 */

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );

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
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@600;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,900;1,9..144,600;1,9..144,900&family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,800&family=Space+Grotesk:wght@500;600;700&display=swap";

const equalHousingSvg = (color: string) =>
  `<svg width="0.28in" height="0.28in" viewBox="0 0 100 100"><path d="M0 42 L50 0 L100 42 L84 42 L84 100 L16 100 L16 42 Z" fill="${color}"/><rect x="34" y="54" width="32" height="8" fill="#fff"/><rect x="34" y="70" width="32" height="8" fill="#fff"/></svg>`;
const realtorSvg = (color: string) =>
  `<svg width="0.24in" height="0.28in" viewBox="0 0 84 100"><rect x="7" width="70" height="100" rx="6" fill="${color}"/><text x="42" y="80" text-anchor="middle" font-size="74" font-weight="800" fill="#fff" font-family="Georgia,serif">R</text></svg>`;
const checkSvg = (color: string) =>
  `<svg width="0.2in" height="0.2in" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="${color}" stroke-width="2"/><path d="M7 12.5l3 3 7-7" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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
    .disp em { font-style: italic; font-weight: 600; color: ${accent}; }
    .bg-accent { background: ${accent}; }
    .accent { color: ${accent}; }
  </style></head><body><div class="card">${body}</div></body></html>`;
}

function sceneOrAccent(url: string | null | undefined, accent: string): string {
  return url
    ? `<img src="${esc(url)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />`
    : `<div style="position:absolute;inset:0;background:linear-gradient(120deg, ${accent} 0%, #12152e 90%)"></div>`;
}

function eyebrowFor(design: Design): string {
  switch (design.template_kind) {
    case "just_sold": return "Just Sold";
    case "open_house": return "Open House";
    case "coming_soon": return "Coming Soon";
    case "market_update": return "Market Update";
    case "neighbor_intro": return "Your Local Expert";
    default: return "Just Listed";
  }
}

// ── FRONT LAYOUTS ────────────────────────────────────────────────────────

function frontEditorial(design: Design, accent: string): string {
  const f = design.fields!;
  const eyebrow = eyebrowFor(design);
  const stats = [f.beds && `${esc(f.beds)} bd`, f.baths && `${esc(f.baths)} ba`, f.sqft && `${esc(f.sqft)} sqft`]
    .filter(Boolean).join('<span style="opacity:.5;margin:0 8px">·</span>');
  const priceOrEvent =
    design.template_kind === "open_house"
      ? `${f.event_date ? `<span class="disp" style="font-size:15pt;font-weight:700">${esc(f.event_date)}</span>` : ""}${f.event_time ? `<span style="font-size:10.5pt;opacity:.85;margin-left:10px">${esc(f.event_time)}</span>` : ""}`
      : f.price
      ? `<span class="disp" style="display:inline-block;background:${accent};color:#fff;font-weight:800;font-size:15pt;padding:6px 16px;border-radius:999px">${esc(f.price)}</span>`
      : "";
  return `
    ${sceneOrAccent(f.property_photo_url, accent)}
    <div style="position:absolute;inset:0;background:linear-gradient(100deg, rgba(11,12,30,.84) 0%, rgba(11,12,30,.55) 34%, rgba(11,12,30,0) 64%)"></div>
    <div style="position:absolute;left:0.5in;top:0.5in;bottom:0.5in;width:3.7in;display:flex;flex-direction:column;justify-content:center;color:#FFF8EC">
      <div style="font-size:8.5pt;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:#FFE9B0">${eyebrow}</div>
      <div class="disp" style="margin-top:0.14in;font-size:34pt;font-weight:900;line-height:0.98;letter-spacing:-.5px;text-shadow:0 2px 18px rgba(0,0,0,.4)">${headlineHtml(f.headline || eyebrow)}</div>
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
}

function frontBanner(design: Design, accent: string): string {
  const f = design.fields!;
  const eyebrow = eyebrowFor(design);
  const brand = f.return_company || f.agent_name || "";
  const sub = f.property_address || f.subhead || "";
  return `
    ${sceneOrAccent(f.property_photo_url, accent)}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(8,10,22,.34) 0%, rgba(8,10,22,.18) 45%, rgba(8,10,22,.72) 100%)"></div>
    <div style="position:absolute;inset:0.18in;border:2px solid rgba(255,255,255,.85);pointer-events:none"></div>
    <div style="position:absolute;left:0.5in;right:0.5in;top:50%;transform:translateY(-58%);text-align:center;color:#fff">
      <div style="font-size:9pt;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:${accent === "#ffffff" ? "#FFD874" : "#FFD874"};margin-bottom:0.1in">${eyebrow}</div>
      <div style="font-family:'Anton',sans-serif;font-size:54pt;line-height:0.9;letter-spacing:1px;text-transform:uppercase;text-shadow:0 3px 24px rgba(0,0,0,.5)">${esc(f.headline || eyebrow)}</div>
      ${sub ? `<div style="margin-top:0.16in;font-size:10pt;font-weight:600;letter-spacing:.18em;text-transform:uppercase">${esc(sub)}</div>` : ""}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:0.62in;display:flex;align-items:center;justify-content:center;background:rgba(8,10,22,.55)">
      <span class="disp" style="color:#fff;font-size:12pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${esc(brand) || "Your Company"}</span>
    </div>`;
}

function frontService(design: Design, accent: string): string {
  const f = design.fields!;
  const brand = f.return_company || f.agent_name || "Your Company";
  const items = (f.features || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  const list = items.length
    ? items
        .map(
          (it) =>
            `<div style="display:flex;align-items:center;gap:0.12in;margin-bottom:0.11in">${checkSvg(accent)}<span style="font-size:10.5pt;font-weight:600;color:#1f2933">${esc(it)}</span></div>`
        )
        .join("")
    : "";
  const contact = [esc(f.agent_phone), esc(f.property_address)].filter(Boolean).join("&nbsp;&nbsp;·&nbsp;&nbsp;");
  return `
    <div class="bg-accent" style="position:absolute;top:0;left:0;right:0;height:0.66in;display:flex;align-items:center;justify-content:space-between;padding:0 0.4in;color:#fff">
      <span style="font-size:8.5pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase;opacity:.85">${eyebrowFor(design)}</span>
      <span class="disp" style="font-size:13pt;font-weight:800;letter-spacing:.02em">${esc(brand)}</span>
    </div>
    <div style="position:absolute;top:0.66in;left:0;width:2.9in;bottom:0;padding:0.3in 0.28in">
      <div style="width:100%;height:100%;border:5px solid #fff;box-shadow:0 8px 22px rgba(0,0,0,.18);overflow:hidden;position:relative">
        ${sceneOrAccent(f.property_photo_url, accent)}
      </div>
    </div>
    <div style="position:absolute;top:0.66in;right:0;left:2.9in;bottom:0;padding:0.34in 0.4in 0.3in 0.1in">
      <div class="disp accent" style="font-size:25pt;font-weight:800;line-height:0.98;letter-spacing:-.5px">${esc(f.headline) || "Professional Service"}</div>
      ${f.subhead ? `<div style="margin-top:0.1in;font-size:9.5pt;line-height:1.5;color:#52606d">${esc(f.subhead)}</div>` : ""}
      ${list ? `<div class="disp accent" style="margin-top:0.18in;margin-bottom:0.12in;font-size:11pt;font-weight:800;letter-spacing:.02em">What we provide:</div>${list}` : ""}
      ${contact ? `<div style="position:absolute;bottom:0.28in;font-size:9pt;font-weight:600;color:#1f2933">${contact}</div>` : ""}
    </div>`;
}

const FRONTS: Record<string, (d: Design, a: string) => string> = {
  editorial: frontEditorial,
  banner: frontBanner,
  service: frontService,
};

export function postcardFrontHtml(design: Design): string | null {
  if (design.source !== "template" || !design.fields) return null;
  const f = design.fields;
  const fontKey = (f.font && f.font.trim()) || "editorial";
  const accent = (f.accent && f.accent.trim()) || KIND_ACCENT[design.template_kind ?? "just_listed"];
  const layout = (f.layout && f.layout.trim()) || "editorial";
  const render = FRONTS[layout] ?? frontEditorial;
  return doc(render(design, accent), accent, fontKey);
}

export function postcardBackHtml(design: Design, profile: Profile): string | null {
  if (design.source !== "template" || !design.fields) return null;
  const f = design.fields;
  const fontKey = (f.font && f.font.trim()) || "editorial";
  const accent = (f.accent && f.accent.trim()) || KIND_ACCENT[design.template_kind ?? "just_listed"];

  const brand = f.return_company || profile.company_name || "";
  const ret = [
    f.return_name || profile.return_name,
    f.return_line1 || profile.return_line1,
    [f.return_city || profile.return_city, f.return_state || profile.return_state, f.return_zip || profile.return_zip]
      .filter(Boolean).join(", "),
  ].filter(Boolean).map((l) => `<div>${esc(l)}</div>`).join("");

  const logos = `
    <div style="display:flex;align-items:flex-end;gap:0.12in;margin-top:0.16in">
      ${equalHousingSvg("#2B2540")}
      ${f.nar_member === "yes" ? realtorSvg("#2B2540") : ""}
    </div>`;

  const body = `
    <div style="position:absolute;inset:0;background:#FBF6EC"></div>
    <div class="bg-accent" style="position:absolute;top:0;left:0;right:0;height:0.14in"></div>
    <div style="position:absolute;top:0.46in;left:0.42in;width:3.2in;color:#2B2540">
      ${brand ? `<div class="disp" style="font-size:12pt;font-weight:700;letter-spacing:.02em">${esc(brand)}</div>` : ""}
      <div class="accent" style="font-size:8pt;font-weight:700;letter-spacing:.24em;text-transform:uppercase;margin-top:0.14in">A note for you</div>
      <div class="disp" style="font-size:19pt;font-weight:900;line-height:1.04;letter-spacing:-.3px;margin-top:0.06in">${headlineHtml(f.subhead || f.headline || "Let’s talk")}</div>
      <div style="margin-top:0.12in;font-size:10pt;line-height:1.5;color:#4a4360;max-width:3.0in">${esc(f.body)}</div>
    </div>
    <div style="position:absolute;bottom:0.42in;left:0.42in;width:3.0in;font-size:8.5pt;color:#8a8071;line-height:1.45">
      <div style="letter-spacing:1.2px;font-weight:700;color:#b3a890;margin-bottom:2px">FROM</div>
      ${ret}
      ${logos}
    </div>`;
  return doc(body, accent, fontKey);
}

import type { Design, Profile } from "@/lib/types";
import { KIND_ACCENT } from "@/lib/templates";

/**
 * Server-side print HTML for a template design's front/back, sized for Lob's
 * 4x6 postcard (6.25in x 4.25in with bleed). Uploaded designs return null here
 * (their stored image URL is passed to Lob directly instead).
 *
 * The back leaves the bottom-right area clear for Lob's address block + QR.
 */

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );

function doc(body: string, accent: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; }
    * { box-sizing: border-box; font-family: Helvetica, Arial, sans-serif; }
    .card { position: relative; width: 6.25in; height: 4.25in; overflow: hidden; background: #fff; }
    .accent { color: ${accent}; }
    .bg-accent { background: ${accent}; }
  </style></head><body><div class="card">${body}</div></body></html>`;
}

export function postcardFrontHtml(design: Design): string | null {
  if (design.source !== "template" || !design.fields) return null;
  const f = design.fields;
  const accent = KIND_ACCENT[design.template_kind ?? "just_listed"];
  const badge =
    design.template_kind === "just_sold"
      ? "JUST SOLD"
      : design.template_kind === "open_house"
      ? "OPEN HOUSE"
      : "JUST LISTED";
  const stats = [f.beds && `${esc(f.beds)} bd`, f.baths && `${esc(f.baths)} ba`, f.sqft && `${esc(f.sqft)} sqft`]
    .filter(Boolean)
    .join("&nbsp;&nbsp;·&nbsp;&nbsp;");

  const photo = f.property_photo_url
    ? `<img src="${esc(f.property_photo_url)}" style="position:absolute;top:0.35in;right:0.35in;width:2.6in;height:${design.template_kind === "open_house" ? "2.0in" : "2.7in"};object-fit:cover;border-radius:0.12in" />`
    : "";

  const event =
    design.template_kind === "open_house"
      ? `<div style="margin-top:0.18in;border-left:3px solid ${accent};padding-left:0.12in">
           <div style="font-size:15pt;font-weight:800;color:#15181e">${esc(f.event_date) || "Date"}</div>
           <div style="font-size:11pt;color:#52525b">${esc(f.event_time) || "Time"}</div>
         </div>`
      : f.price
      ? `<div style="margin-top:0.18in;font-size:22pt;font-weight:800;color:#15181e">${esc(f.price)}</div>`
      : "";

  const body = `
    ${photo}
    <div style="position:absolute;top:0.35in;left:0.35in;width:3.0in">
      <span class="bg-accent" style="display:inline-block;color:#fff;font-size:9pt;font-weight:700;letter-spacing:1.5px;padding:4px 10px;border-radius:999px">${badge}</span>
      <div style="margin-top:0.14in;font-size:30pt;font-weight:800;letter-spacing:-1px;color:#15181e;line-height:1.02">${esc(f.headline) || badge}</div>
      <div style="margin-top:0.08in;font-size:11pt;color:#52525b">${esc(f.subhead)}</div>
      ${event}
      ${stats ? `<div style="margin-top:0.12in;font-size:11pt;font-weight:600;color:#3f3f46">${stats}</div>` : ""}
      ${f.property_address ? `<div style="margin-top:0.04in;font-size:10pt;color:#71717a">${esc(f.property_address)}</div>` : ""}
    </div>
    <div class="bg-accent" style="position:absolute;left:0;right:0;bottom:0;height:0.62in;color:#fff;display:flex;align-items:center;padding:0 0.35in">
      <div style="font-size:10pt;font-weight:700">${esc(f.agent_name) || "Your name"}</div>
      <div style="margin-left:0.18in;font-size:9pt;opacity:.9">${[esc(f.agent_phone), esc(f.agent_email)].filter(Boolean).join("&nbsp;·&nbsp;")}</div>
    </div>`;
  return doc(body, accent);
}

export function postcardBackHtml(design: Design, profile: Profile): string | null {
  if (design.source !== "template" || !design.fields) return null;
  const f = design.fields;
  const accent = KIND_ACCENT[design.template_kind ?? "just_listed"];
  const ret = [
    profile.return_name,
    profile.company_name,
    profile.return_line1,
    [profile.return_city, profile.return_state, profile.return_zip].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .map((l) => `<div>${esc(l)}</div>`)
    .join("");

  // Left half = message + return address. Right half left clear for Lob's
  // address block + the QR code (added via the qr_code API param).
  const body = `
    <div class="bg-accent" style="position:absolute;top:0;left:0;right:0;height:0.14in"></div>
    <div style="position:absolute;top:0.45in;left:0.4in;width:3.0in">
      <div style="font-size:14pt;font-weight:700;color:#15181e">${esc(f.subhead) || "A note for your neighbors"}</div>
      <div style="margin-top:0.1in;font-size:10.5pt;color:#3f3f46;line-height:1.4">${esc(f.body)}</div>
    </div>
    <div style="position:absolute;bottom:0.4in;left:0.4in;width:3.0in;font-size:8.5pt;color:#71717a">
      <div style="letter-spacing:1px;font-weight:700;color:#a1a1aa">FROM</div>
      ${ret}
    </div>`;
  return doc(body, accent);
}

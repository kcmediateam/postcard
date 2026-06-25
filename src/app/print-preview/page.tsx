import type { Metadata } from "next";
import { postcardFrontHtml, postcardBackHtml } from "@/lib/postcard/render-html";
import { emptyFields } from "@/lib/templates";
import type { Design, Profile, TemplateKind } from "@/lib/types";

// Unlisted QA page — see exactly what the printed template HTML looks like at
// true 4x6 size, without sending real mail.
export const metadata: Metadata = {
  title: "Print preview",
  robots: { index: false, follow: false },
};

const HOUSE =
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1000&q=80";

const profile = {
  id: "demo",
  email: "agent@example.com",
  full_name: "Jordan Avery",
  company_name: "Avery Realty Group",
  return_name: "Jordan Avery",
  return_line1: "1200 Market St, Suite 400",
  return_line2: null,
  return_city: "Overland Park",
  return_state: "KS",
  return_zip: "66061",
  stripe_customer_id: null,
  is_admin: false,
  created_at: "",
} as Profile;

function sample(
  name: string,
  kind: TemplateKind,
  overrides: Partial<ReturnType<typeof emptyFields>>
): Design {
  return {
    id: name,
    profile_id: "demo",
    name,
    source: "template",
    front_image_url: null,
    back_image_url: null,
    template_id: kind,
    template_kind: kind,
    fields: { ...emptyFields(), ...overrides },
    created_at: "",
  } as Design;
}

const SAMPLES: Design[] = [
  sample("Just Listed · Editorial", "just_listed", {
    accent: "#4F46E5",
    font: "editorial",
    headline: "Just hit the market",
    subhead: "A standout home in your neighborhood",
    price: "$439,000",
    beds: "4",
    baths: "3",
    sqft: "2,480",
    property_address: "118 Maple Ridge Dr",
    property_photo_url: HOUSE,
    agent_name: "Jordan Avery",
    agent_phone: "(913) 555-0142",
    agent_email: "jordan@averyrealty.com",
    body: "A beautiful new home just hit the market nearby. Curious what your home is worth today? Scan the code for a free, no-pressure estimate.",
  }),
  sample("Open House · Modern", "open_house", {
    accent: "#E8324A",
    font: "modern",
    headline: "Open House this Saturday",
    subhead: "Come tour this beautiful home in person",
    event_date: "Sat, July 12",
    event_time: "1:00 – 4:00 PM",
    beds: "3",
    baths: "2",
    sqft: "1,940",
    property_address: "27 Birch Hollow Ln",
    property_photo_url: HOUSE,
    agent_name: "Jordan Avery",
    agent_phone: "(913) 555-0142",
    agent_email: "jordan@averyrealty.com",
    body: "Tour the home, meet the neighbors, and see if it's the right fit. Refreshments provided.",
  }),
  sample("Just Sold · Classic", "just_sold", {
    accent: "#0F766E",
    font: "classic",
    headline: "Another one sold nearby",
    subhead: "Thinking of making a move?",
    price: "Sold in 6 days",
    property_address: "84 Cedar Court",
    property_photo_url: HOUSE,
    agent_name: "Jordan Avery",
    agent_phone: "(913) 555-0142",
    agent_email: "jordan@averyrealty.com",
    nar_member: "yes",
    body: "I just helped a neighbor sell. Want to know what your home could sell for? The estimate is on me.",
  }),
];

export default function PrintPreviewPage() {
  return (
    <div className="min-h-screen bg-zinc-200 p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">
        Printed template preview — true 4×6 size
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        This is exactly the HTML Lob prints (front + back). No mail is sent.
      </p>
      <div className="space-y-10">
        {SAMPLES.map((d) => (
          <div key={d.id}>
            <div className="mb-2 text-sm font-semibold text-zinc-700">
              {d.name}
            </div>
            <div className="flex flex-wrap gap-5">
              <iframe
                title={`${d.name} front`}
                srcDoc={postcardFrontHtml(d) ?? ""}
                style={{ width: "6.25in", height: "4.25in" }}
                className="rounded-md bg-white shadow-lg ring-1 ring-black/10"
              />
              <iframe
                title={`${d.name} back`}
                srcDoc={postcardBackHtml(d, profile) ?? ""}
                style={{ width: "6.25in", height: "4.25in" }}
                className="rounded-md bg-white shadow-lg ring-1 ring-black/10"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

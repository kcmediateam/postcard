import type { Design, DesignFields, DesignTheme, Template, TemplateKind } from "./types";

/** Default accent per kind (templates can override via `accent`). */
export const KIND_ACCENT: Record<TemplateKind, string> = {
  just_listed: "#2249c9",
  just_sold: "#0f766e",
  coming_soon: "#0ea5a4",
  open_house: "#b45309",
  market_update: "#3a63e6",
  neighbor_intro: "#9a7b4f",
};

export const KIND_LABEL: Record<TemplateKind, string> = {
  just_listed: "Just Listed",
  just_sold: "Just Sold",
  coming_soon: "Coming Soon",
  open_house: "Open House",
  market_update: "Market Update",
  neighbor_intro: "Meet Your Neighbor",
};

/** A blank field set — every personalize form starts from this. */
export function emptyFields(): DesignFields {
  return {
    headline: "",
    subhead: "",
    body: "",
    cta: "",
    property_photo_url: null,
    property_photo_url_2: null,
    property_photo_url_3: null,
    headshot_url: null,
    logo_url: null,
    testimonial: "",
    testimonial_author: "",
    price: "",
    beds: "",
    baths: "",
    sqft: "",
    property_address: "",
    event_date: "",
    event_time: "",
    agent_name: "",
    agent_phone: "",
    agent_email: "",
  };
}

export const TEMPLATES: Template[] = [
  {
    id: "tpl_just_listed",
    name: "Just Listed",
    kind: "just_listed",
    theme: "light",
    accent: "#2249c9",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Just Listed",
      subhead: "New on the market in your neighborhood",
      body: "A beautiful new home just hit the market nearby. Curious what your home is worth in today's market? Reach out for a free, no-pressure estimate.",
      cta: "Scan for the full listing",
      price: "$749,000",
      beds: "4",
      baths: "3",
      sqft: "2,450",
      property_address: "123 Maple Avenue",
      agent_name: "Jordan Avery",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_just_sold_luxe",
    name: "Just Sold · Luxe",
    kind: "just_sold",
    theme: "dark",
    accent: "#caa14a",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "I have just SOLD",
      subhead: "your neighbor's house!",
      body: "Another home sold in your neighborhood. Thinking of making a move? Let's talk about what yours could fetch.",
      cta: "Scan for a free estimate",
      price: "$1,286,000",
      beds: "4",
      baths: "3",
      sqft: "2,965",
      property_address: "7652 West Ave",
      agent_name: "Sonia Black",
      agent_phone: "(415) 555-0199",
    },
  },
  {
    id: "tpl_just_sold",
    name: "Just Sold",
    kind: "just_sold",
    theme: "light",
    accent: "#0f766e",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Just Sold",
      subhead: "Another happy homeowner nearby",
      body: "I just helped a neighbor sell. Want to know what your home could sell for? The estimate is on me.",
      cta: "Scan for a free home estimate",
      price: "$812,000",
      beds: "3",
      baths: "2",
      sqft: "1,980",
      property_address: "456 Oak Street",
      agent_name: "Jordan Avery",
      agent_phone: "(512) 555-0142",
      testimonial: "Great agent. We sold our house in less than a month — everything went extremely well!",
      testimonial_author: "John, Client",
    },
  },
  {
    id: "tpl_coming_soon",
    name: "Coming Soon",
    kind: "coming_soon",
    theme: "bold",
    accent: "#0ea5a4",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Coming Soon",
      subhead: "A new listing is about to hit your street",
      body: "Get the first look before it's public. Scan to be notified the moment it goes live.",
      cta: "Scan for early access",
      price: "",
      beds: "4",
      baths: "2.5",
      sqft: "2,300",
      property_address: "Your neighborhood",
      agent_name: "Jordan Avery",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_open_house",
    name: "Open House",
    kind: "open_house",
    theme: "light",
    accent: "#b45309",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Open House",
      subhead: "You're invited — stop by this weekend",
      body: "Tour the home, meet the neighbors, and see if it's the right fit. Refreshments provided.",
      cta: "Scan to RSVP",
      price: "$695,000",
      beds: "4",
      baths: "2.5",
      sqft: "2,200",
      property_address: "789 Birch Lane",
      event_date: "Saturday, June 14",
      event_time: "1:00 – 4:00 PM",
      agent_name: "Jordan Avery",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_market_update",
    name: "Market Update",
    kind: "market_update",
    theme: "light",
    accent: "#3a63e6",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Your Neighborhood Market Update",
      subhead: "Here's what's happening on your street",
      body: "Homes near you are moving fast. Inventory is tight and well-priced listings are getting multiple offers. Curious what that means for your home's value?",
      cta: "Scan for your home's value",
      price: "",
      agent_name: "Jordan Avery",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_neighbor_intro",
    name: "Meet Your Neighbor",
    kind: "neighbor_intro",
    theme: "light",
    accent: "#9a7b4f",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Hi, I'm your neighbor",
      subhead: "and a local real estate agent",
      body: "You might have seen me around the neighborhood. I know this area inside and out — from HOA rules to what homes are really selling for. If you ever have a question or want a home evaluation, I hope you'll reach out!",
      cta: "Scan to say hello",
      agent_name: "Jordan Avery",
      agent_phone: "(512) 555-0142",
    },
  },
];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Resolve theme + accent + kind for a saved design (falls back sensibly). */
export function resolveStyle(design: Design): {
  kind: TemplateKind;
  theme: DesignTheme;
  accent: string;
} {
  const kind = design.template_kind ?? "just_listed";
  const tpl = design.template_id ? findTemplate(design.template_id) : undefined;
  return {
    kind,
    theme: tpl?.theme ?? "light",
    accent: tpl?.accent ?? KIND_ACCENT[kind],
  };
}

import type {
  Design,
  DesignFields,
  DesignTheme,
  PostcardLayout,
  Template,
  TemplateKind,
} from "./types";

/** Default front layout per kind (a template can override via `layout`). */
export const DEFAULT_LAYOUT: Record<TemplateKind, PostcardLayout> = {
  just_listed: "showcase",
  just_sold: "showcase",
  coming_soon: "showcase",
  open_house: "showcase",
  market_update: "showcase",
  neighbor_intro: "intro",
};

/** Resolve the front layout for a (template, kind) pair. */
export function layoutFor(
  tpl: Template | undefined,
  kind: TemplateKind
): PostcardLayout {
  return tpl?.layout ?? DEFAULT_LAYOUT[kind];
}

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
    accent: "",
    font: "",
    qr_url: "",
    return_name: "",
    return_company: "",
    return_line1: "",
    return_city: "",
    return_state: "",
    return_zip: "",
    nar_member: "",
    features: "",
  };
}

/**
 * Font pairings offered in the editor. Values reference the next/font CSS
 * variables loaded in the root layout. Empty/unknown → DEFAULT_FONT.
 */
export const FONTS: Record<
  string,
  { label: string; display: string; body: string }
> = {
  classic: { label: "Classic", display: "var(--font-serif)", body: "var(--font-outfit)" },
  modern: { label: "Modern", display: "var(--font-grotesk)", body: "var(--font-grotesk)" },
  editorial: { label: "Editorial", display: "var(--font-fraunces)", body: "var(--font-outfit)" },
  geometric: { label: "Geometric", display: "var(--font-outfit)", body: "var(--font-outfit)" },
};
export const DEFAULT_FONT = "classic";

/** Accent-color swatches offered in the editor (plus a custom picker). */
export const ACCENT_PRESETS = [
  "#4a7bf7",
  "#2ec4b6",
  "#6c3ce1",
  "#0f766e",
  "#2249c9",
  "#b45309",
  "#e11d48",
  "#9a7b4f",
  "#111114",
];

export const TEMPLATES: Template[] = [
  {
    id: "tpl_new_listing",
    name: "New Listing · Photo",
    kind: "just_listed",
    theme: "light",
    accent: "#2b2f3a",
    layout: "photo_banner",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "New Listing",
      subhead: "Just listed in your neighborhood",
      body: "A beautiful new home just hit the market nearby. Curious what your home is worth in today's market? Scan the code or reach out for a free, no-pressure estimate.",
      cta: "Scan for the full listing",
      price: "$239,000",
      property_address: "123 Anywhere St., Any City, ST 12345",
      agent_name: "Jordan Avery",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_newly_listed",
    name: "Newly Listed · Triptych",
    kind: "just_listed",
    theme: "light",
    accent: "#1f242e",
    layout: "triptych",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Newly Listed",
      subhead: "Just listed in your neighborhood",
      body: "This one won't last long. Scan the code for photos, details, and a private showing.",
      cta: "Scan for the full listing",
      property_address: "123 Anywhere St., Any City, ST 12345",
      features:
        "2,100 square feet\nlisted at $524,000\n2 bedroom / 2 bath\nhuge outdoor patio\nbrand new appliances\nwalk-in closets",
      agent_name: "Jordan Avery",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_summary",
    name: "Listing Summary · Blush",
    kind: "just_listed",
    theme: "light",
    accent: "#b08968",
    layout: "summary",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Summary",
      subhead: "A beautiful home, just listed",
      body: "Take a look at the highlights below, then scan the code for the full gallery and details.",
      cta: "Scan for full details",
      features:
        "4 Bedrooms\n3 Bathrooms\n4,256 sqft\nBuilt in 2017\nMountain view\nIn-ground pool\nCentral air\nFreehold",
      agent_name: "Olivia Wilson",
      agent_phone: "(512) 555-0142",
      agent_email: "hello@yoursite.com",
    },
  },
  {
    id: "tpl_aerial",
    name: "We Help You · Aerial",
    kind: "neighbor_intro",
    theme: "light",
    accent: "#2b2f3a",
    layout: "aerial",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "We help you find a home",
      subhead: "Your local brokerage",
      body: "Thinking of buying or selling in the area? Let's find the right one together. Scan the code to start.",
      cta: "Scan to get started",
      agent_name: "Beautiful Homes Realty",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_open_house",
    name: "Open House · Triptych",
    kind: "open_house",
    theme: "light",
    accent: "#e7d6cd",
    layout: "open_house",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Open House",
      subhead: "You're invited",
      body: "Come tour this beautiful home in person. Refreshments provided — bring your questions and a friend. We'd love to see you there.",
      cta: "Scan for details",
      beds: "3",
      baths: "4",
      sqft: "2,895",
      property_address: "123 Anywhere St., Any City, ST",
      event_date: "Sat Jan 3rd",
      event_time: "1–3 PM",
      agent_name: "Olivia Wilson",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_get_in_touch",
    name: "Get in Touch · Badge",
    kind: "neighbor_intro",
    theme: "light",
    accent: "#e7d6cd",
    layout: "badge",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Get in Touch",
      subhead: "Thinking of making a move?",
      body: "Whether you're buying, selling, or just curious about your home's value, I'd love to help. Reach out anytime.",
      cta: "Scan to connect",
      agent_name: "Olivia Wilson",
      agent_phone: "(512) 555-0142",
      agent_email: "hello@yoursite.com",
    },
  },
  {
    id: "tpl_elegant_split",
    name: "Buy or Sell · Elegant",
    kind: "neighbor_intro",
    theme: "light",
    accent: "#9a7b4f",
    layout: "elegant_split",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Looking to buy or sell your home?",
      subhead: "Let's turn your dreams into reality.",
      body: "Whether you're ready to make a move or just curious what your home is worth today, I'd love to help. Reach out anytime for a free, no-pressure consultation.",
      cta: "Scan to start the conversation",
      agent_name: "Kimberly Nguyen",
      agent_phone: "(512) 555-0142",
    },
  },
  {
    id: "tpl_just_listed",
    name: "Just Listed",
    kind: "just_listed",
    theme: "light",
    accent: "#2249c9",
    active: false,
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
    active: false,
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
    active: false,
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
    active: false,
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
    theme: "bold",
    accent: "#b45309",
    active: false,
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
    theme: "bold",
    accent: "#3a63e6",
    active: false,
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
    active: false,
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
  layout: PostcardLayout;
  font: string;
} {
  const kind = design.template_kind ?? "just_listed";
  const tpl = design.template_id ? findTemplate(design.template_id) : undefined;
  const overrideAccent = design.fields?.accent?.trim();
  const overrideFont = design.fields?.font?.trim();
  return {
    kind,
    theme: tpl?.theme ?? "light",
    accent: overrideAccent || tpl?.accent || KIND_ACCENT[kind],
    layout: layoutFor(tpl, kind),
    font: overrideFont && FONTS[overrideFont] ? overrideFont : DEFAULT_FONT,
  };
}

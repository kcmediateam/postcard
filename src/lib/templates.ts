import type { DesignFields, Template, TemplateKind } from "./types";

/** Brand accent per template kind (used by the SVG layouts). */
export const KIND_ACCENT: Record<TemplateKind, string> = {
  just_listed: "#2249c9",
  just_sold: "#0f766e",
  open_house: "#b45309",
};

export const KIND_LABEL: Record<TemplateKind, string> = {
  just_listed: "Just Listed",
  just_sold: "Just Sold",
  open_house: "Open House",
};

/** A blank field set — every personalize form starts from this. */
export function emptyFields(): DesignFields {
  return {
    headline: "",
    subhead: "",
    body: "",
    cta: "",
    property_photo_url: null,
    headshot_url: null,
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

/** Built-in templates with sample copy to prefill the form. */
export const TEMPLATES: Template[] = [
  {
    id: "tpl_just_listed",
    name: "Just Listed",
    kind: "just_listed",
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
    },
  },
  {
    id: "tpl_just_sold",
    name: "Just Sold",
    kind: "just_sold",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Just Sold",
      subhead: "Another home sold in your neighborhood",
      body: "I just helped a neighbor sell their home. Thinking about making a move? Let's talk about what yours could fetch — the estimate is on me.",
      cta: "Scan for a free home estimate",
      price: "$812,000",
      beds: "3",
      baths: "2",
      sqft: "1,980",
      property_address: "456 Oak Street",
    },
  },
  {
    id: "tpl_open_house",
    name: "Open House",
    kind: "open_house",
    active: true,
    defaults: {
      ...emptyFields(),
      headline: "Open House",
      subhead: "You're invited — stop by this weekend",
      body: "Tour the home, meet the neighbors, and see if it's the right fit. Refreshments provided. Can't make it? Scan to schedule a private showing.",
      cta: "Scan to RSVP",
      price: "$695,000",
      beds: "4",
      baths: "2.5",
      sqft: "2,200",
      property_address: "789 Birch Lane",
      event_date: "Saturday, June 14",
      event_time: "1:00 – 4:00 PM",
    },
  },
];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

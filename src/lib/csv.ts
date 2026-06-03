import type { NewContactInput } from "./data/provider";

/** Minimal CSV parser: handles quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // drop fully-empty rows
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Map many header spellings onto our fields.
const HEADER_ALIASES: Record<keyof NewContactInput, string[]> = {
  full_name: ["fullname", "name", "recipient", "contact", "contactname"],
  address_line1: ["addressline1", "address1", "address", "line1", "street", "street1"],
  address_line2: ["addressline2", "address2", "line2", "apt", "unit", "suite"],
  city: ["city", "town"],
  state: ["state", "st", "province", "region"],
  zip: ["zip", "zipcode", "postalcode", "postal", "zip5"],
};

export interface ParsedContacts {
  contacts: NewContactInput[];
  totalRows: number;
  skipped: number; // rows dropped for missing required fields
  /** field -> the CSV header it matched (for the mapping summary) */
  mapping: Partial<Record<keyof NewContactInput, string>>;
  unmappedRequired: (keyof NewContactInput)[];
}

const REQUIRED: (keyof NewContactInput)[] = [
  "full_name",
  "address_line1",
  "city",
  "state",
  "zip",
];

export function parseContactsCsv(text: string): ParsedContacts {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return {
      contacts: [],
      totalRows: 0,
      skipped: 0,
      mapping: {},
      unmappedRequired: REQUIRED,
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const colIndex = {} as Partial<Record<keyof NewContactInput, number>>;
  const mapping: ParsedContacts["mapping"] = {};

  (Object.keys(HEADER_ALIASES) as (keyof NewContactInput)[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field];
    const idx = headers.findIndex(
      (h) => h === normalizeHeader(field) || aliases.includes(h)
    );
    if (idx !== -1) {
      colIndex[field] = idx;
      mapping[field] = rows[0][idx];
    }
  });

  const unmappedRequired = REQUIRED.filter((f) => colIndex[f] === undefined);

  const contacts: NewContactInput[] = [];
  let skipped = 0;
  const dataRows = rows.slice(1);

  for (const r of dataRows) {
    const get = (f: keyof NewContactInput): string => {
      const idx = colIndex[f];
      return idx === undefined ? "" : (r[idx] ?? "").trim();
    };
    const contact: NewContactInput = {
      full_name: get("full_name"),
      address_line1: get("address_line1"),
      address_line2: get("address_line2") || null,
      city: get("city"),
      state: get("state").toUpperCase(),
      zip: get("zip"),
    };
    const missingRequired = REQUIRED.some((f) => !String(contact[f] ?? "").trim());
    if (missingRequired) {
      skipped++;
      continue;
    }
    contacts.push(contact);
  }

  return {
    contacts,
    totalRows: dataRows.length,
    skipped,
    mapping,
    unmappedRequired,
  };
}

// NOTE: Lob TEST keys don't verify real addresses — they return canned results
// driven by `address_line1` ("deliverable" / "undeliverable") with zip "11111".
// This sample uses those triggers so the upload -> verify flow yields a realistic
// mix in test mode. Swap in real addresses once you're on a Lob LIVE key.
export const SAMPLE_CSV = `full_name,address_line1,address_line2,city,state,zip
Maria Lopez,deliverable,,Austin,TX,11111
Sam Chen,deliverable,,Round Rock,TX,11111
Priya Patel,deliverable,,Austin,TX,11111
Alex Rivera,undeliverable,,Austin,TX,11111
`;

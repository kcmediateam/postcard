import type {
  Campaign,
  Contact,
  ContactList,
  CreditTransaction,
  CreditWallet,
  Design,
  MailPiece,
  Profile,
  Scan,
  Subscription,
} from "@/lib/types";

/** Mock-only credential record (never part of the real domain model). */
export interface MockCredential {
  user_id: string;
  email: string;
  password: string; // plaintext — MOCK ONLY, never how the real backend works
}

/** The entire mock database. Mirrors the SPEC §4 tables, plus mock auth. */
export interface MockDB {
  profiles: Profile[];
  wallets: CreditWallet[];
  transactions: CreditTransaction[];
  subscriptions: Subscription[];
  designs: Design[];
  contact_lists: ContactList[];
  contacts: Contact[];
  campaigns: Campaign[];
  mail_pieces: MailPiece[];
  scans: Scan[];

  // mock auth
  credentials: MockCredential[];
  current_user_id: string | null;
}

const STORAGE_KEY = "postcard.mockdb.v2";

/** URL-safe-ish unique id. */
export function uid(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ---- seed ----------------------------------------------------------------

/**
 * A demo agent so you can log in immediately to review screens.
 *   email:    agent@demo.com
 *   password: password
 */
function seed(): MockDB {
  const demoUserId = "user_demo";
  const createdAt = "2026-01-15T17:00:00.000Z";

  const demoProfile: Profile = {
    id: demoUserId,
    email: "agent@demo.com",
    full_name: "Jordan Avery",
    company_name: "Avery Realty Group",
    return_name: "Jordan Avery",
    return_line1: "120 Market St",
    return_line2: "Suite 300",
    return_city: "Austin",
    return_state: "TX",
    return_zip: "78701",
    stripe_customer_id: "cus_mock_demo",
    is_admin: true,
    created_at: createdAt,
  };

  const demoWallet: CreditWallet = {
    id: "wallet_demo",
    profile_id: demoUserId,
    balance: 250,
    updated_at: createdAt,
  };

  const demoTxns: CreditTransaction[] = [
    {
      id: "txn_seed_1",
      profile_id: demoUserId,
      delta: 500,
      reason: "purchase",
      reference_id: "cs_mock_seed",
      created_at: createdAt,
    },
    {
      id: "txn_seed_2",
      profile_id: demoUserId,
      delta: -250,
      reason: "campaign_send",
      reference_id: "camp_seed_1",
      created_at: "2026-02-02T18:30:00.000Z",
    },
  ];

  return {
    profiles: [demoProfile],
    wallets: [demoWallet],
    transactions: demoTxns,
    subscriptions: [],
    designs: [],
    contact_lists: [],
    contacts: [],
    campaigns: [],
    mail_pieces: [],
    scans: [],
    credentials: [
      { user_id: demoUserId, email: "agent@demo.com", password: "password" },
    ],
    current_user_id: null,
  };
}

// ---- persistence ---------------------------------------------------------

let cache: MockDB | null = null;

/** Load the mock DB (from localStorage in the browser, else a fresh seed). */
export function loadDB(): MockDB {
  if (cache) return cache;

  if (typeof window === "undefined") {
    // SSR / server render: ephemeral seed, never persisted.
    cache = seed();
    return cache;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as MockDB;
    } else {
      cache = seed();
      persist();
    }
  } catch {
    cache = seed();
  }
  return cache;
}

/** Write the current DB back to localStorage (no-op on the server). */
export function persist(): void {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota / serialization errors in the mock
  }
}

/** Reset to a fresh seed — handy while reviewing the UI. */
export function resetDB(): void {
  cache = seed();
  persist();
}

/**
 * Bridge for the Supabase provider during the incremental migration: point the
 * mock store's "current user" at the real auth uid so the not-yet-migrated
 * mock methods (wallet/designs/contacts/campaigns) operate on that user.
 */
export function setCurrentUser(userId: string | null): void {
  const db = loadDB();
  db.current_user_id = userId;
  persist();
}

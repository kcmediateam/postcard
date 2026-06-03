import type { DataProvider } from "./provider";
import { mockProvider } from "./mock/mock-provider";

/**
 * The active data provider.
 *
 * Today: always the in-memory mock. Later, when a Supabase-backed provider
 * exists, switch on NEXT_PUBLIC_DATA_PROVIDER here — components import `db`
 * and never know which one they got.
 */
function selectProvider(): DataProvider {
  // const which = process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock";
  // if (which === "supabase") return supabaseProvider; // not built yet
  return mockProvider;
}

export const db: DataProvider = selectProvider();

export type { DataProvider } from "./provider";
export { AuthError, InsufficientCreditsError } from "./provider";

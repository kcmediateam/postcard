import type { DataProvider } from "./provider";
import { mockProvider } from "./mock/mock-provider";
import { supabaseProvider } from "./supabase/supabase-provider";

/**
 * The active data provider. Components import `db` and never know which one
 * they got. Switched via NEXT_PUBLIC_DATA_PROVIDER:
 *   - "mock"     → fully in-memory (default)
 *   - "supabase" → real Supabase Auth + profiles; everything else still mock
 *                  (Milestone 2 — other slices migrate in later milestones)
 */
function selectProvider(): DataProvider {
  const which = process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock";
  if (which === "supabase") return supabaseProvider;
  return mockProvider;
}

export const db: DataProvider = selectProvider();

export type { DataProvider } from "./provider";
export { AuthError, InsufficientCreditsError } from "./provider";

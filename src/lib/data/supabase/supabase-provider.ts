import type { Profile, Session } from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";
import { AuthError, type DataProvider, type SignUpInput } from "../provider";
import { mockProvider } from "../mock/mock-provider";
import { setCurrentUser } from "../mock/store";

/**
 * Milestone 2 provider: real Supabase Auth + profiles, with every other method
 * still delegated to the mock (keyed by the real auth uid) until its own
 * milestone migrates it. Activated via NEXT_PUBLIC_DATA_PROVIDER=supabase.
 */

const PROFILE_COLUMNS =
  "id, email, full_name, company_name, return_name, return_line1, return_line2, return_city, return_state, return_zip, stripe_customer_id, created_at";

type ProfileRow = Record<string, unknown>;

function mapProfile(row: ProfileRow): Profile {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    full_name: (row.full_name as string) ?? null,
    company_name: (row.company_name as string) ?? null,
    return_name: (row.return_name as string) ?? null,
    return_line1: (row.return_line1 as string) ?? null,
    return_line2: (row.return_line2 as string) ?? null,
    return_city: (row.return_city as string) ?? null,
    return_state: (row.return_state as string) ?? null,
    return_zip: (row.return_zip as string) ?? null,
    stripe_customer_id: (row.stripe_customer_id as string) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

async function fetchProfile(userId: string): Promise<Profile> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new AuthError(error.message);
  if (!data) {
    throw new AuthError(
      "Profile row not found. Did you run supabase/schema.sql (creates the profiles table + signup trigger)?"
    );
  }
  return mapProfile(data as ProfileRow);
}

/** Keep the mock's "current user" in sync so delegated methods work. */
function adopt(userId: string | null) {
  setCurrentUser(userId);
}

export const supabaseProvider: DataProvider = {
  // everything not overridden below is still the mock implementation,
  // operating on whatever user `adopt()` last set.
  ...mockProvider,

  async signUp(input: SignUpInput): Promise<Session> {
    const supabase = getSupabase();
    const email = input.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { full_name: input.full_name?.trim() || null } },
    });
    if (error) throw new AuthError(error.message);
    if (!data.session || !data.user) {
      // happens if email confirmation is still enabled
      throw new AuthError(
        "Account created, but no session returned. Disable 'Confirm email' in Supabase Auth settings for dev, or confirm via email."
      );
    }
    adopt(data.user.id);
    const profile = await fetchProfile(data.user.id);
    return { user: { id: data.user.id, email: data.user.email ?? email }, profile };
  },

  async signIn(email: string, password: string): Promise<Session> {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new AuthError(error.message);
    if (!data.user) throw new AuthError("Sign in failed.");
    adopt(data.user.id);
    const profile = await fetchProfile(data.user.id);
    return {
      user: { id: data.user.id, email: data.user.email ?? email },
      profile,
    };
  },

  async signOut(): Promise<void> {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    adopt(null);
  },

  async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) {
      adopt(null);
      return null;
    }
    adopt(session.user.id);
    const profile = await fetchProfile(session.user.id);
    return {
      user: { id: session.user.id, email: session.user.email ?? "" },
      profile,
    };
  },

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new AuthError("Not signed in.");

    // only allow profile columns; never let id/email/created_at be patched
    const allowed: (keyof Profile)[] = [
      "full_name",
      "company_name",
      "return_name",
      "return_line1",
      "return_line2",
      "return_city",
      "return_state",
      "return_zip",
      "stripe_customer_id",
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in patch) update[key] = patch[key];
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw new AuthError(error.message);
    return mapProfile(data as ProfileRow);
  },
};

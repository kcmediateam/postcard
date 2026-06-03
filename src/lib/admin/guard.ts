import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Returns the signed-in user iff they are an admin (profiles.is_admin), else
 * null. Admin status is read under the user's own RLS (own row).
 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return data?.is_admin ? user : null;
}

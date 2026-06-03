import { createServerSupabase } from "@/lib/supabase/server";
import { isConnected } from "@/lib/canva/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ connected: await isConnected(user.id) });
}

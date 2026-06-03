import { createServerSupabase } from "@/lib/supabase/server";
import { getAccessToken, listDesigns } from "@/lib/canva/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const token = await getAccessToken(user.id);
  if (!token) return Response.json({ error: "not_connected" }, { status: 409 });

  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  try {
    const designs = await listDesigns(token, q);
    return Response.json({ designs });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "canva_error" },
      { status: 502 }
    );
  }
}

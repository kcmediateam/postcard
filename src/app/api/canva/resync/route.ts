import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getAccessToken, exportDesignPngUrls } from "@/lib/canva/server";

export const runtime = "nodejs";

async function uploadToStorage(uid: string, url: string, label: string): Promise<string> {
  const admin = getAdminSupabase();
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  const path = `${uid}/canva-${Date.now()}-${label}-${Math.random().toString(36).slice(2, 8)}.png`;
  const { error } = await admin.storage
    .from("designs")
    .upload(path, bytes, { contentType: "image/png", upsert: false });
  if (error) throw new Error(`upload failed: ${error.message}`);
  return admin.storage.from("designs").getPublicUrl(path).data.publicUrl;
}

/**
 * Re-pull the latest artwork for a Canva-imported design and update it IN PLACE
 * (no duplicate). The Canva design id is parsed from the stored edit URL.
 */
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return Response.json({ error: "missing_design" }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: design } = await admin
    .from("designs")
    .select("id, template_id, external_edit_url, profile_id")
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!design) return Response.json({ error: "not_found" }, { status: 404 });

  // The Canva design id is stored in template_id at import. A real Canva id has
  // no dots; if it's missing (older import) ask them to re-import once.
  const stored: string | null = design.template_id ?? null;
  const canvaId =
    stored && !stored.includes(".") && stored.trim() ? stored.trim() : null;
  if (!canvaId) {
    return Response.json(
      { error: "Re-import this design once to enable re-sync." },
      { status: 400 }
    );
  }

  const token = await getAccessToken(user.id);
  if (!token) return Response.json({ error: "not_connected" }, { status: 409 });

  let pages: string[];
  try {
    pages = await exportDesignPngUrls(token, canvaId);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "export_failed" },
      { status: 502 }
    );
  }
  if (pages.length === 0) {
    return Response.json({ error: "no_pages" }, { status: 502 });
  }

  const front = await uploadToStorage(user.id, pages[0], "front");
  const back = await uploadToStorage(user.id, pages[1] ?? pages[0], "back");

  const { data, error } = await admin
    .from("designs")
    .update({ front_image_url: front, back_image_url: back })
    .eq("id", id)
    .eq("profile_id", user.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, design: data });
}

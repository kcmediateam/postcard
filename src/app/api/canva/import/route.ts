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

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { designId, title, editUrl } = await req.json().catch(() => ({}));
  if (!designId) return Response.json({ error: "missing_design" }, { status: 400 });

  const token = await getAccessToken(user.id);
  if (!token) return Response.json({ error: "not_connected" }, { status: 409 });

  let pages: string[];
  try {
    pages = await exportDesignPngUrls(token, designId);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "export_failed" },
      { status: 502 }
    );
  }
  if (pages.length === 0) {
    return Response.json({ error: "no_pages" }, { status: 502 });
  }

  // page 1 -> front, page 2 -> back (fallback to front if single-page)
  const front = await uploadToStorage(user.id, pages[0], "front");
  const back = await uploadToStorage(user.id, pages[1] ?? pages[0], "back");

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("designs")
    .insert({
      profile_id: user.id,
      name: (title as string)?.trim() || "Canva import",
      source: "uploaded",
      front_image_url: front,
      back_image_url: back,
      template_id: null,
      template_kind: null,
      fields: null,
      external_edit_url: typeof editUrl === "string" ? editUrl : null,
    })
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ design: data, pages: pages.length });
}

import { getAdminUser } from "@/lib/admin/guard";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Managed ("build my list for me") orders awaiting an uploaded address list. */
export async function GET() {
  if (!(await getAdminUser())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("campaigns")
    .select(
      "id, name, target_area, requested_quantity, credit_cost, created_at, profiles(email, full_name), designs(name)"
    )
    .eq("status", "awaiting_list")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const requests = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const p = row.profiles as { email?: string; full_name?: string } | null;
    const d = row.designs as { name?: string } | null;
    return {
      id: row.id,
      name: row.name,
      target_area: row.target_area,
      requested_quantity: row.requested_quantity,
      credit_cost: row.credit_cost,
      created_at: row.created_at,
      agent_email: p?.email ?? "—",
      agent_name: p?.full_name ?? null,
      design_name: d?.name ?? "—",
    };
  });
  return Response.json({ requests });
}

import { getAdminUser } from "@/lib/admin/guard";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** All campaigns across all agents (admin only). */
export async function GET() {
  if (!(await getAdminUser())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("campaigns")
    .select(
      "id, name, status, audience_tier, piece_count, credit_cost, created_at, scheduled_at, profiles(email, full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const p = row.profiles as { email?: string; full_name?: string } | null;
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      audience_tier: row.audience_tier,
      piece_count: row.piece_count,
      credit_cost: row.credit_cost,
      created_at: row.created_at,
      scheduled_at: row.scheduled_at,
      agent_email: p?.email ?? "—",
      agent_name: p?.full_name ?? null,
    };
  });
  return Response.json({ orders });
}

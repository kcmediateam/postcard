import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SubStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

function mapStatus(stripeStatus: string, deleted: boolean): SubStatus {
  if (deleted) return "canceled";
  const allowed: SubStatus[] = ["active", "trialing", "past_due", "canceled", "incomplete"];
  return (allowed as string[]).includes(stripeStatus)
    ? (stripeStatus as SubStatus)
    : stripeStatus === "unpaid"
    ? "past_due"
    : stripeStatus === "incomplete_expired"
    ? "incomplete"
    : "active";
}

function toIso(unix: number | null | undefined): string {
  return unix ? new Date(unix * 1000).toISOString() : new Date().toISOString();
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whsec) {
    return new Response("Missing signature / STRIPE_WEBHOOK_SECRET", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whsec);
  } catch (err) {
    return new Response(
      `Webhook signature verification failed: ${err instanceof Error ? err.message : "error"}`,
      { status: 400 }
    );
  }

  const admin = getAdminSupabase();

  // Append a ledger row once per unique reference (idempotent across retries).
  async function grant(profileId: string, delta: number, reason: string, reference: string) {
    const { data: existing } = await admin
      .from("credit_transactions")
      .select("id")
      .eq("reference_id", reference)
      .limit(1)
      .maybeSingle();
    if (existing) return;
    await admin.from("credit_transactions").insert({
      profile_id: profileId,
      delta,
      reason,
      reference_id: reference,
    });
  }

  async function upsertSubscription(sub: Stripe.Subscription, deleted = false) {
    const meta = sub.metadata ?? {};
    const profileId = meta.profile_id;
    if (!profileId) return;
    // period fields have moved across API versions — read defensively.
    const anySub = sub as unknown as Record<string, unknown>;
    const item = sub.items?.data?.[0] as unknown as Record<string, unknown> | undefined;
    const start = (anySub.current_period_start ?? item?.current_period_start) as number | undefined;
    const end = (anySub.current_period_end ?? item?.current_period_end) as number | undefined;

    const row = {
      profile_id: profileId,
      stripe_subscription_id: sub.id,
      plan: meta.plan_id ?? sub.items?.data?.[0]?.price?.id ?? "unknown",
      status: mapStatus(sub.status, deleted),
      current_period_start: toIso(start),
      current_period_end: toIso(end),
      monthly_credit_grant: Number(meta.monthly_credits ?? 0),
    };

    const { data: existing } = await admin
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", sub.id)
      .limit(1)
      .maybeSingle();
    if (existing) {
      await admin.from("subscriptions").update(row).eq("id", (existing as { id: string }).id);
    } else {
      await admin.from("subscriptions").insert(row);
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      // one-time credit packs grant here; subscriptions grant via invoice.paid
      if (s.mode === "payment" && s.metadata?.kind === "credits" && s.metadata.profile_id) {
        await grant(
          s.metadata.profile_id,
          Number(s.metadata.credits ?? 0),
          "purchase",
          s.id
        );
      }
      break;
    }

    case "invoice.paid": {
      const inv = event.data.object as unknown as Record<string, unknown>;
      const subId =
        (inv.subscription as string | undefined) ??
        ((inv.parent as Record<string, unknown> | undefined)?.subscription_details as
          | Record<string, unknown>
          | undefined)?.subscription as string | undefined;
      if (subId) {
        const sub = await getStripe().subscriptions.retrieve(subId);
        const pid = sub.metadata?.profile_id;
        const credits = Number(sub.metadata?.monthly_credits ?? 0);
        if (pid && credits > 0) {
          // one grant per invoice (first month + each renewal)
          await grant(pid, credits, "subscription_grant", String(inv.id));
        }
        await upsertSubscription(sub);
      }
      break;
    }

    case "customer.subscription.updated": {
      await upsertSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    case "customer.subscription.deleted": {
      await upsertSubscription(event.data.object as Stripe.Subscription, true);
      break;
    }
  }

  return Response.json({ received: true });
}

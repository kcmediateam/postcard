import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { authorizeUrl, makePkce } from "@/lib/canva/server";

export const runtime = "nodejs";

export async function GET() {
  const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const { verifier, challenge } = makePkce();
  const state = crypto.randomBytes(16).toString("hex");

  const res = NextResponse.redirect(authorizeUrl(state, challenge));
  const opts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("canva_state", state, opts);
  res.cookies.set("canva_verifier", verifier, opts);
  return res;
}

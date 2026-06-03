import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { exchangeCode, saveConnection } from "@/lib/canva/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(`${appUrl}/designs?canva=error&reason=${reason}`);

  if (oauthError) return fail(oauthError);

  const savedState = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)canva_state=([^;]+)/)?.[1];
  const verifier = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)canva_verifier=([^;]+)/)?.[1];

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return fail("bad_state");
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  try {
    const tokens = await exchangeCode(code, decodeURIComponent(verifier));
    await saveConnection(user.id, tokens);
  } catch {
    return fail("exchange_failed");
  }

  const res = NextResponse.redirect(`${appUrl}/designs?canva=connected`);
  res.cookies.delete("canva_state");
  res.cookies.delete("canva_verifier");
  return res;
}

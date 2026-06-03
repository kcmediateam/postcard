import crypto from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";

/**
 * Canva Connect (export-only) helpers: OAuth (PKCE), token storage/refresh, and
 * the few REST calls we need (list designs, export a design). Server only.
 */

const AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const API = "https://api.canva.com/rest/v1";

export const CANVA_SCOPES = "design:meta:read design:content:read profile:read";

function clientId() {
  const v = process.env.CANVA_CLIENT_ID;
  if (!v) throw new Error("CANVA_CLIENT_ID not set");
  return v;
}
function clientSecret() {
  const v = process.env.CANVA_CLIENT_SECRET;
  if (!v) throw new Error("CANVA_CLIENT_SECRET not set");
  return v;
}
export function redirectUri() {
  const base = process.env.APP_URL ?? "http://127.0.0.1:3000";
  return `${base}/api/canva/callback`;
}

// ---- PKCE ----------------------------------------------------------------

export function makePkce() {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function authorizeUrl(state: string, challenge: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: CANVA_SCOPES,
    code_challenge: challenge,
    code_challenge_method: "s256",
    state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

// ---- token exchange / refresh -------------------------------------------

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

function basicAuth() {
  return "Basic " + Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64");
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error_description || json?.error || `token request failed (${res.status})`);
  }
  return json as TokenResponse;
}

export async function exchangeCode(code: string, verifier: string) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri(),
  });
}

// ---- token storage -------------------------------------------------------

export async function saveConnection(profileId: string, t: TokenResponse) {
  const admin = getAdminSupabase();
  const expires_at = new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString();
  await admin.from("canva_connections").upsert({
    profile_id: profileId,
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? null,
    expires_at,
    scopes: t.scope ?? CANVA_SCOPES,
    updated_at: new Date().toISOString(),
  });
}

export async function isConnected(profileId: string): Promise<boolean> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("canva_connections")
    .select("profile_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  return Boolean(data);
}

/** Valid access token for the user, refreshing if expired. Null if not connected. */
export async function getAccessToken(profileId: string): Promise<string | null> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("canva_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) return null;
  const row = data as { access_token: string; refresh_token: string | null; expires_at: string | null };

  const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : true;
  if (!expired) return row.access_token;
  if (!row.refresh_token) return row.access_token; // best effort

  const refreshed = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
  });
  await saveConnection(profileId, refreshed);
  return refreshed.access_token;
}

// ---- Canva REST ----------------------------------------------------------

export interface CanvaDesign {
  id: string;
  title: string;
  thumbnail: string | null;
  editUrl: string | null;
}

export async function listDesigns(accessToken: string): Promise<CanvaDesign[]> {
  const res = await fetch(`${API}/designs?limit=30`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `list designs failed (${res.status})`);
  return (json.items ?? []).map((d: Record<string, unknown>) => ({
    id: String(d.id),
    title: (d.title as string) || "Untitled design",
    thumbnail: (d.thumbnail as { url?: string } | undefined)?.url ?? null,
    editUrl: (d.urls as { edit_url?: string } | undefined)?.edit_url ?? null,
  }));
}

/** Export a design to PNG and return one URL per page. */
export async function exportDesignPngUrls(accessToken: string, designId: string): Promise<string[]> {
  const create = await fetch(`${API}/exports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, format: { type: "png" } }),
  });
  const created = await create.json().catch(() => ({}));
  if (!create.ok) throw new Error(created?.message || `export failed (${create.status})`);
  let job = created.job;

  // poll until success/failed (~30s max)
  for (let i = 0; i < 20 && job?.status === "in_progress"; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(`${API}/exports/${job.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const pj = await poll.json().catch(() => ({}));
    if (!poll.ok) throw new Error(pj?.message || "export poll failed");
    job = pj.job;
  }
  if (job?.status !== "success") throw new Error("Canva export did not complete");
  return (job.urls ?? []) as string[];
}

import crypto from "node:crypto";

/**
 * Signed, unguessable share tokens for public campaign tracking links.
 * token = `${campaignId}.${HMAC(campaignId)}` — no DB column needed; the
 * signature can only be produced server-side with the secret.
 */
function shareSecret(): string {
  return process.env.SHARE_SECRET || process.env.CRON_SECRET || "";
}

export function signCampaignToken(campaignId: string): string {
  const sig = crypto
    .createHmac("sha256", shareSecret())
    .update(campaignId)
    .digest("base64url");
  return `${campaignId}.${sig}`;
}

/** Returns the campaignId if the token is valid, else null. */
export function verifyCampaignToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const campaignId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", shareSecret())
    .update(campaignId)
    .digest("base64url");
  try {
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return campaignId;
    }
  } catch {
    // length mismatch etc.
  }
  return null;
}

/** Compose a QR destination URL with UTM tags (skips empty values). */
export function buildTrackedUrl(
  base: string,
  utm: { source: string; medium: string; campaign: string }
): string {
  const b = base.trim();
  if (!b) return "";
  let url: URL;
  try {
    url = new URL(b.includes("://") ? b : `https://${b}`);
  } catch {
    return b;
  }
  const map: Record<string, string> = {
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v.trim()) url.searchParams.set(k, v.trim());
  }
  return url.toString();
}

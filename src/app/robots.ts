import type { MetadataRoute } from "next";

const SITE_URL = "https://radiatepost.com";

/**
 * Public marketing pages are crawlable; the authenticated app and API
 * routes are not. Points crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/onboarding",
        "/dashboard",
        "/designs",
        "/contacts",
        "/campaigns",
        "/billing",
        "/admin",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

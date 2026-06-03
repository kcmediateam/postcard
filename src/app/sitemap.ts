import type { MetadataRoute } from "next";

const SITE_URL = "https://radiatepost.com";

/** Public marketing pages only — the app lives behind auth. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/services", "/products", "/pricing", "/contact"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}

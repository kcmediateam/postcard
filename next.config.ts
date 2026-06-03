import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Canonical host: 301 www → apex so search engines index one URL.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.radiatepost.com" }],
        destination: "https://radiatepost.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Hanken_Grotesk,
  Outfit,
  Geist_Mono,
  Playfair_Display,
  Fraunces,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { DataProviderClient } from "@/lib/data/data-context";

// Brand fonts: Bricolage Grotesque (display) + Hanken Grotesk (body/UI).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://radiatepost.com";
const TITLE = "Radiate — tracked direct mail for local marketing";
const DESCRIPTION =
  "Design, mail, and measure postcard campaigns — for local businesses, real-estate agents, and home-service pros. Verified addresses, QR scan tracking, and honest per-piece pricing. Self-service or done-for-you. No minimums, no markup.";

// Structured data (JSON-LD) for richer search results.
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Radiate",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description: DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Radiate",
    url: SITE_URL,
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Radiate direct mail",
    serviceType: "Direct mail marketing",
    provider: { "@type": "Organization", name: "Radiate", url: SITE_URL },
    areaServed: "US",
    description:
      "Tracked, QR-coded postcard campaigns with USPS address verification and per-piece pricing — for any local or direct-to-mailbox marketing.",
  },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Radiate",
  },
  description: DESCRIPTION,
  applicationName: "Radiate",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Radiate",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${outfit.variable} ${playfair.variable} ${fraunces.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <DataProviderClient>{children}</DataProviderClient>
      </body>
    </html>
  );
}

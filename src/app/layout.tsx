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
const TITLE = "Radiate — targeted direct mail, done for you";
const DESCRIPTION =
  "Design, mail, and measure postcard campaigns for real estate agents. Verified addresses, QR scan tracking, and per-piece pricing — self-service or full-service.";

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
        <DataProviderClient>{children}</DataProviderClient>
      </body>
    </html>
  );
}

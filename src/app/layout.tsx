import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DataProviderClient } from "@/lib/data/data-context";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radiate — targeted direct mail, done for you",
  description:
    "Design, mail, and measure postcard campaigns for real estate agents. Verified addresses, QR scan tracking, and per-piece pricing — self-service or full-service.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DataProviderClient>{children}</DataProviderClient>
      </body>
    </html>
  );
}

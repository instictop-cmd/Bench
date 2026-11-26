import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Press_Start_2P, VT323 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const press = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press",
  display: "swap",
});

const vt = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bench-sepia.vercel.app";

const title = "Bench — learn AI by doing";
const description =
  "A pixel lab where complete beginners learn to actually use AI. Wake a small machine, solve real quests, and learn to verify what it says. Free, no account.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s — Bench" },
  description,
  applicationName: "Bench",
  authors: [{ name: "Bench" }],
  keywords: [
    "learn AI",
    "AI for beginners",
    "AI literacy",
    "prompt engineering",
    "AI lab",
    "college students",
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Bench",
    title,
    description,
    url: "/",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060a09",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${press.variable} ${vt.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

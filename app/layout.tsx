import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["800"], style: ["italic"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "SaqBot: The 5-Star Cheat Code",
  description: "Plan every perps trade like a heist. Practice runs, getaway routes and 5-star event alerts.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SaqBot", statusBarStyle: "black" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121a0f",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Reading headers renders each page per request, so every page gets the CSP nonce from middleware.ts.
  await headers();
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <Providers>
          <div className="app">{children}</div>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"] });

export const metadata: Metadata = {
  // Vercel deployments resolve this automatically; elsewhere set SITE_URL for social previews.
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  title: "Game Library",
  description: "Every game I have played, am playing and want to play, synced live from Notion.",
};

export const viewport: Viewport = {
  themeColor: "#08080c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <noscript>
          <style>{".intro{display:none!important}.reveal{opacity:1!important;translate:none!important}"}</style>
        </noscript>
      </body>
    </html>
  );
}

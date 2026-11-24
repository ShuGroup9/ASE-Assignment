import type { Metadata } from "next";
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { themeScript } from "@/components/layout/theme";

// No page caching; every page is server-rendered per request, nothing is pre-rendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "EngageTrack 2.0",
    template: "%s | EngageTrack 2.0" },
  description: "Service for education sector; tracking individual contributions to a group software projects.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Per-request CSP nonce from src/proxy.ts; inline scripts without it are blocked.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // The theme script changes data-bs-theme before React hydrates.
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell productName="EngageTrack 2.0" actions={<button className="btn btn-outline-primary">Sign In</button>}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}

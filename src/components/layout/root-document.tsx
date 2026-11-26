/**
 * @file src/components/layout/root-document.tsx
 * @description Shared <html>/<body> document for every root layout ((public), (app), (internal)/admin).
 *              Owns the global stylesheets and the pre-hydration theme script so each route group gets them.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Shared
 */

import React from "react";
import { headers } from "next/headers";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/app/globals.css";
import { themeScript } from "./theme";

export default async function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  // Per-request CSP nonce from src/proxy.ts; inline scripts without it are blocked.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // The theme script changes data-bs-theme before React hydrates.
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

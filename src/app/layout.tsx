import type { Metadata } from "next";
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

// No page caching; every page is server-rendered per request, nothing is pre-rendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "ASE Assignment", template: "%s | ASE Assignment" },
  description: "DESC HERE",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="visually-hidden-focusable" href="#main">
          Skip to main content
        </a>
        <main id="main" className="container py-4">
          {children}
        </main>
      </body>
    </html>
  );
}

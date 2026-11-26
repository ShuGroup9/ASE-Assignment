/**
 * @file src/app/(public)/layout.tsx
 * @description Layout for signed-out pages; brand header only.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 */

import type { Metadata } from "next";
import React from "react";
import AppShell from "@/components/layout/app-shell";
import RootDocument from "@/components/layout/root-document";

// No page caching; every page is server-rendered per request, nothing is pre-rendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "EngageTrack 2.0",
    template: "%s | EngageTrack 2.0" },
  description: "Service for education sector; tracking individual contributions to a group software projects.",
};

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RootDocument>
      <AppShell productName="EngageTrack 2.0" actions={<button className="btn btn-outline-primary">Sign In</button>}>
        {children}
      </AppShell>
    </RootDocument>
  );
}

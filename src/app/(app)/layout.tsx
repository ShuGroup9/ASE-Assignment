/**
 * @file src/app/(app)/layout.tsx
 * @description Signed-in shell for every protected page: app header with username and sign-out,
 *              plus the session timeout dialog.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 */

import type { Metadata } from "next";
import React from "react";
import AppShell from "@/components/layout/app-shell";
import RootDocument from "@/components/layout/root-document";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "EngageTrack 2.0",
    template: "%s | EngageTrack 2.0" },
  description: "Service for education sector; tracking individual contributions to a group software projects.",
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RootDocument>
      <AppShell productName="EngageTrack 2.0" homeHref="/dashboard">
        {children}
      </AppShell>
    </RootDocument>
  );
}

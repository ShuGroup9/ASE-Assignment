/**
 * @file src/app/(internal)/admin/layout.tsx
 * @description Admin area layout; "EngageTrack 2.0 - Admin" title and Users / Audit log navigation.
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
    default: "EngageTrack 2.0 - Admin",
    template: "%s | EngageTrack 2.0 - Admin" },
  description: "Service for education sector; tracking individual contributions to a group software projects.",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RootDocument>
      <AppShell productName="EngageTrack 2.0 - Admin" homeHref="/admin">
        {children}
      </AppShell>
    </RootDocument>
  );
}

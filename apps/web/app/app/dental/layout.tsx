"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DentalCareShell } from "@/features/dental-care/DentalCareShell";

/** MEDUI.D5A.2 — Dental Care nested layout. */
export default function DentalCareLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const showWorkspaceTabs =
    pathname === "/app/dental/workspace" || pathname.startsWith("/app/dental/workspace/");
  return <DentalCareShell showWorkspaceTabs={showWorkspaceTabs}>{children}</DentalCareShell>;
}

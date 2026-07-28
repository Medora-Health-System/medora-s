"use client";

import type { ReactNode } from "react";
import { ClinicCareShell } from "@/features/clinic-care/ClinicCareShell";

/**
 * MEDUI.D4C.2A — nested Clinic Care layout.
 * Persistent shell; child routes replace the center panel only.
 */
export default function ClinicCareLayout({ children }: { children: ReactNode }) {
  return <ClinicCareShell>{children}</ClinicCareShell>;
}

"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";
import { buildClinicRadiologyEntryHref } from "@medora/shared";

/** MEDUI.D4C.7C — Clinic Care radiology alias → enterprise Liste imagerie + ambulatory filter. */
export default function ClinicCareRadiologyPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href={buildClinicRadiologyEntryHref()}
      labelKey="clinicCareD4c4.redirectingRadiology"
    />
  );
}

"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";
import { buildClinicLaboratoryEntryHref } from "@medora/shared";

/** MEDUI.D4C.7C — Clinic Care laboratory alias → enterprise Liste laboratoire + ambulatory filter. */
export default function ClinicCareLaboratoryPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href={buildClinicLaboratoryEntryHref()}
      labelKey="clinicCareD4c4.redirectingLaboratory"
    />
  );
}

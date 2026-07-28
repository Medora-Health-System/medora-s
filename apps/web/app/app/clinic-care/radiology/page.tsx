"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCareRadiologyPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/rad-worklist"
      labelKey="clinicCareD4c4.redirectingRadiology"
    />
  );
}

"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCarePublicHealthPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/public-health/summary"
      labelKey="clinicCareD4c4.redirectingPublicHealth"
    />
  );
}

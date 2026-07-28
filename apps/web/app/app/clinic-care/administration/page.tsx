"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCareAdministrationPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/admin"
      labelKey="clinicCareD4c4.redirectingAdministration"
    />
  );
}

"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCareEncountersPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/encounters"
      labelKey="clinicCareD4c4.redirectingEncounters"
    />
  );
}

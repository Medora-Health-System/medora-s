"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCarePatientsPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/patients"
      labelKey="clinicCareD4c4.redirectingPatients"
    />
  );
}

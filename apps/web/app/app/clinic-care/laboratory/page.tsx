"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCareLaboratoryPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/lab-worklist"
      labelKey="clinicCareD4c4.redirectingLaboratory"
    />
  );
}

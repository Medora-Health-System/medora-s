"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCarePharmacyPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/pharmacy"
      labelKey="clinicCareD4c4.redirectingPharmacy"
    />
  );
}

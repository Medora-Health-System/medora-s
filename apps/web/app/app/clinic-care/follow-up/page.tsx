"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCareFollowUpPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/follow-ups"
      labelKey="clinicCareD4c4.redirectingFollowUp"
    />
  );
}

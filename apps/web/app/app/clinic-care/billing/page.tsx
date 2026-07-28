"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";

export default function ClinicCareBillingPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href="/app/billing"
      labelKey="clinicCareD4c4.redirectingBilling"
    />
  );
}

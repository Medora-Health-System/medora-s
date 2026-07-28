"use client";

import { ClinicCareDirectCanonicalRedirect } from "@/features/clinic-care/ClinicCareDirectCanonicalRedirect";
import { buildClinicPharmacyEntryHref } from "@medora/shared";

export default function ClinicCarePharmacyPage() {
  return (
    <ClinicCareDirectCanonicalRedirect
      href={buildClinicPharmacyEntryHref({ ambulatory: true, source: "clinic-care" })}
      labelKey="clinicCareD4c4.redirectingPharmacy"
    />
  );
}

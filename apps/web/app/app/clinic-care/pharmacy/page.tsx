"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCarePharmacyPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2.nav.pharmacy"
      descriptionKey="clinicCareD4c2a.module.pharmacyDesc"
      href="/app/pharmacy"
      hrefLabelKey="clinicCareD4c2a.module.openPharmacy"
    />
  );
}

"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCareAdministrationPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2a.nav.administration"
      descriptionKey="clinicCareD4c2a.module.administrationDesc"
      href="/app/admin"
      hrefLabelKey="clinicCareD4c2a.module.openAdministration"
    />
  );
}

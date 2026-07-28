"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCareProviderPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2.nav.provider"
      descriptionKey="clinicCareD4c2a.module.providerDesc"
      href="/app/provider"
      hrefLabelKey="clinicCareD4c2a.module.openProvider"
    />
  );
}

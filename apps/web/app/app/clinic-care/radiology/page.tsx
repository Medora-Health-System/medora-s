"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCareRadiologyPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2a.nav.radiology"
      descriptionKey="clinicCareD4c2a.module.radiologyDesc"
      href="/app/rad-worklist"
      hrefLabelKey="clinicCareD4c2a.module.openRadiology"
    />
  );
}

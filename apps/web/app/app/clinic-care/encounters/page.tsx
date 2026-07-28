"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCareEncountersPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2.nav.encounters"
      descriptionKey="clinicCareD4c2a.module.encountersDesc"
      href="/app/encounters"
      hrefLabelKey="clinicCareD4c2a.module.openEncounters"
    />
  );
}

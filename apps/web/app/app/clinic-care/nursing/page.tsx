"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCareNursingPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2.nav.nursingMa"
      descriptionKey="clinicCareD4c2a.module.nursingDesc"
      href="/app/nursing"
      hrefLabelKey="clinicCareD4c2a.module.openNursing"
    />
  );
}

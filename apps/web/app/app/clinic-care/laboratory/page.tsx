"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCareLaboratoryPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2a.nav.laboratory"
      descriptionKey="clinicCareD4c2a.module.laboratoryDesc"
      href="/app/lab-worklist"
      hrefLabelKey="clinicCareD4c2a.module.openLaboratory"
    />
  );
}

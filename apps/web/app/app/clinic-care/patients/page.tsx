"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCarePatientsPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2.nav.patients"
      descriptionKey="clinicCareD4c2a.module.patientsDesc"
      href="/app/patients"
      hrefLabelKey="clinicCareD4c2a.module.openPatients"
    />
  );
}

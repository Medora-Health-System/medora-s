"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCareFollowUpPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2.nav.followUps"
      descriptionKey="clinicCareD4c2a.module.followUpDesc"
      href="/app/follow-ups"
      hrefLabelKey="clinicCareD4c2a.module.openFollowUp"
    />
  );
}

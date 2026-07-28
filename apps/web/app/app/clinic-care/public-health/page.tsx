"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCarePublicHealthPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2a.nav.publicHealth"
      descriptionKey="clinicCareD4c2a.module.publicHealthDesc"
      href="/app/public-health/summary"
      hrefLabelKey="clinicCareD4c2a.module.openPublicHealth"
    />
  );
}

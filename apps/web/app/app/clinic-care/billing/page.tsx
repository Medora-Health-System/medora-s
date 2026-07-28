"use client";

import { ClinicCareEmbeddedModule } from "@/features/clinic-care/ClinicCareEmbeddedModule";

export default function ClinicCareBillingPage() {
  return (
    <ClinicCareEmbeddedModule
      titleKey="clinicCareD4c2.nav.billing"
      descriptionKey="clinicCareD4c2a.module.billingDesc"
      href="/app/billing"
      hrefLabelKey="clinicCareD4c2a.module.openBilling"
    />
  );
}

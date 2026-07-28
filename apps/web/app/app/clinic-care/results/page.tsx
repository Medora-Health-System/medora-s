"use client";

import { Suspense } from "react";
import { ClinicCareAmbulatoryResultsInboxView } from "@/features/clinic-care/ClinicCareAmbulatoryResultsInboxView";

export default function ClinicCareResultsPage() {
  return (
    <Suspense fallback={null}>
      <ClinicCareAmbulatoryResultsInboxView />
    </Suspense>
  );
}

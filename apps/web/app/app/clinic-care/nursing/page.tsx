"use client";

import { Suspense } from "react";
import { ClinicCareNursingSinglePageWorkspace } from "@/features/clinic-care/ClinicCareNursingSinglePageWorkspace";

export default function ClinicCareNursingPage() {
  return (
    <Suspense fallback={null}>
      <ClinicCareNursingSinglePageWorkspace />
    </Suspense>
  );
}

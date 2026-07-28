"use client";

import { Suspense } from "react";
import { ClinicCareNursingWorkspaceView } from "@/features/clinic-care/ClinicCareNursingWorkspaceView";

export default function ClinicCareNursingPage() {
  return (
    <Suspense fallback={null}>
      <ClinicCareNursingWorkspaceView />
    </Suspense>
  );
}

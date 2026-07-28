"use client";

import { Suspense } from "react";
import { ClinicCareProviderWorkspaceView } from "@/features/clinic-care/ClinicCareProviderWorkspaceView";

export default function ClinicCareProviderPage() {
  return (
    <Suspense fallback={null}>
      <ClinicCareProviderWorkspaceView />
    </Suspense>
  );
}

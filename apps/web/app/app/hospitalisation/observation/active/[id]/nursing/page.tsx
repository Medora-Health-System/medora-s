"use client";

import { Suspense } from "react";
import { ObservationActiveWorkspaceView } from "@/features/observation-workspace/ObservationActiveWorkspaceView";

export default function ObservationNursingWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <ObservationActiveWorkspaceView forcedAudience="NURSING" />
    </Suspense>
  );
}

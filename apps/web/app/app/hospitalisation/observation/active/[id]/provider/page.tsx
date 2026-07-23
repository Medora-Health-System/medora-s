"use client";

import { Suspense } from "react";
import { ObservationActiveWorkspaceView } from "@/features/observation-workspace/ObservationActiveWorkspaceView";

/** D4A.2.7B — Observation provider entry (same enterprise domains; separate encounter). */
export default function ObservationProviderWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <ObservationActiveWorkspaceView forcedAudience="PROVIDER" />
    </Suspense>
  );
}

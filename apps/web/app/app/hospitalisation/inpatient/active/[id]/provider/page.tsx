"use client";

import { Suspense } from "react";
import { InpatientActiveWorkspaceView } from "@/features/inpatient-workspace/InpatientActiveWorkspaceView";

export default function InpatientProviderWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <InpatientActiveWorkspaceView forcedRole="PROVIDER" />
    </Suspense>
  );
}

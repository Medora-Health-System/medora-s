"use client";

import { Suspense } from "react";
import { InpatientActiveWorkspaceView } from "@/features/inpatient-workspace/InpatientActiveWorkspaceView";

export default function InpatientTechnicianWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <InpatientActiveWorkspaceView forcedRole="TECHNICIAN" />
    </Suspense>
  );
}

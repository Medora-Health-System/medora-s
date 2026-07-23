"use client";

import { Suspense } from "react";
import { InpatientActiveWorkspaceView } from "@/features/inpatient-workspace/InpatientActiveWorkspaceView";

export default function InpatientNursingWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <InpatientActiveWorkspaceView forcedRole="NURSING" />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { InpatientActiveWorkspaceView } from "@/features/inpatient-workspace/InpatientActiveWorkspaceView";

export default function InpatientActiveWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <InpatientActiveWorkspaceView />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { InpatientActiveWorkspaceView } from "@/features/inpatient-workspace/InpatientActiveWorkspaceView";

export default function InpatientSharedChartPage() {
  return (
    <Suspense fallback={null}>
      <InpatientActiveWorkspaceView forcedRole="CHART" />
    </Suspense>
  );
}

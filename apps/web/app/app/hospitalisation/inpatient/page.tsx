"use client";

import { Suspense } from "react";
import { InpatientCensusView } from "@/features/inpatient-workspace/InpatientCensusView";

export default function HospitalCareInpatientPage() {
  return (
    <Suspense fallback={null}>
      <InpatientCensusView />
    </Suspense>
  );
}

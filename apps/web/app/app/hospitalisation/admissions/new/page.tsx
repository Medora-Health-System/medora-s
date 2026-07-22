"use client";

import { Suspense } from "react";
import { HospitalAdmissionIntakeView } from "@/features/hospital-care/HospitalAdmissionIntakeView";

export default function HospitalAdmissionNewPage() {
  return (
    <Suspense fallback={null}>
      <HospitalAdmissionIntakeView />
    </Suspense>
  );
}

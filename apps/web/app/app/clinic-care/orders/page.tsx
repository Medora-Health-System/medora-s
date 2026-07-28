"use client";

import { Suspense } from "react";
import { ClinicCareAmbulatoryOrdersBoardView } from "@/features/clinic-care/ClinicCareAmbulatoryOrdersBoardView";

export default function ClinicCareOrdersPage() {
  return (
    <Suspense fallback={null}>
      <ClinicCareAmbulatoryOrdersBoardView />
    </Suspense>
  );
}

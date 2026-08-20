"use client";

import { Suspense } from "react";
import { LabRadTechnicianWorklistDashboard } from "@/components/worklists/LabRadTechnicianWorklistDashboard";

export default function LabWorklistPage() {
  return (
    <Suspense fallback={null}>
      <LabRadTechnicianWorklistDashboard kind="lab" />
    </Suspense>
  );
}

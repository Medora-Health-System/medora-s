"use client";

import { Suspense } from "react";
import { LabRadTechnicianWorklistDashboard } from "@/components/worklists/LabRadTechnicianWorklistDashboard";

export default function RadWorklistPage() {
  return (
    <Suspense fallback={null}>
      <LabRadTechnicianWorklistDashboard kind="radiology" />
    </Suspense>
  );
}

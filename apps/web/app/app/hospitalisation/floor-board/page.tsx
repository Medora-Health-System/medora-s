"use client";

import { Suspense } from "react";
import { HospitalizationBoardView } from "@/features/hospitalization/HospitalizationBoardView";
import { CommonSuspenseFallback } from "@/components/i18n/CommonSuspenseFallback";

/**
 * MEDUI.D4A.4.3 — Facility-wide Hospital Care Dashboard (bed inventory).
 * Not Observation census — Observation is a care setting within Hospital Care.
 */
export default function HospitalCareFloorBoardPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "calc(100vh - 48px)",
            backgroundColor: "#f8fafc",
            padding: "40px 16px",
            textAlign: "center",
            fontSize: 14,
            color: "#64748b",
          }}
        >
          <CommonSuspenseFallback />
        </div>
      }
    >
      <HospitalizationBoardView projection="hospitalCareDashboard" />
    </Suspense>
  );
}

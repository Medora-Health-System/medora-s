"use client";

import { Suspense } from "react";
import { HospitalizationBoardView } from "@/features/hospitalization/HospitalizationBoardView";
import { CommonSuspenseFallback } from "@/components/i18n/CommonSuspenseFallback";

/** Preserved pre-D3CA operational floor board (beds / INPATIENT open census). */
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
      <HospitalizationBoardView />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { HospitalCareHomeView } from "@/features/hospital-care/HospitalCareHomeView";
import { CommonSuspenseFallback } from "@/components/i18n/CommonSuspenseFallback";

export default function HospitalCareHomePage() {
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
      <HospitalCareHomeView />
    </Suspense>
  );
}

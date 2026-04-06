"use client";

import { Suspense } from "react";
import { HospitalizationBoardView } from "@/features/hospitalization/HospitalizationBoardView";

export default function HospitalisationBoardPage() {
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
          Chargement…
        </div>
      }
    >
      <HospitalizationBoardView />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { HospitalizationBoardView } from "@/features/hospitalization/HospitalizationBoardView";

/**
 * Maquette UI hospitalisation (données fictives, Tailwind).
 * Route : /app/hospitalization — distincte de /app/hospitalisation (données réelles).
 * États démo : ?mock=error | ?mock=empty
 */
export default function HospitalizationBoardMockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-48px)] bg-[#F8FAFC] px-4 py-10 text-center text-sm text-slate-500">
          Chargement…
        </div>
      }
    >
      <HospitalizationBoardView />
    </Suspense>
  );
}

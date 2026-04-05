"use client";

import React from "react";
import type { HospitalizationAcuity, MockHospitalizationPatient } from "./mockData";
import { patientInitialsFromFullName } from "./patientInitials";

const ACUITY_LABEL_FR: Record<HospitalizationAcuity, string> = {
  critical: "Critique",
  monitoring: "Surveillance",
  stable: "Stable",
};

const ACUITY_BORDER: Record<HospitalizationAcuity, string> = {
  critical: "border-l-red-500",
  monitoring: "border-l-amber-400",
  stable: "border-l-emerald-500",
};

const BADGE_CLASS: Record<HospitalizationAcuity, string> = {
  critical: "border border-red-100/80 bg-red-50/90 text-red-800",
  monitoring: "border border-amber-100/80 bg-amber-50/90 text-amber-900",
  stable: "border border-emerald-100/80 bg-emerald-50/90 text-emerald-900",
};

type Props = {
  row: MockHospitalizationPatient;
};

export function PatientRowCard({ row }: Props) {
  const initials = patientInitialsFromFullName(row.patientName);

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md ${ACUITY_BORDER[row.acuity]}`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base font-semibold leading-tight text-slate-900">{row.patientName}</h2>
            <p className="text-sm text-slate-500">{row.ageSex}</p>
            <p className="text-sm leading-snug text-slate-700">{row.chiefComplaint}</p>
            <p className="pt-1 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Salle {row.room}</span>
              {row.esi != null ? (
                <>
                  {" "}
                  · <span>ESI {row.esi}</span>
                </>
              ) : null}{" "}
              · <span>Arrivée {row.arrivalTime}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
          <p className="text-sm font-medium text-slate-800">{row.physician}</p>
          <p className="text-sm text-slate-500">
            <span className="text-slate-400">Inf. </span>
            {row.nurseDisplay}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASS[row.acuity]}`}
            >
              {ACUITY_LABEL_FR[row.acuity]}
            </span>
            <button
              type="button"
              className="rounded-lg border border-blue-200/80 bg-blue-50/80 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100/80"
              onClick={() => {}}
            >
              Voir
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

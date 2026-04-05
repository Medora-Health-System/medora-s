"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PatientRowCard } from "./PatientRowCard";
import {
  MOCK_HOSPITALIZATION_ROWS,
  MOCK_PHYSICIANS,
  MOCK_UNITS,
  type HospitalizationAcuity,
  type MockHospitalizationPatient,
} from "./mockData";

const ACUITY_LABEL_FR: Record<HospitalizationAcuity, string> = {
  critical: "Critique",
  monitoring: "Surveillance",
  stable: "Stable",
};

function filterRows(
  rows: MockHospitalizationPatient[],
  search: string,
  unit: string,
  acuity: string,
  physician: string
): MockHospitalizationPatient[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (unit && r.unit !== unit) return false;
    if (acuity && r.acuity !== acuity) return false;
    if (physician && r.physician !== physician) return false;
    if (q) {
      const blob = `${r.patientName} ${r.chiefComplaint} ${r.room}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

function RowSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="h-11 w-11 shrink-0 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-slate-100" />
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-3 max-w-md rounded bg-slate-100" />
          <div className="h-3 w-56 rounded bg-slate-100" />
        </div>
        <div className="hidden w-40 shrink-0 space-y-2 sm:block">
          <div className="ml-auto h-3 w-28 rounded bg-slate-100" />
          <div className="ml-auto h-3 w-20 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function HospitalizationBoardView() {
  const searchParams = useSearchParams();
  const mockMode = searchParams.get("mock");

  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState("");
  const [physician, setPhysician] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (mockMode === "error" || mockMode === "empty") {
      setInitialLoadDone(true);
      return;
    }
    const t = window.setTimeout(() => setInitialLoadDone(true), 420);
    return () => window.clearTimeout(t);
  }, [mockMode]);

  const baseRows = mockMode === "empty" ? [] : MOCK_HOSPITALIZATION_ROWS;

  const filtered = useMemo(
    () => filterRows(baseRows, search, unit, status, physician),
    [baseRows, search, unit, status, physician]
  );

  const isLoading = !initialLoadDone && mockMode !== "error" && mockMode !== "empty";
  const showError = mockMode === "error";
  const showEmpty = !isLoading && !showError && filtered.length === 0;
  const showList = !isLoading && !showError && filtered.length > 0;

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#F8FAFC] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
              Hospitalisation
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">Vue des patients hospitalisés</p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
            onClick={() => {}}
          >
            Admettre un patient
          </button>
        </header>

        <div className="mb-8 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-h-[2.75rem] flex-1">
            <label className="sr-only" htmlFor="hosp-board-search">
              Recherche
            </label>
            <input
              id="hosp-board-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un patient, un motif, une salle…"
              className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:shrink-0">
            <FilterSelect
              label="Unité"
              value={unit}
              onChange={setUnit}
              options={["", ...MOCK_UNITS]}
              placeholder="Toutes"
            />
            <FilterSelect
              label="Statut"
              value={status}
              onChange={setStatus}
              options={["", "critical", "monitoring", "stable"]}
              formatOption={(v) => (v ? ACUITY_LABEL_FR[v as HospitalizationAcuity] : "")}
              placeholder="Tous"
            />
            <FilterSelect
              label="Médecin"
              value={physician}
              onChange={setPhysician}
              options={["", ...MOCK_PHYSICIANS]}
              placeholder="Tous les médecins"
            />
          </div>
        </div>

        {showError ? (
          <div className="rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <p className="text-base font-medium text-slate-800">Impossible de charger la liste.</p>
            <p className="mt-2 text-sm text-slate-500">Vérifiez la connexion et réessayez.</p>
            <button
              type="button"
              className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : null}

        {showEmpty ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-16 text-center shadow-sm">
            <p className="text-base font-medium text-slate-700">Aucun patient à afficher.</p>
            <p className="mt-2 text-sm text-slate-500">
              Ajustez la recherche ou les filtres, ou vérifiez qu’il existe des hospitalisations ouvertes.
            </p>
          </div>
        ) : null}

        {showList ? (
          <ul className="space-y-3">
            {filtered.map((row) => (
              <li key={row.id}>
                <PatientRowCard row={row} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  formatOption,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  formatOption?: (v: string) => string;
}) {
  return (
    <div className="w-full min-w-[9.5rem] sm:w-40">
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <option value="">{placeholder}</option>
        {options
          .filter((o) => o !== "")
          .map((o) => (
            <option key={o} value={o}>
              {formatOption ? formatOption(o) : o}
            </option>
          ))}
      </select>
    </div>
  );
}

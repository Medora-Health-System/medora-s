"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MedoraCardActionsMediaStyle } from "@/components/medora-card";
import { fetchHospitalisationEncounters } from "@/lib/clinicalWorklistApi";
import type { HospitalisationBoardEncounterRow } from "@/lib/hospitalisationBoardTypes";
import { formatAgeYearsSexFr } from "@/lib/patientDisplay";
import { ui } from "@/lib/uiLabels";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PatientRowCard } from "./PatientRowCard";
import type { HospitalizationBoardAcuity, HospitalizationBoardRow } from "./hospitalizationBoardRow";

const ACUITY_LABEL_FR: Record<HospitalizationBoardAcuity, string> = {
  critical: "Critique",
  monitoring: "Surveillance",
  stable: "Stable",
};

function acuityFromEsi(esi: number | null | undefined): HospitalizationBoardAcuity {
  if (esi == null || Number.isNaN(esi)) return "stable";
  if (esi <= 1) return "critical";
  if (esi <= 3) return "monitoring";
  return "stable";
}

function fullPatientName(p: HospitalisationBoardEncounterRow["patient"]): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || ui.common.dash;
}

function physicianLabel(enc: HospitalisationBoardEncounterRow): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

/** Heuristic « unité » from room label when API has no separate unit field. */
function unitFromRoomLabel(roomLabel: string | null | undefined): string {
  const r = (roomLabel ?? "").trim();
  if (!r) return "";
  const part = r.split(/[-–/]/)[0]?.trim() ?? "";
  return part || r;
}

function formatArrivalTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function mapHospitalisationEncounterToBoardRow(enc: HospitalisationBoardEncounterRow): HospitalizationBoardRow {
  const p = enc.patient;
  const esi = enc.triage?.esi ?? null;
  const chief =
    enc.triage?.chiefComplaint?.trim() ||
    enc.chiefComplaint?.trim() ||
    "";
  const phys = physicianLabel(enc);
  return {
    id: enc.id,
    room: enc.roomLabel?.trim() || ui.common.dash,
    unit: unitFromRoomLabel(enc.roomLabel),
    patientName: fullPatientName(p),
    chiefComplaint: chief,
    physician: phys || "—",
    nurseDisplay: "—",
    acuity: acuityFromEsi(esi),
    ageSex: formatAgeYearsSexFr(p?.dob ?? null, p?.sexAtBirth ?? null, p?.sex ?? null),
    esi,
    arrivalTime: formatArrivalTime(enc.createdAt ?? null),
    status: enc.status ?? "",
  };
}

function filterRows(
  rows: HospitalizationBoardRow[],
  search: string,
  unit: string,
  acuity: string,
  physician: string
): HospitalizationBoardRow[] {
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
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();

  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [rows, setRows] = useState<HospitalizationBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState("");
  const [physician, setPhysician] = useState("");

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    if (mockMode === "error") {
      setLoading(false);
      setFetchError(null);
      return;
    }
    if (mockMode === "empty") {
      setLoading(false);
      setFetchError(null);
      setRows([]);
    }
  }, [mockMode]);

  useEffect(() => {
    if (mockMode === "error" || mockMode === "empty") return;
    if (!ready || !facilityId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const data = await fetchHospitalisationEncounters(facilityId);
        if (!cancelled) setRows((data || []).map(mapHospitalisationEncounterToBoardRow));
      } catch {
        if (!cancelled) {
          setFetchError("Impossible de charger la liste.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mockMode, ready, facilityId]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.unit) set.add(r.unit);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  const physicianOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.physician && r.physician !== "—") set.add(r.physician);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  const filtered = useMemo(
    () => filterRows(rows, search, unit, status, physician),
    [rows, search, unit, status, physician]
  );

  const isLoading = loading && mockMode !== "error" && mockMode !== "empty";
  const showError = mockMode === "error" || fetchError != null;
  const showEmpty = !isLoading && !showError && filtered.length === 0;
  const showList = !isLoading && !showError && filtered.length > 0;

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#F8FAFC] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (min-width: 640px) {
            .hosp-meta-block { border-top: none !important; padding-top: 0 !important; align-items: flex-end !important; text-align: right !important; width: auto !important; }
          }
        `,
          }}
        />
        <MedoraCardActionsMediaStyle />
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
              options={["", ...unitOptions]}
              placeholder="Toutes"
            />
            <FilterSelect
              label="Statut"
              value={status}
              onChange={setStatus}
              options={["", "critical", "monitoring", "stable"]}
              formatOption={(v) => (v ? ACUITY_LABEL_FR[v as HospitalizationBoardAcuity] : "")}
              placeholder="Tous"
            />
            <FilterSelect
              label="Médecin"
              value={physician}
              onChange={setPhysician}
              options={["", ...physicianOptions]}
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

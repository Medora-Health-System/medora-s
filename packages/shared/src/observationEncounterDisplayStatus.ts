/**
 * Phase 15F-D.3 — Unified observation encounter display status (read-model).
 * Keeps dashboard, encounter chart, and export aligned without mutating source records.
 */

import {
  admissionSummaryJsonSuggestsObservationShortStay,
  hasAdmissionSummaryAnyPopulatedField,
} from "./observationShortStayEncounter.js";

export type ObservationEncounterDisplayPhase =
  | "NOT_OBSERVATION"
  | "ACTIVE"
  | "DISCHARGE_IN_PROGRESS"
  | "DISCHARGED";

export type ObservationEncounterDisplayStatus = {
  phase: ObservationEncounterDisplayPhase;
  /** ISO when encounter closed or discharged. */
  closedOrDischargedAtIso: string | null;
  /** Parsed `dischargeSummaryJson.dischargeMode` when present. */
  dischargeMode: string | null;
};

function hasNonEmptyAdmittedAt(admittedAt: unknown): boolean {
  if (admittedAt == null) return false;
  if (admittedAt instanceof Date) return !Number.isNaN(admittedAt.getTime());
  const s = String(admittedAt).trim();
  if (!s) return false;
  return !Number.isNaN(Date.parse(s));
}

function dischargeModeFromSummary(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const mode = (raw as { dischargeMode?: unknown }).dischargeMode;
  const trimmed = typeof mode === "string" ? mode.trim() : "";
  return trimmed || null;
}

/**
 * True for INPATIENT observation lane encounters (open or closed).
 */
export function wasObservationShortStayEncounter(input: {
  type?: string | null;
  admittedAt?: unknown;
  admissionSummaryJson?: unknown;
}): boolean {
  if (input.type !== "INPATIENT") return false;
  if (hasNonEmptyAdmittedAt(input.admittedAt)) return true;
  if (hasAdmissionSummaryAnyPopulatedField(input.admissionSummaryJson)) return true;
  if (admissionSummaryJsonSuggestsObservationShortStay(input.admissionSummaryJson)) return true;
  return false;
}

/**
 * Chart / board display phase — does not replace `isObservationShortStayEncounter` (OPEN workflow gate).
 */
export function deriveObservationEncounterDisplayStatus(input: {
  type?: string | null;
  status?: string | null;
  admittedAt?: unknown;
  admissionSummaryJson?: unknown;
  dischargeSummaryJson?: unknown;
  dischargedAt?: unknown;
  updatedAt?: unknown;
}): ObservationEncounterDisplayStatus {
  if (!wasObservationShortStayEncounter(input)) {
    return { phase: "NOT_OBSERVATION", closedOrDischargedAtIso: null, dischargeMode: null };
  }

  const dischargeMode = dischargeModeFromSummary(input.dischargeSummaryJson);
  const status = (input.status ?? "").trim().toUpperCase();

  if (status !== "OPEN") {
    const at =
      input.dischargedAt ?? input.updatedAt ?? null;
    const iso =
      at instanceof Date
        ? at.toISOString()
        : typeof at === "string" && at.trim()
          ? at.trim()
          : null;
    return { phase: "DISCHARGED", closedOrDischargedAtIso: iso, dischargeMode };
  }

  if (dischargeMode) {
    return { phase: "DISCHARGE_IN_PROGRESS", closedOrDischargedAtIso: null, dischargeMode };
  }

  return { phase: "ACTIVE", closedOrDischargedAtIso: null, dischargeMode: null };
}

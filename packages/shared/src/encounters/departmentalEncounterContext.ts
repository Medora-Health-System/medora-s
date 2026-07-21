/**
 * D3DA — Shared departmental worklist encounter context (ED / Observation / Inpatient).
 * Computed from existing Encounter scalars — no InternalPlacement SQL.
 */

import {
  admissionSummaryJsonSuggestsObservationShortStay,
  isObservationShortStayEncounter,
} from "../observationShortStayEncounter.js";

export const DEPARTMENTAL_ENCOUNTER_CONTEXTS = [
  "ED",
  "OBSERVATION",
  "INPATIENT",
  "OTHER",
] as const;

export type DepartmentalEncounterContext = (typeof DEPARTMENTAL_ENCOUNTER_CONTEXTS)[number];

export type DepartmentalEncounterContextInput = {
  type?: string | null;
  status?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
  admittedAt?: unknown;
};

/**
 * Resolve display context for Lab / Rad / Pharmacy worklists.
 * EMERGENCY → ED; INPATIENT + observation heuristics / OBSERVATION billing → OBSERVATION;
 * other INPATIENT → INPATIENT.
 */
export function resolveDepartmentalEncounterContext(
  input: DepartmentalEncounterContextInput
): DepartmentalEncounterContext {
  const type = String(input.type ?? "")
    .trim()
    .toUpperCase();
  if (type === "EMERGENCY") return "ED";
  if (type === "OUTPATIENT" || type === "URGENT_CARE") return "OTHER";
  if (type === "INPATIENT") {
    const billing = String(input.billingClassification ?? "")
      .trim()
      .toUpperCase();
    if (billing === "OBSERVATION") return "OBSERVATION";
    if (admissionSummaryJsonSuggestsObservationShortStay(input.admissionSummaryJson)) {
      return "OBSERVATION";
    }
    // Treat open short-stay INPATIENT as Observation for departmental queues.
    if (
      isObservationShortStayEncounter({
        type: "INPATIENT",
        status: "OPEN",
        admittedAt: input.admittedAt,
        admissionSummaryJson: input.admissionSummaryJson,
      })
    ) {
      return "OBSERVATION";
    }
    return "INPATIENT";
  }
  return "OTHER";
}

export function departmentalEncounterContextLabelKey(
  context: DepartmentalEncounterContext
): string {
  switch (context) {
    case "ED":
      return "worklistDepartments.shared.encounterContext.ed";
    case "OBSERVATION":
      return "worklistDepartments.shared.encounterContext.observation";
    case "INPATIENT":
      return "worklistDepartments.shared.encounterContext.inpatient";
    default:
      return "worklistDepartments.shared.encounterContext.other";
  }
}

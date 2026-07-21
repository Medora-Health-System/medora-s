/**
 * D3DA / D3E.5 — Shared departmental worklist encounter context.
 *
 * Delegates to canonical `resolveClinicalEncounterContext`.
 * Short-stay / admittedAt heuristics are NOT used for identity.
 */

import {
  clinicalContextToWorklistBadge,
  resolveClinicalEncounterContext,
  type ClinicalEncounterIdentityInput,
} from "./clinicalEncounterIdentity.js";

export const DEPARTMENTAL_ENCOUNTER_CONTEXTS = [
  "ED",
  "OBSERVATION",
  "INPATIENT",
  "UNKNOWN",
  "OTHER",
] as const;

export type DepartmentalEncounterContext = (typeof DEPARTMENTAL_ENCOUNTER_CONTEXTS)[number];

export type DepartmentalEncounterContextInput = ClinicalEncounterIdentityInput;

/**
 * Resolve display context for Lab / Rad / Pharmacy worklists.
 * Canonical identity only — never admittedAt / length-of-stay.
 */
export function resolveDepartmentalEncounterContext(
  input: DepartmentalEncounterContextInput
): DepartmentalEncounterContext {
  const clinical = resolveClinicalEncounterContext(input);
  const badge = clinicalContextToWorklistBadge(clinical);
  if (badge === "ED") return "ED";
  if (badge === "OBSERVATION") return "OBSERVATION";
  if (badge === "INPATIENT") return "INPATIENT";
  if (badge === "UNKNOWN") return "UNKNOWN";
  return "OTHER";
}

/** @deprecated Prefer resolveDepartmentalEncounterContext / resolveClinicalEncounterContext. */
export function resolveDepartmentalEncounterContextLegacyAlias(
  input: DepartmentalEncounterContextInput
): DepartmentalEncounterContext {
  return resolveDepartmentalEncounterContext(input);
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
    case "UNKNOWN":
      return "worklistDepartments.shared.encounterContext.unknown";
    default:
      return "worklistDepartments.shared.encounterContext.other";
  }
}

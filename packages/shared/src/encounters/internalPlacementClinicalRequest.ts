/**
 * D3C — clinical request field validation for InternalPlacementRequest.
 * Explicit OBSERVATION | INPATIENT — not inferred solely from careLevel heuristics.
 */

import { InternalPlacementRequestedEncounterType } from "./internalPlacementStatusMachine.js";

export type InternalPlacementClinicalRequestInput = {
  requestedEncounterType?: string | null;
  requestedLevelOfCare?: string | null;
  requestedService?: string | null;
  admissionDiagnosisSummary?: string | null;
  reasonForPlacement?: string | null;
  clinicalPriority?: string | null;
  telemetryRequired?: boolean | null;
  isolationRequired?: boolean | null;
  isolationType?: string | null;
  specialPlacementNeedsJson?: unknown;
  acceptingProviderNameSnapshot?: string | null;
};

export type InternalPlacementClinicalValidation = {
  ok: boolean;
  missing: string[];
};

export function validateInternalPlacementClinicalRequestForSign(
  input: InternalPlacementClinicalRequestInput
): InternalPlacementClinicalValidation {
  const missing: string[] = [];
  const type = (input.requestedEncounterType ?? "").trim().toUpperCase();
  if (
    type !== InternalPlacementRequestedEncounterType.OBSERVATION &&
    type !== InternalPlacementRequestedEncounterType.INPATIENT
  ) {
    missing.push("requestedEncounterType");
  }
  if (!input.requestedLevelOfCare?.trim()) missing.push("requestedLevelOfCare");
  if (!input.requestedService?.trim()) missing.push("requestedService");
  if (!input.admissionDiagnosisSummary?.trim()) missing.push("admissionDiagnosisSummary");
  if (!input.reasonForPlacement?.trim()) missing.push("reasonForPlacement");
  if (!input.clinicalPriority?.trim()) missing.push("clinicalPriority");
  return { ok: missing.length === 0, missing };
}

/** Map legacy careLevel display hints only — never authoritative for D3C durable type. */
export function mapLegacyCareLevelToRequestedTypeHint(
  careLevel: string | null | undefined
): "OBSERVATION" | "INPATIENT" | null {
  if (!careLevel?.trim()) return null;
  if (/obs/i.test(careLevel)) return "OBSERVATION";
  return "INPATIENT";
}

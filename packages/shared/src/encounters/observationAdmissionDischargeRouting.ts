/**
 * Phase 15F-D — Distinguish observation admission routing from true ER discharge documentation.
 * Persisted `dischargeSummaryJson.dischargeMode` may carry "Admission / hospitalisation" for trackboard
 * badges without implying a discharge summary clinical event.
 */

/** Canonical French value in `dischargeSummaryJson.dischargeMode` (web + API). */
export const DISCHARGE_MODE_FR_ADMISSION = "Admission / hospitalisation";

const DISCHARGE_CLINICAL_STRING_KEYS = [
  "disposition",
  "exitCondition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
  "returnIfWorse",
  "patientDestination",
] as const;

const PATIENT_INSTRUCTION_KEYS = [
  "dischargeDiagnosisSummary",
  "medicationInstructions",
  "returnPrecautions",
  "followUpInstructions",
  "activityInstructions",
  "woundCareInstructions",
  "workSchoolNote",
  "instructionsGivenBy",
  "instructionsGivenAt",
] as const;

function strField(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  return typeof v === "string" ? v.trim() : "";
}

/** True when discharge JSON has clinical discharge content beyond routing `dischargeMode`. */
export function dischargeSnapshotHasClinicalDischargeContent(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  for (const k of DISCHARGE_CLINICAL_STRING_KEYS) {
    if (strField(o, k)) return true;
  }
  for (const k of PATIENT_INSTRUCTION_KEYS) {
    if (strField(o, k)) return true;
  }
  if (o.patientInstructionsGiven === true) return true;
  return false;
}

/** Discharge blob only routes to admission/observation (mode set, no discharge clinical fields). */
export function dischargeSnapshotIsObservationAdmissionRoutingOnly(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const mode = strField(raw as Record<string, unknown>, "dischargeMode");
  if (mode !== DISCHARGE_MODE_FR_ADMISSION) return false;
  return !dischargeSnapshotHasClinicalDischargeContent(raw);
}

/** Display remap: mis-tagged DISCHARGE_SUMMARY_SAVED rows that only captured admission routing. */
export function mislabeledDischargeEventIsObservationAdmission(event: {
  eventType?: string | null;
  payloadJson?: unknown;
}): boolean {
  if (String(event.eventType ?? "").trim() !== "DISCHARGE_SUMMARY_SAVED") return false;
  const payload = event.payloadJson;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const snap = (payload as Record<string, unknown>).snapshot;
  return dischargeSnapshotIsObservationAdmissionRoutingOnly(snap);
}

/** Resolved display event type for timeline / history (does not mutate stored rows). */
export type ClinicalDocumentationDisplayEventType =
  | "DISCHARGE_SUMMARY_SAVED"
  | "ADMISSION_SUMMARY_SAVED"
  | "OBSERVATION_ADMISSION_PACKET_SAVED";

export function resolveClinicalDocumentationDisplayEventType(event: {
  eventType?: string | null;
  payloadJson?: unknown;
}): ClinicalDocumentationDisplayEventType {
  if (mislabeledDischargeEventIsObservationAdmission(event)) {
    return "OBSERVATION_ADMISSION_PACKET_SAVED";
  }
  const et = String(event.eventType ?? "").trim();
  if (et === "ADMISSION_SUMMARY_SAVED") return "ADMISSION_SUMMARY_SAVED";
  return "DISCHARGE_SUMMARY_SAVED";
}

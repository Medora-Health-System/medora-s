/**
 * Merge flat admission packet fields into existing admissionSummaryJson
 * without wiping nested enterprise keys (admissionCorrelation, diagnoses, ops, …).
 */

import type { AdmissionDiagnosesV1, AdmissionSummaryFields } from "../schemas/patient.js";

const FLAT_ADMISSION_KEYS = [
  "admissionReason",
  "serviceUnit",
  "admissionDiagnosis",
  "careLevel",
  "conditionAtAdmission",
  "initialPlan",
  "responsiblePhysicianName",
] as const;

export function asAdmissionSummaryRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export function mergeAdmissionSummaryFieldsPreservingNested(
  prior: unknown,
  fields: AdmissionSummaryFields,
  admissionDiagnoses?: AdmissionDiagnosesV1 | null
): Record<string, unknown> {
  const next = asAdmissionSummaryRecord(prior);
  for (const key of FLAT_ADMISSION_KEYS) {
    const v = fields[key];
    if (typeof v === "string") {
      next[key] = v;
    }
  }
  if (admissionDiagnoses != null) {
    next.admissionDiagnosesV1 = admissionDiagnoses;
    const primary = String(admissionDiagnoses.primaryDisplay ?? "").trim();
    const secondaries = (admissionDiagnoses.secondaryDisplays ?? [])
      .map((s) => String(s ?? "").trim())
      .filter(Boolean);
    const clarification = String(admissionDiagnoses.clarificationText ?? "").trim();
    const composed = [primary, ...secondaries, clarification].filter(Boolean).join("; ");
    if (composed) {
      next.admissionDiagnosis = composed;
    }
  }
  return next;
}

export function flatAdmissionFieldsHaveContent(fields: AdmissionSummaryFields): boolean {
  return FLAT_ADMISSION_KEYS.some((k) => {
    const v = fields[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

/** Infer placement encounter type from free-text care level (FR/EN heuristics). */
export function inferPlacementEncounterTypeFromCareLevel(
  careLevel: string | null | undefined
): "OBSERVATION" | "INPATIENT" {
  const raw = String(careLevel ?? "").trim().toLowerCase();
  if (!raw) return "INPATIENT";
  if (raw.includes("observ") || raw === "obs") return "OBSERVATION";
  return "INPATIENT";
}

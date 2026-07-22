/**
 * Merge flat admission packet fields into existing admissionSummaryJson
 * without wiping nested enterprise keys (admissionCorrelation, diagnoses, ops, …).
 */

import type { AdmissionDiagnosesV1, AdmissionSummaryFields } from "../schemas/patient.js";
import type { AdmissionPacketV1 } from "./smartAdmissionPacketD4a2.js";
import { ADMISSION_PACKET_V1_KEY } from "./smartAdmissionPacketD4a2.js";

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
  admissionDiagnoses?: AdmissionDiagnosesV1 | null,
  admissionPacket?: AdmissionPacketV1 | null
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
  if (admissionPacket != null) {
    next[ADMISSION_PACKET_V1_KEY] = admissionPacket;
  }
  return next;
}

export function flatAdmissionFieldsHaveContent(fields: AdmissionSummaryFields): boolean {
  return FLAT_ADMISSION_KEYS.some((k) => {
    const v = fields[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

/** Infer placement encounter type from care level code or free-text (FR/EN heuristics). */
export function inferPlacementEncounterTypeFromCareLevel(
  careLevel: string | null | undefined
): "OBSERVATION" | "INPATIENT" {
  const raw = String(careLevel ?? "").trim();
  if (!raw) return "INPATIENT";
  const upper = raw.toUpperCase();
  if (upper === "OBSERVATION" || upper === "OBS") return "OBSERVATION";
  const lower = raw.toLowerCase();
  if (lower.includes("observ") || lower === "obs") return "OBSERVATION";
  return "INPATIENT";
}

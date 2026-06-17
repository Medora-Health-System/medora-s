/** MEDUI.ED.MAR.H9C — unified medication timing override justification governance. */

import type { MarAdministrationVarianceClassification } from "./marAdministrationVarianceGovernance.js";
import {
  MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES,
  classifyMarAdministrationVariance,
} from "./marAdministrationVarianceGovernance.js";

export const MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES = [
  "CLINICAL_CONDITION",
  "PROVIDER_REQUEST",
  "PATIENT_REQUEST",
  "PROCEDURE_SCHEDULE",
  "TESTING_IMAGING",
  "PATIENT_OFF_UNIT",
  "PATIENT_SLEEPING",
  "MEDICATION_UNAVAILABLE",
  "PHARMACY_DELAY",
  "WORKFLOW_DELAY",
  "LINE_ACCESS_ISSUE",
  "UNIT_TRANSFER",
  "DISCHARGE_PENDING",
  "ADMISSION_WORKFLOW",
  "OTHER",
] as const;

export type MarMedicationTimingOverrideReasonCode =
  (typeof MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES)[number];

export type MarMedicationTimingOverrideKind =
  | "ON_TIME_ADMINISTRATION"
  | "EARLY_ADMINISTRATION"
  | "LATE_ADMINISTRATION"
  | "SCHEDULE_CHANGE";

/** Legacy codes from H9/H9A/H9B mapped to H9C canonical codes for audit reads. */
export const MAR_LEGACY_TIMING_OVERRIDE_REASON_CODE_MAP: Record<string, MarMedicationTimingOverrideReasonCode> =
  {
    PROVIDER_INSTRUCTION: "PROVIDER_REQUEST",
    PROVIDER_REQUESTED_EARLY: "PROVIDER_REQUEST",
    PATIENT_CONDITION: "CLINICAL_CONDITION",
    PATIENT_UNAVAILABLE: "PATIENT_OFF_UNIT",
    PATIENT_LEAVING_UNIT: "PATIENT_OFF_UNIT",
    PROCEDURE_TIMING: "PROCEDURE_SCHEDULE",
    PROCEDURE_SCHEDULED: "PROCEDURE_SCHEDULE",
    PROCEDURE: "PROCEDURE_SCHEDULE",
    NURSING_WORKFLOW: "WORKFLOW_DELAY",
    EARLY_ADMINISTRATION: "WORKFLOW_DELAY",
    LATE_ADMINISTRATION: "WORKFLOW_DELAY",
    MEDICATION_AVAILABILITY: "MEDICATION_UNAVAILABLE",
    MEDICATION_UNAVAILABLE: "MEDICATION_UNAVAILABLE",
    CLINICAL_DELAY: "CLINICAL_CONDITION",
    PAIN_CRISIS: "CLINICAL_CONDITION",
    NAUSEA_VOMITING: "CLINICAL_CONDITION",
    TRANSFERRED: "UNIT_TRANSFER",
    PHARMACY_DELAY: "PHARMACY_DELAY",
    WORKFLOW_DELAY: "WORKFLOW_DELAY",
  };

const MAR_TIMING_OVERRIDE_REASON_LABELS_EN: Record<MarMedicationTimingOverrideReasonCode, string> = {
  CLINICAL_CONDITION: "Clinical condition",
  PROVIDER_REQUEST: "Provider request",
  PATIENT_REQUEST: "Patient request",
  PROCEDURE_SCHEDULE: "Procedure schedule",
  TESTING_IMAGING: "Testing / imaging",
  PATIENT_OFF_UNIT: "Patient off unit",
  PATIENT_SLEEPING: "Patient sleeping",
  MEDICATION_UNAVAILABLE: "Medication unavailable",
  PHARMACY_DELAY: "Pharmacy delay",
  WORKFLOW_DELAY: "Workflow delay",
  LINE_ACCESS_ISSUE: "Line access issue",
  UNIT_TRANSFER: "Unit transfer",
  DISCHARGE_PENDING: "Discharge pending",
  ADMISSION_WORKFLOW: "Admission workflow",
  OTHER: "Other",
};

const MAR_TIMING_OVERRIDE_REASON_LABELS_FR: Record<MarMedicationTimingOverrideReasonCode, string> = {
  CLINICAL_CONDITION: "Condition clinique",
  PROVIDER_REQUEST: "Demande du prescripteur",
  PATIENT_REQUEST: "Demande du patient",
  PROCEDURE_SCHEDULE: "Horaire de procédure",
  TESTING_IMAGING: "Examens / imagerie",
  PATIENT_OFF_UNIT: "Patient hors unité",
  PATIENT_SLEEPING: "Patient endormi",
  MEDICATION_UNAVAILABLE: "Médicament indisponible",
  PHARMACY_DELAY: "Retard pharmacie",
  WORKFLOW_DELAY: "Retard organisationnel",
  LINE_ACCESS_ISSUE: "Problème d'accès veineux",
  UNIT_TRANSFER: "Transfert d'unité",
  DISCHARGE_PENDING: "Sortie en attente",
  ADMISSION_WORKFLOW: "Admission en cours",
  OTHER: "Autre",
};

export type MarMedicationTimingOverrideRequirement = {
  overrideKind: MarMedicationTimingOverrideKind;
  movedMinutes: number;
  reasonRequired: boolean;
  detailRequired: boolean;
  reviewRecommended: boolean;
  severity: "LOW" | "MODERATE" | "HIGH";
};

export function normalizeMarMedicationTimingOverrideReasonCode(
  code: string | null | undefined
): MarMedicationTimingOverrideReasonCode | null {
  const normalized = code?.trim().toUpperCase() ?? "";
  if (!normalized) return null;
  if ((MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES as readonly string[]).includes(normalized)) {
    return normalized as MarMedicationTimingOverrideReasonCode;
  }
  return MAR_LEGACY_TIMING_OVERRIDE_REASON_CODE_MAP[normalized] ?? null;
}

export function isMarMedicationTimingOverrideReasonCode(
  code: string | null | undefined
): boolean {
  return normalizeMarMedicationTimingOverrideReasonCode(code) != null;
}

export function resolveMarMedicationTimingOverrideReasonLabelKey(
  code: string | null | undefined
): string | null {
  const canonical = normalizeMarMedicationTimingOverrideReasonCode(code);
  if (!canonical) return null;
  return `marTimingOverride.reason.${canonical}`;
}

export function resolveMarMedicationTimingOverrideReasonLabel(
  code: string | null | undefined,
  locale: "en" | "fr" = "en"
): string | null {
  const canonical = normalizeMarMedicationTimingOverrideReasonCode(code);
  if (!canonical) return code?.trim() || null;
  return locale === "fr"
    ? MAR_TIMING_OVERRIDE_REASON_LABELS_FR[canonical]
    : MAR_TIMING_OVERRIDE_REASON_LABELS_EN[canonical];
}

export function resolveMarMedicationTimingOverrideKindFromVariance(
  classification: MarAdministrationVarianceClassification
): MarMedicationTimingOverrideKind {
  if (classification === "EARLY_ADMINISTRATION") return "EARLY_ADMINISTRATION";
  if (classification === "LATE_ADMINISTRATION") return "LATE_ADMINISTRATION";
  return "ON_TIME_ADMINISTRATION";
}

export function assessMarMedicationTimingOverrideRequirement(input: {
  overrideKind: MarMedicationTimingOverrideKind;
  movedMinutes: number;
}): MarMedicationTimingOverrideRequirement {
  const absMoved = Math.max(0, Math.abs(input.movedMinutes));
  let severity: "LOW" | "MODERATE" | "HIGH" = "LOW";
  if (absMoved > 120) severity = "HIGH";
  else if (absMoved > 60) severity = "MODERATE";
  else if (absMoved > MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES) severity = "LOW";

  const reasonRequired =
    input.overrideKind === "SCHEDULE_CHANGE" ||
    (input.overrideKind !== "ON_TIME_ADMINISTRATION" &&
      absMoved > MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES);
  const reviewRecommended = severity === "HIGH" && reasonRequired;
  const detailRequired = reviewRecommended;

  return {
    overrideKind: input.overrideKind,
    movedMinutes: absMoved,
    reasonRequired,
    detailRequired,
    reviewRecommended,
    severity,
  };
}

export function validateMarMedicationTimingOverride(input: {
  overrideKind: MarMedicationTimingOverrideKind;
  movedMinutes: number;
  reasonCode?: string | null;
  reasonDetail?: string | null;
}): { ok: true } | { ok: false; code: "REASON_REQUIRED" | "DETAIL_REQUIRED" | "INVALID_REASON" } {
  const requirement = assessMarMedicationTimingOverrideRequirement({
    overrideKind: input.overrideKind,
    movedMinutes: input.movedMinutes,
  });
  if (!requirement.reasonRequired) return { ok: true };

  const canonical = normalizeMarMedicationTimingOverrideReasonCode(input.reasonCode);
  if (!canonical) return { ok: false, code: "INVALID_REASON" };

  if (requirement.detailRequired && !input.reasonDetail?.trim()) {
    return { ok: false, code: "DETAIL_REQUIRED" };
  }
  if (canonical === "OTHER" && !input.reasonDetail?.trim()) {
    return { ok: false, code: "DETAIL_REQUIRED" };
  }
  return { ok: true };
}

export function administrationVarianceMinutesToOverrideKind(
  varianceMinutes: number
): MarMedicationTimingOverrideKind {
  return classifyMarAdministrationVariance(varianceMinutes) as MarMedicationTimingOverrideKind;
}

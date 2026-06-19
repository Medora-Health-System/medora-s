/** MEDUI.ED.MAR.H9A — enterprise medication schedule rescheduling governance. */

import { MAR_DOSE_SCHEDULE_ADJUSTMENT_REASON_CODES } from "./marUniversalAdministrationTimingGovernance.js";
import {
  isMarMedicationTimingOverrideReasonCode,
  normalizeMarMedicationTimingOverrideReasonCode,
} from "./marMedicationTimingOverrideGovernance.js";

export const MAR_RESCHEDULE_REASON_CODES = [
  "PATIENT_SLEEPING",
  "PATIENT_OFF_UNIT",
  "PATIENT_REQUEST",
  "PROVIDER_REQUEST",
  "PROCEDURE_TIMING",
  "TESTING_IMAGING",
  "CLINICAL_CONDITION",
  "NURSING_WORKFLOW",
  "MEDICATION_AVAILABILITY",
  "OTHER",
] as const;

export type MarRescheduleReasonCode = (typeof MAR_RESCHEDULE_REASON_CODES)[number];

/** Legacy H9 codes remain valid for backward-compatible audit reads. */
export const MAR_LEGACY_SCHEDULE_ADJUSTMENT_REASON_CODES = MAR_DOSE_SCHEDULE_ADJUSTMENT_REASON_CODES;

export const MAR_ALL_SCHEDULE_RESCHEDULE_REASON_CODES = [
  ...MAR_RESCHEDULE_REASON_CODES,
  ...MAR_LEGACY_SCHEDULE_ADJUSTMENT_REASON_CODES.filter(
    (code) => !(MAR_RESCHEDULE_REASON_CODES as readonly string[]).includes(code)
  ),
] as const;

export function isMarRescheduleReasonCode(code: string | null | undefined): boolean {
  return isMarMedicationTimingOverrideReasonCode(code) || isMarLegacyRescheduleReasonCode(code);
}

function isMarLegacyRescheduleReasonCode(code: string | null | undefined): boolean {
  const normalized = code?.trim().toUpperCase() ?? "";
  return (MAR_ALL_SCHEDULE_RESCHEDULE_REASON_CODES as readonly string[]).includes(normalized);
}

const MAR_RESCHEDULE_REASON_LABELS_EN: Record<MarRescheduleReasonCode, string> = {
  PATIENT_SLEEPING: "Patient sleeping",
  PATIENT_OFF_UNIT: "Patient off unit",
  PATIENT_REQUEST: "Patient request",
  PROVIDER_REQUEST: "Provider request",
  PROCEDURE_TIMING: "Procedure timing",
  TESTING_IMAGING: "Testing / imaging",
  CLINICAL_CONDITION: "Clinical condition",
  NURSING_WORKFLOW: "Nursing workflow",
  MEDICATION_AVAILABILITY: "Medication availability",
  OTHER: "Other",
};

const MAR_RESCHEDULE_REASON_LABELS_FR: Record<MarRescheduleReasonCode, string> = {
  PATIENT_SLEEPING: "Patient endormi",
  PATIENT_OFF_UNIT: "Patient hors unité",
  PATIENT_REQUEST: "Demande du patient",
  PROVIDER_REQUEST: "Demande du prescripteur",
  PROCEDURE_TIMING: "Horaire de procédure",
  TESTING_IMAGING: "Examens / imagerie",
  CLINICAL_CONDITION: "Condition clinique",
  NURSING_WORKFLOW: "Organisation infirmière",
  MEDICATION_AVAILABILITY: "Disponibilité du médicament",
  OTHER: "Autre",
};

export function resolveMarRescheduleReasonLabel(
  code: string | null | undefined,
  locale: "en" | "fr" = "en"
): string | null {
  const normalized = code?.trim().toUpperCase() ?? "";
  if (!normalized) return null;
  if ((MAR_RESCHEDULE_REASON_CODES as readonly string[]).includes(normalized)) {
    const key = normalized as MarRescheduleReasonCode;
    return locale === "fr"
      ? MAR_RESCHEDULE_REASON_LABELS_FR[key]
      : MAR_RESCHEDULE_REASON_LABELS_EN[key];
  }
  return normalized;
}

export function resolveMarRescheduleReasonLabelKey(
  code: string | null | undefined
): string | null {
  const normalized = code?.trim().toUpperCase() ?? "";
  if (!normalized) return null;
  const canonical = normalizeMarMedicationTimingOverrideReasonCode(normalized);
  if (canonical) return `marTimingOverride.reason.${canonical}`;
  if ((MAR_LEGACY_SCHEDULE_ADJUSTMENT_REASON_CODES as readonly string[]).includes(normalized)) {
    return `marDoseScheduleAdjustment.reasons.${normalized}`;
  }
  return null;
}

export function buildMarRescheduleSummary(input: {
  originalScheduledAt: string;
  previousScheduledAt: string;
  newScheduledAt: string;
  reasonCode: string;
  reasonDetail?: string | null;
  changedByDisplay?: string | null;
  changedAt: string;
  riskSeverity?: string | null;
}): string {
  const reason = input.reasonDetail?.trim()
    ? `${input.reasonCode} — ${input.reasonDetail.trim()}`
    : input.reasonCode;
  const by = input.changedByDisplay?.trim() || "unknown";
  const risk = input.riskSeverity?.trim() || "LOW";
  return [
    `SCHEDULE_TIME_CHANGED`,
    `original=${input.originalScheduledAt}`,
    `previous=${input.previousScheduledAt}`,
    `new=${input.newScheduledAt}`,
    `reason=${reason}`,
    `by=${by}`,
    `at=${input.changedAt}`,
    `risk=${risk}`,
  ].join(" | ");
}

export function validateMarRescheduleGovernance(_input: {
  reasonCode?: string | null;
  otherText?: string | null;
  movedMinutes?: number;
}): { ok: true } {
  return { ok: true };
}

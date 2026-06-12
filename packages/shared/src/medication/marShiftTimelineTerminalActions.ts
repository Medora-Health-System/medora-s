import type { MarClinicalAction } from "../mar/marClinicalAction.js";
import { isMarMissedDoseNotes } from "../mar/marAdministrationSafetyGovernance.js";

/** Structured refuse reasons for MAR shift timeline (M1.8B.7K.9). */
export const MAR_SHIFT_TIMELINE_REFUSE_REASON_CODES = [
  "PATIENT_REFUSED",
  "PROVIDER_ORDER",
  "MEDICATION_UNAVAILABLE",
  "CLINICAL_CONTRAINDICATION",
  "PATIENT_OFF_UNIT",
  "OTHER",
] as const;

export type MarShiftTimelineRefuseReasonCode =
  (typeof MAR_SHIFT_TIMELINE_REFUSE_REASON_CODES)[number];

/** Structured hold reasons for MAR shift timeline (M1.8B.7K.9). */
export const MAR_SHIFT_TIMELINE_HOLD_REASON_CODES = [
  "PROVIDER_ORDER",
  "PATIENT_CONDITION",
  "LOW_BP",
  "LOW_HR",
  "NPO",
  "LAB_CONCERN",
  "MEDICATION_UNAVAILABLE",
  "OTHER",
] as const;

export type MarShiftTimelineHoldReasonCode =
  (typeof MAR_SHIFT_TIMELINE_HOLD_REASON_CODES)[number];

/** Structured missed-dose reasons (K.10B.9). */
export const MAR_SHIFT_TIMELINE_MISSED_REASON_CODES = [
  "PATIENT_UNAVAILABLE",
  "MEDICATION_UNAVAILABLE",
  "TRANSFERRED",
  "PROCEDURE",
  "CLINICAL_HOLD",
  "OTHER",
] as const;

export type MarShiftTimelineMissedReasonCode =
  (typeof MAR_SHIFT_TIMELINE_MISSED_REASON_CODES)[number];

export type MarShiftTimelineTerminalOutcome = "REFUSED" | "HELD" | "MISSED";

const MAR_HOLD_NOTES_PREFIX = "Held:";

export function isMarShiftTimelineHoldNotes(notes: string | null | undefined): boolean {
  return notes?.trim().toLowerCase().startsWith(MAR_HOLD_NOTES_PREFIX.toLowerCase()) === true;
}

export function buildMarShiftTimelineRefuseNotes(
  reasonCode: MarShiftTimelineRefuseReasonCode | string,
  otherText?: string | null
): string {
  const code = String(reasonCode).trim().toUpperCase();
  if (code === "OTHER") {
    const detail = otherText?.trim();
    if (!detail) {
      throw new Error("Refuse reason detail required for OTHER");
    }
    return `Refused: OTHER — ${detail}`;
  }
  return `Refused: ${code}`;
}

export function buildMarShiftTimelineHoldNotes(
  reasonCode: MarShiftTimelineHoldReasonCode | string,
  otherText?: string | null
): string {
  const code = String(reasonCode).trim().toUpperCase();
  if (code === "OTHER") {
    const detail = otherText?.trim();
    if (!detail) {
      throw new Error("Hold reason detail required for OTHER");
    }
    return `${MAR_HOLD_NOTES_PREFIX} OTHER — ${detail}`;
  }
  return `${MAR_HOLD_NOTES_PREFIX} ${code}`;
}

export function buildMarShiftTimelineMissedNotes(
  reasonCode: MarShiftTimelineMissedReasonCode | string,
  otherText?: string | null
): string {
  const code = String(reasonCode).trim().toUpperCase();
  if (code === "OTHER") {
    const detail = otherText?.trim();
    if (!detail) {
      throw new Error("Missed dose reason detail required for OTHER");
    }
    return `Missed: OTHER — ${detail}`;
  }
  return `Missed: ${code}`;
}

export function resolveMarShiftTimelineTerminalOutcome(input: {
  marAction?: string | null;
  notes?: string | null;
  doseStatus?: string | null;
}): MarShiftTimelineTerminalOutcome | null {
  const status = input.doseStatus?.trim().toUpperCase();
  if (status === "MISSED" || isMarMissedDoseNotes(input.notes)) {
    return "MISSED";
  }
  const action = input.marAction?.trim().toLowerCase();
  if (action === "refused") {
    return "REFUSED";
  }
  if (action === "not_available" && !isMarMissedDoseNotes(input.notes)) {
    return "REFUSED";
  }
  if (action === "md_changed" && isMarShiftTimelineHoldNotes(input.notes)) {
    return "HELD";
  }
  return null;
}

export function marShiftTimelineTerminalMarActionForDrawerAction(
  action: "REFUSE" | "HOLD" | "MARK_MISSED"
): MarClinicalAction {
  if (action === "REFUSE") return "refused";
  if (action === "MARK_MISSED") return "not_available";
  return "md_changed";
}

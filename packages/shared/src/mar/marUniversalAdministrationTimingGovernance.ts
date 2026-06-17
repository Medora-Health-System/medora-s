/** MEDUI.ED.MAR.H9 — enterprise early/late administration override reason codes. */
export const MAR_UNIVERSAL_ADMINISTRATION_OVERRIDE_REASON_CODES = [
  "EARLY_ADMINISTRATION",
  "LATE_ADMINISTRATION",
  "PATIENT_CONDITION",
  "PROVIDER_INSTRUCTION",
  "PATIENT_UNAVAILABLE",
  "PROCEDURE_TIMING",
  "NURSING_WORKFLOW",
  "OTHER",
] as const;

export type MarUniversalAdministrationOverrideReasonCode =
  (typeof MAR_UNIVERSAL_ADMINISTRATION_OVERRIDE_REASON_CODES)[number];

export const MAR_DOSE_SCHEDULE_ADJUSTMENT_REASON_CODES = [
  "PROVIDER_INSTRUCTION",
  "PATIENT_CONDITION",
  "PATIENT_UNAVAILABLE",
  "PROCEDURE_TIMING",
  "NURSING_WORKFLOW",
  "EARLY_ADMINISTRATION",
  "LATE_ADMINISTRATION",
  "OTHER",
] as const;

export type MarDoseScheduleAdjustmentReasonCode =
  (typeof MAR_DOSE_SCHEDULE_ADJUSTMENT_REASON_CODES)[number];

export function isMarUniversalAdministrationOverrideReasonCode(
  code: string | null | undefined
): boolean {
  const normalized = code?.trim().toUpperCase() ?? "";
  return (MAR_UNIVERSAL_ADMINISTRATION_OVERRIDE_REASON_CODES as readonly string[]).includes(
    normalized
  );
}

export function isMarDoseScheduleAdjustmentReasonCode(
  code: string | null | undefined
): boolean {
  const normalized = code?.trim().toUpperCase() ?? "";
  return (MAR_DOSE_SCHEDULE_ADJUSTMENT_REASON_CODES as readonly string[]).includes(normalized);
}

export function validateMarDoseScheduleAdjustmentGovernance(input: {
  reasonCode?: string | null;
  otherText?: string | null;
}): { ok: true } | { ok: false; code: "REASON_REQUIRED" | "OTHER_DETAIL_REQUIRED" } {
  const code = input.reasonCode?.trim().toUpperCase() ?? "";
  if (!code || !isMarDoseScheduleAdjustmentReasonCode(code)) {
    return { ok: false, code: "REASON_REQUIRED" };
  }
  if (code === "OTHER" && !input.otherText?.trim()) {
    return { ok: false, code: "OTHER_DETAIL_REQUIRED" };
  }
  return { ok: true };
}

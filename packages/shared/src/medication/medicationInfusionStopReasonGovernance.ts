/** MEDUI.ED.MAR.H6C — structured infusion stop reason governance. */

import { medicationAdministrationRowIsInfusionTerminal } from "../mar/medicationAdministrationInfusionMar.js";

export const MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED = "ORDER_CANCELLED";

export const MEDICATION_INFUSION_STOP_REASON_CODES = [
  "COMPLETED",
  MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED,
  "REACTION",
  "LINE_FAILURE",
  "PROVIDER_DISCONTINUED",
  "PUMP_ISSUE",
] as const;

export type MedicationInfusionStopReasonCode =
  (typeof MEDICATION_INFUSION_STOP_REASON_CODES)[number];

/** Nurse-initiated stop reasons (provider cancel uses ORDER_CANCELLED server-side). */
export const MEDICATION_INFUSION_NURSE_STOP_REASON_CODES = [
  "COMPLETED",
  "REACTION",
  "LINE_FAILURE",
  "PROVIDER_DISCONTINUED",
  "PUMP_ISSUE",
] as const;

export type MedicationInfusionNurseStopReasonCode =
  (typeof MEDICATION_INFUSION_NURSE_STOP_REASON_CODES)[number];

const STOP_REASON_CODE_SET = new Set<string>(MEDICATION_INFUSION_STOP_REASON_CODES);
const NURSE_STOP_REASON_CODE_SET = new Set<string>(MEDICATION_INFUSION_NURSE_STOP_REASON_CODES);

const STOP_REASON_LINE_RE =
  /^Reason:\s*([A-Z0-9_]+)(?:\s*[—-]\s*(.+))?$/im;

export function isMedicationInfusionStopReasonCode(
  raw: unknown
): raw is MedicationInfusionStopReasonCode {
  return typeof raw === "string" && STOP_REASON_CODE_SET.has(raw.trim().toUpperCase());
}

export function isMedicationInfusionNurseStopReasonCode(
  raw: unknown
): raw is MedicationInfusionNurseStopReasonCode {
  return typeof raw === "string" && NURSE_STOP_REASON_CODE_SET.has(raw.trim().toUpperCase());
}

export function parseMedicationInfusionStopReasonCode(
  raw: unknown
): MedicationInfusionStopReasonCode | null {
  if (!isMedicationInfusionStopReasonCode(raw)) return null;
  return raw.trim().toUpperCase() as MedicationInfusionStopReasonCode;
}

export function resolveMedicationInfusionStopReasonI18nKey(
  code: MedicationInfusionStopReasonCode | string | null | undefined
): string | null {
  const parsed = parseMedicationInfusionStopReasonCode(code);
  return parsed ? `marInfusionStopReason.${parsed}` : null;
}

/** Operational scan labels for MAR shift timeline cells (English abbreviations). */
export function resolveMedicationInfusionStopReasonTimelineLabel(
  code: MedicationInfusionStopReasonCode | string | null | undefined
): string | null {
  switch (parseMedicationInfusionStopReasonCode(code)) {
    case "COMPLETED":
      return "Completed";
    case "ORDER_CANCELLED":
      return "Canceled";
    case "REACTION":
      return "Reaction";
    case "LINE_FAILURE":
      return "Line failure";
    case "PROVIDER_DISCONTINUED":
      return "Discontinued";
    case "PUMP_ISSUE":
      return "Pump issue";
    default:
      return null;
  }
}

export function buildMedicationInfusionStopNotes(input: {
  durationMinutes: number;
  stopReasonCode: MedicationInfusionStopReasonCode | string;
  reasonDetail?: string | null;
  supplementalNotes?: string | null;
}): string {
  const code = parseMedicationInfusionStopReasonCode(input.stopReasonCode);
  if (!code) {
    throw new Error("Invalid infusion stop reason code");
  }
  const durationLine = `Perfusion IV terminée — durée : ${Math.max(0, input.durationMinutes)} min`;
  const detail = input.reasonDetail?.trim();
  const reasonLine = detail
    ? `Reason: ${code} — ${detail}`
    : `Reason: ${code}`;
  const supplemental = input.supplementalNotes?.trim();
  return supplemental
    ? `${durationLine}\n\n${reasonLine}\n\n${supplemental}`
    : `${durationLine}\n\n${reasonLine}`;
}

export function parseMedicationInfusionStopReasonFromNotes(
  notes: string | null | undefined
): { reasonCode: MedicationInfusionStopReasonCode | null; reasonDetail: string | null } {
  if (!medicationAdministrationRowIsInfusionTerminal(notes)) {
    return { reasonCode: null, reasonDetail: null };
  }
  const text = notes?.trim() ?? "";
  const reasonMatch = text.match(STOP_REASON_LINE_RE);
  if (!reasonMatch) {
    return { reasonCode: "COMPLETED", reasonDetail: null };
  }
  const reasonCode = parseMedicationInfusionStopReasonCode(reasonMatch[1]);
  const reasonDetail = reasonMatch[2]?.trim() || null;
  return { reasonCode, reasonDetail };
}

export function buildMedicationInfusionOrderCancelStopNotes(input: {
  durationMinutes: number;
  cancelReason: string;
  cancellationDetails?: string | null;
}): string {
  const cancelReason = input.cancelReason.trim() || "ORDER_CANCELED";
  const detailParts = [cancelReason, input.cancellationDetails?.trim()].filter(Boolean);
  return buildMedicationInfusionStopNotes({
    durationMinutes: input.durationMinutes,
    stopReasonCode: MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED,
    reasonDetail: detailParts.join(" — ") || null,
  });
}

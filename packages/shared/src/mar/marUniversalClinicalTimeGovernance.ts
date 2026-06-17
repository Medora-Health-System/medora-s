/** MEDUI.ED.MAR.H9F — universal clinical date/time governance for all MAR actions. */

import {
  MAR_INFUSION_TIMING_SAVE_TOLERANCE_MINUTES,
  marInfusionClinicalTimeDiffersFromSave,
  computeMarInfusionTimingMovedMinutes,
} from "../medication/marInfusionTimingOverrideGovernance.js";
import {
  normalizeMarMedicationTimingOverrideReasonCode,
  validateMarMedicationTimingOverride,
  type MarMedicationTimingOverrideKind,
} from "./marMedicationTimingOverrideGovernance.js";
import { resolveMarShiftTimelineDosePlacementInstant } from "../medication/marShiftTimeline.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
  type MedicationDoseStatus,
} from "../medication/medicationDoseStatus.js";
import {
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
} from "./medicationAdministrationInfusionMar.js";
import { isMarShiftTimelineHoldNotes } from "../medication/marShiftTimelineTerminalActions.js";
import { isMarMissedDoseNotes } from "./marAdministrationSafetyGovernance.js";

export const MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX = "MAR_UNIVERSAL_CLINICAL_TIME:";

export type MarUniversalClinicalActionType =
  | "ADMINISTER"
  | "PRN_ADMINISTER"
  | "REFUSE"
  | "HOLD"
  | "MISSED"
  | "NOT_AVAILABLE"
  | "MD_CHANGED"
  | "IVPB_START"
  | "IVPB_STOP"
  | "INFUSION_START"
  | "INFUSION_STOP"
  | "BOLUS_START"
  | "BOLUS_COMPLETE";

export type MarUniversalClinicalTimeInput = {
  actionType: MarUniversalClinicalActionType;
  scheduledTime?: string | null;
  currentScheduledTime?: string | null;
  originalScheduledTime?: string | null;
  clinicalTime: string;
  documentedAt: string;
  reasonCode?: string | null;
  reasonDetail?: string | null;
  facilityTimeZone?: string | null;
};

export type MarUniversalClinicalTimeResult = {
  actionType: MarUniversalClinicalActionType;
  scheduledTime: string | null;
  currentScheduledTime: string | null;
  originalScheduledTime: string | null;
  clinicalTime: string;
  documentedAt: string;
  varianceMinutes: number | null;
  requiresReason: boolean;
  reasonCode: string | null;
  reasonDetail: string | null;
  isBackdated: boolean;
  isForwarddated: boolean;
  reviewRecommended: boolean;
  placementInstant: string;
};

export const MAR_UNIVERSAL_CLINICAL_TIME_CORRECTION_ACTIONS = [
  "administered",
  "refused",
  "not_available",
  "md_changed",
] as const;

/** Append-only TIME correction supported for these universal clinical event types (H9F.1). */
export const MAR_UNIVERSAL_CLINICAL_TIME_CORRECTION_EVENT_TYPES: readonly MarUniversalClinicalActionType[] =
  [
    "ADMINISTER",
    "PRN_ADMINISTER",
    "REFUSE",
    "HOLD",
    "MISSED",
    "NOT_AVAILABLE",
    "MD_CHANGED",
    "IVPB_START",
    "IVPB_STOP",
    "INFUSION_START",
    "INFUSION_STOP",
    "BOLUS_START",
    "BOLUS_COMPLETE",
  ] as const;

export type MarUniversalClinicalTimeCorrectionContext = {
  marActionResolved?: string | null;
  notes?: string | null;
  infusionPhase?: string | null;
  doseKind?: string | null;
  isPrn?: boolean;
  isFluidBolus?: boolean;
  isContinuousFluid?: boolean;
};

function isIvpbDoseKind(doseKind: string | null | undefined): boolean {
  return doseKind?.trim().toUpperCase() === "IVPB_SESSION";
}

function parseInstant(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function resolveDocumentationOverrideKind(clinical: Date, documented: Date): MarMedicationTimingOverrideKind {
  const deltaMs = clinical.getTime() - documented.getTime();
  if (
    Math.abs(deltaMs) <= MAR_INFUSION_TIMING_SAVE_TOLERANCE_MINUTES * 60_000
  ) {
    return "ON_TIME_ADMINISTRATION";
  }
  return deltaMs < 0 ? "EARLY_ADMINISTRATION" : "LATE_ADMINISTRATION";
}

export function resolveMarUniversalClinicalTimeCorrectionEventType(
  input: MarUniversalClinicalTimeCorrectionContext
): MarUniversalClinicalActionType | null {
  const action = input.marActionResolved?.trim().toLowerCase() ?? "";
  const notes = input.notes ?? null;

  if (action === "refused") return "REFUSE";
  if (action === "not_available") {
    return isMarMissedDoseNotes(notes) ? "MISSED" : "NOT_AVAILABLE";
  }
  if (action === "md_changed") {
    return isMarShiftTimelineHoldNotes(notes) ? "HOLD" : "MD_CHANGED";
  }

  if (action === "administered" || !action) {
    if (medicationAdministrationRowIsInfusionStart(notes, input.infusionPhase)) {
      if (input.isFluidBolus) return "BOLUS_START";
      if (input.isContinuousFluid) return "INFUSION_START";
      if (isIvpbDoseKind(input.doseKind)) return "IVPB_START";
      return "INFUSION_START";
    }
    if (medicationAdministrationRowIsInfusionStop(notes, input.infusionPhase)) {
      if (input.isFluidBolus) return "BOLUS_COMPLETE";
      if (input.isContinuousFluid) return "INFUSION_STOP";
      if (isIvpbDoseKind(input.doseKind)) return "IVPB_STOP";
      return "INFUSION_STOP";
    }
    if (input.isPrn) return "PRN_ADMINISTER";
    if (action === "administered") return "ADMINISTER";
  }

  return null;
}

export function isMarUniversalClinicalTimeCorrectionEligible(
  input: string | MarUniversalClinicalTimeCorrectionContext | null | undefined
): boolean {
  const ctx: MarUniversalClinicalTimeCorrectionContext =
    typeof input === "string" ? { marActionResolved: input } : input ?? {};
  const eventType = resolveMarUniversalClinicalTimeCorrectionEventType(ctx);
  if (!eventType) return false;
  return (MAR_UNIVERSAL_CLINICAL_TIME_CORRECTION_EVENT_TYPES as readonly string[]).includes(
    eventType
  );
}

export function resolveMarUniversalClinicalTime(
  input: MarUniversalClinicalTimeInput
): MarUniversalClinicalTimeResult | null {
  const clinical = parseInstant(input.clinicalTime);
  const documented = parseInstant(input.documentedAt);
  if (!clinical || !documented) return null;

  const scheduledTime = input.scheduledTime?.trim() || null;
  const currentScheduledTime =
    input.currentScheduledTime?.trim() || scheduledTime;
  const originalScheduledTime = input.originalScheduledTime?.trim() || null;

  let varianceMinutes: number | null = null;
  if (currentScheduledTime) {
    const scheduled = parseInstant(currentScheduledTime);
    if (scheduled) {
      varianceMinutes = Math.round((clinical.getTime() - scheduled.getTime()) / 60_000);
    }
  }

  const docDiffers = marInfusionClinicalTimeDiffersFromSave(clinical, documented);
  const docMovedMinutes = computeMarInfusionTimingMovedMinutes(clinical, documented);
  const docOverrideKind = resolveDocumentationOverrideKind(clinical, documented);

  const requiresReason = docDiffers;

  const canonicalReason = normalizeMarMedicationTimingOverrideReasonCode(input.reasonCode);

  const isBackdated = clinical.getTime() < documented.getTime() - MAR_INFUSION_TIMING_SAVE_TOLERANCE_MINUTES * 60_000;
  const isForwarddated = clinical.getTime() > documented.getTime() + MAR_INFUSION_TIMING_SAVE_TOLERANCE_MINUTES * 60_000;
  const reviewRecommended = docMovedMinutes > 120 && docDiffers;

  return {
    actionType: input.actionType,
    scheduledTime,
    currentScheduledTime,
    originalScheduledTime,
    clinicalTime: toIso(clinical),
    documentedAt: toIso(documented),
    varianceMinutes,
    requiresReason,
    reasonCode: canonicalReason,
    reasonDetail: input.reasonDetail?.trim() || null,
    isBackdated,
    isForwarddated,
    reviewRecommended,
    placementInstant: toIso(clinical),
  };
}

export function validateMarUniversalClinicalTime(
  input: MarUniversalClinicalTimeInput
): { ok: true; result: MarUniversalClinicalTimeResult } | { ok: false; code: "INVALID_TIME" | "REASON_REQUIRED" | "DETAIL_REQUIRED" | "INVALID_REASON" } {
  const clinical = parseInstant(input.clinicalTime);
  const documented = parseInstant(input.documentedAt);
  if (!clinical || !documented) {
    return { ok: false, code: "INVALID_TIME" };
  }

  const resolved = resolveMarUniversalClinicalTime(input);
  if (!resolved) return { ok: false, code: "INVALID_TIME" };

  const docDiffers = marInfusionClinicalTimeDiffersFromSave(clinical, documented);
  if (!docDiffers) {
    return { ok: true, result: resolved };
  }

  const docMovedMinutes = computeMarInfusionTimingMovedMinutes(clinical, documented);
  const docOverrideKind = resolveDocumentationOverrideKind(clinical, documented);
  const validation = validateMarMedicationTimingOverride({
    overrideKind: docOverrideKind,
    movedMinutes: docMovedMinutes,
    reasonCode: input.reasonCode,
    reasonDetail: input.reasonDetail,
  });
  if (!validation.ok) {
    if (validation.code === "DETAIL_REQUIRED") return { ok: false, code: "DETAIL_REQUIRED" };
    if (validation.code === "INVALID_REASON") return { ok: false, code: "INVALID_REASON" };
    return { ok: false, code: "REASON_REQUIRED" };
  }

  const canonical = normalizeMarMedicationTimingOverrideReasonCode(input.reasonCode);
  if (!canonical) return { ok: false, code: "REASON_REQUIRED" };
  if (canonical === "OTHER" && !input.reasonDetail?.trim()) {
    return { ok: false, code: "DETAIL_REQUIRED" };
  }

  return { ok: true, result: resolved };
}

export function buildMarUniversalClinicalTimeNotes(input: {
  actionType: MarUniversalClinicalActionType;
  clinicalTime: string;
  documentedAt: string;
  scheduledTime?: string | null;
  currentScheduledTime?: string | null;
  originalScheduledTime?: string | null;
  varianceMinutes?: number | null;
  reasonCode?: string | null;
  reasonDetail?: string | null;
}): string | null {
  const clinical = parseInstant(input.clinicalTime);
  const documented = parseInstant(input.documentedAt);
  if (!clinical || !documented) return null;
  if (!marInfusionClinicalTimeDiffersFromSave(clinical, documented)) return null;

  const canonical = normalizeMarMedicationTimingOverrideReasonCode(input.reasonCode);
  if (!canonical) return null;

  const parts = [
    `action=${input.actionType}`,
    `clinical=${toIso(clinical)}`,
    `documented=${toIso(documented)}`,
  ];
  if (input.scheduledTime?.trim()) parts.push(`scheduled=${input.scheduledTime.trim()}`);
  if (input.currentScheduledTime?.trim()) {
    parts.push(`currentScheduled=${input.currentScheduledTime.trim()}`);
  }
  if (input.originalScheduledTime?.trim()) {
    parts.push(`originalScheduled=${input.originalScheduledTime.trim()}`);
  }
  if (input.varianceMinutes != null) parts.push(`variance=${input.varianceMinutes}`);
  parts.push(`reason=${canonical}`);
  if (input.reasonDetail?.trim()) parts.push(`detail=${input.reasonDetail.trim()}`);

  return `${MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX} ${parts.join(" ")}`;
}

export type MarUniversalClinicalTimeNotesParsed = {
  actionType: MarUniversalClinicalActionType | null;
  clinicalTime: string | null;
  documentedAt: string | null;
  scheduledTime: string | null;
  currentScheduledTime: string | null;
  originalScheduledTime: string | null;
  varianceMinutes: number | null;
  reasonCode: string | null;
  reasonDetail: string | null;
};

export function parseMarUniversalClinicalTimeNotes(
  notes: string | null | undefined
): MarUniversalClinicalTimeNotesParsed | null {
  if (!notes?.trim()) return null;
  const line = notes
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX));
  if (!line) return null;

  const payload = line.slice(MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX.length).trim();
  const parsed: MarUniversalClinicalTimeNotesParsed = {
    actionType: null,
    clinicalTime: null,
    documentedAt: null,
    scheduledTime: null,
    currentScheduledTime: null,
    originalScheduledTime: null,
    varianceMinutes: null,
    reasonCode: null,
    reasonDetail: null,
  };

  for (const token of payload.split(/\s+/)) {
    const eq = token.indexOf("=");
    if (eq < 0) continue;
    const key = token.slice(0, eq);
    const value = token.slice(eq + 1);
    switch (key) {
      case "action":
        parsed.actionType = value as MarUniversalClinicalActionType;
        break;
      case "clinical":
        parsed.clinicalTime = value;
        break;
      case "documented":
        parsed.documentedAt = value;
        break;
      case "scheduled":
        parsed.scheduledTime = value;
        break;
      case "currentScheduled":
        parsed.currentScheduledTime = value;
        break;
      case "originalScheduled":
        parsed.originalScheduledTime = value;
        break;
      case "variance":
        parsed.varianceMinutes = Number(value);
        break;
      case "reason":
        parsed.reasonCode = value;
        break;
      case "detail":
        parsed.reasonDetail = value;
        break;
      default:
        break;
    }
  }

  return parsed.clinicalTime ? parsed : null;
}

export function resolveMarUniversalPlacementInstant(input: {
  clinicalTime?: string | null;
  adjustedScheduledTime?: string | null;
  originalScheduledTime?: string | null;
  isTerminalOrCompleted?: boolean;
  isRunningInfusion?: boolean;
  isPending?: boolean;
  dosePlacement?: Parameters<typeof resolveMarShiftTimelineDosePlacementInstant>[0];
}): Date {
  if (input.isTerminalOrCompleted) {
    const clinical = parseInstant(input.clinicalTime);
    if (clinical) return clinical;
  }
  if (input.isRunningInfusion) {
    const clinical = parseInstant(input.clinicalTime);
    if (clinical) return clinical;
  }
  if (input.isPending) {
    const adjusted = parseInstant(input.adjustedScheduledTime);
    if (adjusted) return adjusted;
  }
  if (input.dosePlacement) {
    return resolveMarShiftTimelineDosePlacementInstant(input.dosePlacement);
  }
  const original = parseInstant(input.originalScheduledTime);
  if (original) return original;
  const clinical = parseInstant(input.clinicalTime);
  if (clinical) return clinical;
  return new Date();
}

type MarUniversalShiftTimelineDosePlacementInput = {
  doseStatus: MedicationDoseStatus | string;
  doseKind?: string | null;
  scheduledAt: Date;
  adjustedScheduledAt?: Date | string | null;
  originalScheduledAt?: Date | string | null;
  enrichment?: Parameters<typeof resolveMarShiftTimelineDosePlacementInstant>[0]["enrichment"];
  fluid?: Parameters<typeof resolveMarShiftTimelineDosePlacementInstant>[0]["fluid"];
};

/**
 * MEDUI.ED.MAR.H9F.1 — single placement entry for MAR shift timeline doses.
 * Wraps dose-specific clinical extraction with universal placement policy.
 */
export function resolveMarUniversalShiftTimelineDosePlacementInstant(
  input: MarUniversalShiftTimelineDosePlacementInput
): Date {
  const status =
    typeof input.doseStatus === "string"
      ? parseMedicationDoseStatus(input.doseStatus)
      : input.doseStatus;

  const dosePlacementInput = {
    doseStatus: input.doseStatus,
    doseKind: input.doseKind,
    scheduledAt: input.scheduledAt,
    enrichment: input.enrichment,
    fluid: input.fluid,
  };

  const doseClinicalPlacement = resolveMarShiftTimelineDosePlacementInstant(dosePlacementInput);
  const isRunningInfusion = status === "IN_PROGRESS";
  const isTerminalOrCompleted = status ? isTerminalMedicationDoseStatus(status) : false;
  const isPending = Boolean(status && !isTerminalOrCompleted && !isRunningInfusion);

  return resolveMarUniversalPlacementInstant({
    clinicalTime:
      isTerminalOrCompleted || isRunningInfusion ? doseClinicalPlacement.toISOString() : null,
    adjustedScheduledTime: input.adjustedScheduledAt
      ? new Date(input.adjustedScheduledAt).toISOString()
      : input.scheduledAt.toISOString(),
    originalScheduledTime: input.originalScheduledAt
      ? new Date(input.originalScheduledAt).toISOString()
      : null,
    isTerminalOrCompleted,
    isRunningInfusion,
    isPending,
    dosePlacement: dosePlacementInput,
  });
}

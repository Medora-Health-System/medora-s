import {
  buildMarUniversalClinicalTimeNotes,
  resolveMarUniversalClinicalTime,
  validateMarUniversalClinicalTime,
  type MarUniversalClinicalActionType,
  type MarUniversalClinicalTimeInput,
} from "@medora/shared";
import {
  marShiftTimelineDateTimeLocalToUtcIso,
  toMarShiftTimelineDateTimeLocalValue,
} from "@/features/mar/marShiftTimelineDisplay";

export function defaultMarClinicalDateTimeLocalValue(
  documentedAtIso: string,
  facilityTimeZone?: string | null
): string {
  return toMarShiftTimelineDateTimeLocalValue(documentedAtIso, facilityTimeZone);
}

export function marClinicalDateTimeLocalToUtcIso(
  localValue: string,
  facilityTimeZone?: string | null
): string | null {
  return marShiftTimelineDateTimeLocalToUtcIso(localValue, facilityTimeZone);
}

export function validateMarClinicalDateTimeField(input: {
  actionType: MarUniversalClinicalActionType;
  clinicalTimeLocal: string;
  documentedAtIso: string;
  scheduledTime?: string | null;
  currentScheduledTime?: string | null;
  originalScheduledTime?: string | null;
  reasonCode?: string;
  reasonDetail?: string;
  facilityTimeZone?: string | null;
}):
  | { ok: true; clinicalTimeIso: string; documentedAtIso: string }
  | { ok: false; code: "INVALID_TIME" | "REASON_REQUIRED" | "DETAIL_REQUIRED" | "INVALID_REASON" } {
  const clinicalTimeIso = marClinicalDateTimeLocalToUtcIso(
    input.clinicalTimeLocal,
    input.facilityTimeZone
  );
  if (!clinicalTimeIso) {
    return { ok: false, code: "INVALID_TIME" };
  }
  const governanceInput: MarUniversalClinicalTimeInput = {
    actionType: input.actionType,
    scheduledTime: input.scheduledTime,
    currentScheduledTime: input.currentScheduledTime,
    originalScheduledTime: input.originalScheduledTime,
    clinicalTime: clinicalTimeIso,
    documentedAt: input.documentedAtIso,
    reasonCode: input.reasonCode,
    reasonDetail: input.reasonDetail,
    facilityTimeZone: input.facilityTimeZone,
  };
  const validation = validateMarUniversalClinicalTime(governanceInput);
  if (!validation.ok) return validation;
  return {
    ok: true,
    clinicalTimeIso,
    documentedAtIso: input.documentedAtIso,
  };
}

export function buildMarClinicalTimeDocumentationNotes(input: {
  actionType: MarUniversalClinicalActionType;
  clinicalTimeIso: string;
  documentedAtIso: string;
  scheduledTime?: string | null;
  currentScheduledTime?: string | null;
  originalScheduledTime?: string | null;
  reasonCode?: string;
  reasonDetail?: string;
}): string | null {
  const resolved = resolveMarUniversalClinicalTime({
    actionType: input.actionType,
    scheduledTime: input.scheduledTime,
    currentScheduledTime: input.currentScheduledTime,
    originalScheduledTime: input.originalScheduledTime,
    clinicalTime: input.clinicalTimeIso,
    documentedAt: input.documentedAtIso,
    reasonCode: input.reasonCode,
    reasonDetail: input.reasonDetail,
  });
  return buildMarUniversalClinicalTimeNotes({
    actionType: input.actionType,
    clinicalTime: input.clinicalTimeIso,
    documentedAt: input.documentedAtIso,
    scheduledTime: input.scheduledTime,
    currentScheduledTime: input.currentScheduledTime,
    originalScheduledTime: input.originalScheduledTime,
    varianceMinutes: resolved?.varianceMinutes ?? null,
    reasonCode: input.reasonCode,
    reasonDetail: input.reasonDetail,
  });
}

export function marDrawerActionToUniversalClinicalActionType(
  action: string,
  options?: { isPrn?: boolean; isFluidBolus?: boolean; isIvpb?: boolean; isStop?: boolean }
): MarUniversalClinicalActionType {
  if (options?.isStop) {
    if (options.isFluidBolus) return "BOLUS_COMPLETE";
    if (options.isIvpb) return "IVPB_STOP";
    return "INFUSION_STOP";
  }
  switch (action) {
    case "REFUSE":
      return "REFUSE";
    case "HOLD":
      return "HOLD";
    case "MARK_MISSED":
      return "MISSED";
    case "START_FLUID":
      return options?.isFluidBolus ? "BOLUS_START" : "INFUSION_START";
    case "START_INFUSION":
      return options?.isIvpb ? "IVPB_START" : "INFUSION_START";
    case "STOP_INFUSION":
      return options?.isIvpb ? "IVPB_STOP" : "INFUSION_STOP";
    case "STOP_FLUID":
      return options?.isFluidBolus ? "BOLUS_COMPLETE" : "INFUSION_STOP";
    case "COMPLETE_BOLUS":
      return "BOLUS_COMPLETE";
    case "ADMINISTER":
      return options?.isPrn ? "PRN_ADMINISTER" : "ADMINISTER";
    default:
      return "ADMINISTER";
  }
}

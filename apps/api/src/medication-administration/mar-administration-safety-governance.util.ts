import type { MedicationDoseInstance, MedicationOrderSchedule } from "@prisma/client";
import type { MarClinicalAction, MedicationAdministrationCreateDto } from "@medora/shared";
import {
  evaluateMarScheduleTimingGovernance,
  isMarMissedDoseMarCreate,
  parseMarMissedDoseReasonFromNotes,
  parseMarScheduleTimingReasonFromNotes,
  parseMedicationAdministrationEffectiveTimeIso,
  toMedicationAdministrationEffectiveTimeIsoUtc,
  validateMarMissedDoseGovernance,
  validateMarScheduleTimingGovernance,
} from "@medora/shared";
import { marValidationBadRequest } from "./mar-create-validation-log.util";

export const MAR_EARLY_ADMIN_REASON_REQUIRED = "MAR_EARLY_ADMIN_REASON_REQUIRED";
export const MAR_LATE_ADMIN_REASON_REQUIRED = "MAR_LATE_ADMIN_REASON_REQUIRED";
export const MAR_MISSED_REASON_REQUIRED = "MAR_MISSED_REASON_REQUIRED";

const MAR_SAFETY_GOVERNANCE_MESSAGES = {
  [MAR_EARLY_ADMIN_REASON_REQUIRED]: "Early administration requires a reason.",
  [MAR_LATE_ADMIN_REASON_REQUIRED]: "Late administration requires a reason.",
  [MAR_MISSED_REASON_REQUIRED]: "Missed dose requires a reason.",
} as const;

export type MarScheduleGovernanceDoseInstance = Pick<
  MedicationDoseInstance,
  "scheduledAt" | "dueWindowStartAt" | "dueWindowEndAt"
> & { medicationOrderSchedule?: MedicationOrderSchedule | null };

export function resolveMarCreateClinicalAdministrationInstant(
  data: MedicationAdministrationCreateDto,
  fallback: Date = new Date()
): Date {
  const effectiveRaw = data.effectiveAdministeredAt?.trim();
  if (effectiveRaw) {
    const parsed = parseMedicationAdministrationEffectiveTimeIso(effectiveRaw);
    if (parsed) {
      return new Date(toMedicationAdministrationEffectiveTimeIsoUtc(parsed));
    }
  }
  return data.administeredAt ?? fallback;
}

function resolveScheduleTimingReasonInput(data: MedicationAdministrationCreateDto): {
  reasonCode: string | null;
  otherText: string | null;
} {
  if (data.scheduleTimingReasonCode?.trim()) {
    return {
      reasonCode: data.scheduleTimingReasonCode.trim(),
      otherText: data.scheduleTimingReasonText?.trim() || null,
    };
  }
  const fromNotes = parseMarScheduleTimingReasonFromNotes(data.notes);
  if (fromNotes) {
    return { reasonCode: fromNotes.reasonCode, otherText: fromNotes.otherText };
  }
  return { reasonCode: null, otherText: null };
}

function resolveMissedDoseReasonInput(data: MedicationAdministrationCreateDto): {
  reasonCode: string | null;
  otherText: string | null;
} {
  if (data.missedReasonCode?.trim()) {
    return {
      reasonCode: data.missedReasonCode.trim(),
      otherText: data.missedReasonText?.trim() || null,
    };
  }
  const fromNotes = parseMarMissedDoseReasonFromNotes(data.notes);
  if (fromNotes) {
    return { reasonCode: fromNotes.reasonCode, otherText: fromNotes.otherText };
  }
  return { reasonCode: null, otherText: null };
}

/** Enforces K.10B.9 early/late schedule timing governance on MAR create (K.10B.9A). */
export function assertMarScheduleTimingGovernanceForCreate(input: {
  marAction: MarClinicalAction;
  data: MedicationAdministrationCreateDto;
  doseInstance: MarScheduleGovernanceDoseInstance | null | undefined;
  facilityTimeZone: string;
  skipForInfusionLifecycle?: boolean;
}): void {
  if (input.skipForInfusionLifecycle) return;
  if (input.marAction !== "administered") return;

  const scheduledAt = input.doseInstance?.scheduledAt;
  if (!scheduledAt) return;

  const administeredAt = resolveMarCreateClinicalAdministrationInstant(input.data);
  const timing = evaluateMarScheduleTimingGovernance({
    administeredAt,
    scheduledAt,
    dueWindowStartAt: input.doseInstance?.dueWindowStartAt ?? scheduledAt,
    dueWindowEndAt: input.doseInstance?.dueWindowEndAt ?? scheduledAt,
    facilityTimeZone: input.facilityTimeZone,
    locale: "en-US",
  });

  if (!timing.requiresReason) return;

  const reason = resolveScheduleTimingReasonInput(input.data);
  const validation = validateMarScheduleTimingGovernance({
    timing,
    reasonCode: reason.reasonCode,
    otherText: reason.otherText,
  });

  if (validation.ok) return;

  const code =
    timing.kind === "early" ? MAR_EARLY_ADMIN_REASON_REQUIRED : MAR_LATE_ADMIN_REASON_REQUIRED;
  throw marValidationBadRequest(code, MAR_SAFETY_GOVERNANCE_MESSAGES[code]);
}

/** Enforces K.10B.9 missed-dose reason governance on MAR create (K.10B.9A). */
export function assertMarMissedDoseGovernanceForCreate(input: {
  marAction: MarClinicalAction;
  data: MedicationAdministrationCreateDto;
  skipForInfusionLifecycle?: boolean;
}): void {
  if (input.skipForInfusionLifecycle) return;

  if (
    !isMarMissedDoseMarCreate({
      marAction: input.marAction,
      notes: input.data.notes,
      missedReasonCode: input.data.missedReasonCode,
    })
  ) {
    return;
  }

  const reason = resolveMissedDoseReasonInput(input.data);
  const validation = validateMarMissedDoseGovernance({
    reasonCode: reason.reasonCode,
    otherText: reason.otherText,
  });

  if (validation.ok) return;

  throw marValidationBadRequest(
    MAR_MISSED_REASON_REQUIRED,
    MAR_SAFETY_GOVERNANCE_MESSAGES[MAR_MISSED_REASON_REQUIRED]
  );
}

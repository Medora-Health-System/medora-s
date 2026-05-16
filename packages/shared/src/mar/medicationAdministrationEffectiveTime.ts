import { z } from "zod";
import { deltaMinutesBetween } from "../orders/careProcedureEffectiveClinicalTime.js";

export { deltaMinutesBetween };

export const medicationAdministrationEffectiveTimeDtoSchema = z
  .object({
    effectiveAdministeredTime: z.string().min(1),
    reason: z.string().max(500).optional(),
  })
  .strict();

export type MedicationAdministrationEffectiveTimeDto = z.infer<
  typeof medicationAdministrationEffectiveTimeDtoSchema
>;

const LARGE_DELTA_MINUTES = 60;
const MS_24H = 24 * 60 * 60 * 1000;

/** Minimum trimmed reason length when effective time is >24h before system documented time (`createdAt`). */
export const MEDICATION_ADMIN_LARGE_BACKDATE_MIN_REASON_LENGTH = 15;

export {
  INFUSION_START_MAR_NOTE_PREFIX,
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
  medicationAdministrationRowIsInfusionTerminal,
} from "./medicationAdministrationInfusionMar.js";

export function parseMedicationAdministrationEffectiveTimeIso(iso: string): Date | null {
  const trimmed = String(iso).trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function toMedicationAdministrationEffectiveTimeIsoUtc(date: Date): string {
  return date.toISOString();
}

export function medicationAdminEffectiveTimeIsLargeBackdate(
  effectiveAdministeredTime: Date,
  systemDocumentedAt: Date | null
): boolean {
  if (!systemDocumentedAt) return false;
  return systemDocumentedAt.getTime() - effectiveAdministeredTime.getTime() > MS_24H;
}

export function medicationAdminEffectiveTimesDiffer(
  effectiveAdministeredTime: Date | null,
  originalAdministeredAt: Date | null
): boolean {
  if (!effectiveAdministeredTime || !originalAdministeredAt) return false;
  return effectiveAdministeredTime.getTime() !== originalAdministeredAt.getTime();
}

export function medicationAdminEffectiveTimeRequiresReason(input: {
  effectiveAdministeredTime: Date;
  originalAdministeredAt: Date;
  systemDocumentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date | null;
  adjustmentVersion: number;
  controlledMedication: boolean;
  afterOrderDiscontinued: boolean;
  beforeOrderExisted: boolean;
}): boolean {
  const {
    effectiveAdministeredTime,
    originalAdministeredAt,
    systemDocumentedAt,
    orderCreatedAt,
    orderItemCreatedAt,
    adjustmentVersion,
    controlledMedication,
    afterOrderDiscontinued,
    beforeOrderExisted,
  } = input;

  if (controlledMedication) return true;
  if (adjustmentVersion > 0) return true;
  if (beforeOrderExisted) return true;
  if (afterOrderDiscontinued) return true;
  if (effectiveAdministeredTime.getTime() < orderCreatedAt.getTime()) return true;
  if (orderItemCreatedAt && effectiveAdministeredTime.getTime() < orderItemCreatedAt.getTime()) return true;
  if (medicationAdminEffectiveTimeIsLargeBackdate(effectiveAdministeredTime, systemDocumentedAt)) return true;

  const deltaMs = Math.abs(
    effectiveAdministeredTime.getTime() - originalAdministeredAt.getTime()
  );
  if (deltaMs > LARGE_DELTA_MINUTES * 60_000) return true;

  return false;
}

export function medicationAdminEffectiveTimeRequiresDetailedReason(input: {
  effectiveAdministeredTime: Date;
  systemDocumentedAt: Date;
  reason?: string | null;
}): boolean {
  if (
    !medicationAdminEffectiveTimeIsLargeBackdate(
      input.effectiveAdministeredTime,
      input.systemDocumentedAt
    )
  ) {
    return false;
  }
  const trimmed = input.reason?.trim() ?? "";
  return trimmed.length < MEDICATION_ADMIN_LARGE_BACKDATE_MIN_REASON_LENGTH;
}

export type MedicationAdminEffectiveTimeValidationCode =
  | "FUTURE_TIME"
  | "BEFORE_ENCOUNTER"
  | "REASON_REQUIRED"
  | "REASON_TOO_SHORT_FOR_LARGE_BACKDATE"
  | "INVALID_TIME"
  | "NOT_ADMINISTERED"
  | "INFUSION_DEFERRED"
  | "PENDING_SYNC";

export function validateMedicationAdministrationEffectiveTime(input: {
  effectiveAdministeredTime: Date;
  now: Date;
  encounterAnchorAt: Date;
  originalAdministeredAt: Date;
  systemDocumentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date | null;
  orderCancelledAt: Date | null;
  adjustmentVersion: number;
  reason?: string | null;
  controlledMedication: boolean;
  marActionAdministered: boolean;
}):
  | { ok: true }
  | { ok: false; code: MedicationAdminEffectiveTimeValidationCode; messageKey: string } {
  const {
    effectiveAdministeredTime,
    now,
    encounterAnchorAt,
    originalAdministeredAt,
    systemDocumentedAt,
    orderCreatedAt,
    orderItemCreatedAt,
    orderCancelledAt,
    adjustmentVersion,
    reason,
    controlledMedication,
    marActionAdministered,
  } = input;

  if (Number.isNaN(effectiveAdministeredTime.getTime())) {
    return { ok: false, code: "INVALID_TIME", messageKey: "marTab.adminTime.invalidTime" };
  }
  if (!marActionAdministered) {
    return { ok: false, code: "NOT_ADMINISTERED", messageKey: "marTab.adminTime.notAdministered" };
  }
  if (effectiveAdministeredTime.getTime() > now.getTime()) {
    return { ok: false, code: "FUTURE_TIME", messageKey: "marTab.adminTime.futureTimeRejected" };
  }
  if (effectiveAdministeredTime.getTime() < encounterAnchorAt.getTime()) {
    return { ok: false, code: "BEFORE_ENCOUNTER", messageKey: "marTab.adminTime.beforeEncounter" };
  }

  const orderItemAnchor = orderItemCreatedAt ?? orderCreatedAt;
  const beforeOrderExisted = effectiveAdministeredTime.getTime() < orderItemAnchor.getTime();
  const afterOrderDiscontinued =
    orderCancelledAt != null && effectiveAdministeredTime.getTime() > orderCancelledAt.getTime();

  const needsReason = medicationAdminEffectiveTimeRequiresReason({
    effectiveAdministeredTime,
    originalAdministeredAt,
    systemDocumentedAt,
    orderCreatedAt,
    orderItemCreatedAt,
    adjustmentVersion,
    controlledMedication,
    afterOrderDiscontinued,
    beforeOrderExisted,
  });

  const reasonTrimmed = reason?.trim() ?? "";
  if (needsReason && !reasonTrimmed) {
    return { ok: false, code: "REASON_REQUIRED", messageKey: "marTab.adminTime.reasonRequired" };
  }

  if (
    medicationAdminEffectiveTimeRequiresDetailedReason({
      effectiveAdministeredTime,
      systemDocumentedAt,
      reason: reasonTrimmed,
    })
  ) {
    return {
      ok: false,
      code: "REASON_TOO_SHORT_FOR_LARGE_BACKDATE",
      messageKey: "marTab.adminTime.reasonTooShortForLargeBackdate",
    };
  }

  return { ok: true };
}

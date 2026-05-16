import { z } from "zod";

export const careProcedureEffectiveClinicalTimeDtoSchema = z
  .object({
    effectiveClinicalTime: z.string().min(1),
    reason: z.string().max(500).optional(),
  })
  .strict();

export type CareProcedureEffectiveClinicalTimeDto = z.infer<
  typeof careProcedureEffectiveClinicalTimeDtoSchema
>;

export const orderItemCompleteWithClinicalTimeDtoSchema = z
  .object({
    effectiveClinicalTime: z.string().min(1).optional(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export type OrderItemCompleteWithClinicalTimeDto = z.infer<
  typeof orderItemCompleteWithClinicalTimeDtoSchema
>;

const LARGE_DELTA_MINUTES = 60;
const MS_24H = 24 * 60 * 60 * 1000;

/** Minimum trimmed reason length when effective time is >24h before documented/system time. */
export const CARE_PROCEDURE_LARGE_BACKDATE_MIN_REASON_LENGTH = 15;

export function isCareProcedureOrderItem(catalogItemType: string, orderType: string): boolean {
  return catalogItemType === "CARE" && orderType === "CARE";
}

/** Parse client ISO / datetime string to a Date (UTC instant). Returns null if invalid. */
export function parseCareProcedureEffectiveClinicalTimeIso(iso: string): Date | null {
  const trimmed = String(iso).trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Persist / audit as canonical UTC ISO-8601. */
export function toCareProcedureEffectiveClinicalTimeIsoUtc(date: Date): string {
  return date.toISOString();
}

export function careProcedureEffectiveTimeIsLargeBackdate(
  effectiveClinicalTime: Date,
  documentedCompletedAt: Date | null
): boolean {
  if (!documentedCompletedAt) return false;
  return documentedCompletedAt.getTime() - effectiveClinicalTime.getTime() > MS_24H;
}

export function careProcedureEffectiveTimesDiffer(
  effectiveClinicalTime: Date | null,
  documentedCompletedAt: Date | null
): boolean {
  if (!effectiveClinicalTime || !documentedCompletedAt) return false;
  return effectiveClinicalTime.getTime() !== documentedCompletedAt.getTime();
}

export function careProcedureEffectiveTimeRequiresReason(input: {
  effectiveClinicalTime: Date;
  documentedCompletedAt: Date | null;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
}): boolean {
  const { effectiveClinicalTime, documentedCompletedAt, orderCreatedAt, orderItemCreatedAt, adjustmentVersion } =
    input;
  if (adjustmentVersion > 0) return true;
  if (effectiveClinicalTime.getTime() < orderCreatedAt.getTime()) return true;
  if (effectiveClinicalTime.getTime() < orderItemCreatedAt.getTime()) return true;
  if (careProcedureEffectiveTimeIsLargeBackdate(effectiveClinicalTime, documentedCompletedAt)) return true;
  if (documentedCompletedAt) {
    const deltaMs = Math.abs(effectiveClinicalTime.getTime() - documentedCompletedAt.getTime());
    if (deltaMs > LARGE_DELTA_MINUTES * 60_000) return true;
  }
  return false;
}

export function careProcedureEffectiveTimeRequiresDetailedReason(input: {
  effectiveClinicalTime: Date;
  documentedCompletedAt: Date | null;
  reason?: string | null;
}): boolean {
  if (!careProcedureEffectiveTimeIsLargeBackdate(input.effectiveClinicalTime, input.documentedCompletedAt)) {
    return false;
  }
  const trimmed = input.reason?.trim() ?? "";
  return trimmed.length < CARE_PROCEDURE_LARGE_BACKDATE_MIN_REASON_LENGTH;
}

export type CareProcedureEffectiveTimeValidationCode =
  | "FUTURE_TIME"
  | "BEFORE_ENCOUNTER"
  | "REASON_REQUIRED"
  | "REASON_TOO_SHORT_FOR_LARGE_BACKDATE"
  | "INVALID_TIME";

export function validateCareProcedureEffectiveClinicalTime(input: {
  effectiveClinicalTime: Date;
  now: Date;
  encounterAnchorAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  documentedCompletedAt: Date | null;
  adjustmentVersion: number;
  reason?: string | null;
}):
  | { ok: true }
  | { ok: false; code: CareProcedureEffectiveTimeValidationCode; messageKey: string } {
  const {
    effectiveClinicalTime,
    now,
    encounterAnchorAt,
    orderCreatedAt,
    orderItemCreatedAt,
    adjustmentVersion,
    reason,
    documentedCompletedAt,
  } = input;

  if (Number.isNaN(effectiveClinicalTime.getTime())) {
    return { ok: false, code: "INVALID_TIME", messageKey: "orders.careClinicalTime.invalidTime" };
  }
  if (effectiveClinicalTime.getTime() > now.getTime()) {
    return { ok: false, code: "FUTURE_TIME", messageKey: "orders.careClinicalTime.futureTimeRejected" };
  }
  if (effectiveClinicalTime.getTime() < encounterAnchorAt.getTime()) {
    return { ok: false, code: "BEFORE_ENCOUNTER", messageKey: "orders.careClinicalTime.beforeEncounter" };
  }

  const needsReason = careProcedureEffectiveTimeRequiresReason({
    effectiveClinicalTime,
    documentedCompletedAt,
    orderCreatedAt,
    orderItemCreatedAt,
    adjustmentVersion,
  });
  const reasonTrimmed = reason?.trim() ?? "";

  if (needsReason && !reasonTrimmed) {
    return { ok: false, code: "REASON_REQUIRED", messageKey: "orders.careClinicalTime.reasonRequired" };
  }

  if (
    careProcedureEffectiveTimeRequiresDetailedReason({
      effectiveClinicalTime,
      documentedCompletedAt,
      reason: reasonTrimmed,
    })
  ) {
    return {
      ok: false,
      code: "REASON_TOO_SHORT_FOR_LARGE_BACKDATE",
      messageKey: "orders.careClinicalTime.reasonTooShortForLargeBackdate",
    };
  }

  return { ok: true };
}

export function deltaMinutesBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / 60_000);
}

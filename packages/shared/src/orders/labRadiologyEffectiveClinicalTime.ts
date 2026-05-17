import { z } from "zod";

const labRadEffectiveTimeBodySchema = z
  .object({
    effectiveClinicalTime: z.string().trim().min(1).optional(),
    effectiveAdministeredAt: z.string().trim().min(1).optional(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export const labRadiologyEffectiveClinicalTimeDtoSchema = labRadEffectiveTimeBodySchema
  .transform((body) => ({
    effectiveClinicalTime:
      body.effectiveClinicalTime?.trim() || body.effectiveAdministeredAt?.trim() || "",
    reason: body.reason?.trim() || undefined,
  }))
  .pipe(
    z.object({
      effectiveClinicalTime: z.string().min(1, "Horodatage clinique requis."),
      reason: z.string().max(500).optional(),
    })
  );

export type LabRadiologyEffectiveClinicalTimeDto = z.infer<
  typeof labRadiologyEffectiveClinicalTimeDtoSchema
>;

const LARGE_DELTA_MINUTES = 60;
const MS_24H = 24 * 60 * 60 * 1000;

export const LAB_RAD_LARGE_BACKDATE_MIN_REASON_LENGTH = 15;

export function parseLabRadiologyEffectiveClinicalTimeIso(iso: string): Date | null {
  const trimmed = String(iso).trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function toLabRadiologyEffectiveClinicalTimeIsoUtc(date: Date): string {
  return date.toISOString();
}

export function labRadEffectiveTimeIsLargeBackdate(
  effectiveTime: Date,
  documentedAt: Date | null
): boolean {
  if (!documentedAt) return false;
  return documentedAt.getTime() - effectiveTime.getTime() > MS_24H;
}

export function labRadEffectiveTimesDiffer(
  effectiveTime: Date | null,
  documentedAt: Date | null
): boolean {
  if (!effectiveTime || !documentedAt) return false;
  return effectiveTime.getTime() !== documentedAt.getTime();
}

export function labRadEffectiveTimeRequiresReason(input: {
  effectiveTime: Date;
  documentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
}): boolean {
  const { effectiveTime, documentedAt, orderCreatedAt, orderItemCreatedAt, adjustmentVersion } = input;
  if (adjustmentVersion > 0) return true;
  if (effectiveTime.getTime() < orderCreatedAt.getTime()) return true;
  if (effectiveTime.getTime() < orderItemCreatedAt.getTime()) return true;
  if (labRadEffectiveTimeIsLargeBackdate(effectiveTime, documentedAt)) return true;
  const deltaMs = Math.abs(effectiveTime.getTime() - documentedAt.getTime());
  if (deltaMs > LARGE_DELTA_MINUTES * 60_000) return true;
  return false;
}

export function labRadEffectiveTimeRequiresDetailedReason(input: {
  effectiveTime: Date;
  documentedAt: Date;
  reason?: string | null;
}): boolean {
  if (!labRadEffectiveTimeIsLargeBackdate(input.effectiveTime, input.documentedAt)) return false;
  const trimmed = input.reason?.trim() ?? "";
  return trimmed.length < LAB_RAD_LARGE_BACKDATE_MIN_REASON_LENGTH;
}

export type LabRadEffectiveTimeValidationCode =
  | "FUTURE_TIME"
  | "BEFORE_ENCOUNTER"
  | "REASON_REQUIRED"
  | "REASON_TOO_SHORT_FOR_LARGE_BACKDATE"
  | "INVALID_TIME"
  | "NOT_READY"
  | "WRONG_WORKFLOW";

export function validateLabRadiologyEffectiveClinicalTime(input: {
  effectiveTime: Date;
  now: Date;
  encounterAnchorAt: Date;
  documentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
  reason?: string | null;
}):
  | { ok: true }
  | { ok: false; code: LabRadEffectiveTimeValidationCode; messageKey: string } {
  const {
    effectiveTime,
    now,
    encounterAnchorAt,
    documentedAt,
    orderCreatedAt,
    orderItemCreatedAt,
    adjustmentVersion,
    reason,
  } = input;

  if (Number.isNaN(effectiveTime.getTime())) {
    return { ok: false, code: "INVALID_TIME", messageKey: "labRadTime.invalidTime" };
  }
  if (effectiveTime.getTime() > now.getTime()) {
    return { ok: false, code: "FUTURE_TIME", messageKey: "labRadTime.futureTimeRejected" };
  }
  if (effectiveTime.getTime() < encounterAnchorAt.getTime()) {
    return { ok: false, code: "BEFORE_ENCOUNTER", messageKey: "labRadTime.beforeEncounter" };
  }

  const needsReason = labRadEffectiveTimeRequiresReason({
    effectiveTime,
    documentedAt,
    orderCreatedAt,
    orderItemCreatedAt,
    adjustmentVersion,
  });
  const reasonTrimmed = reason?.trim() ?? "";
  if (needsReason && !reasonTrimmed) {
    return { ok: false, code: "REASON_REQUIRED", messageKey: "labRadTime.reasonRequired" };
  }
  if (
    labRadEffectiveTimeRequiresDetailedReason({
      effectiveTime,
      documentedAt,
      reason: reasonTrimmed,
    })
  ) {
    return {
      ok: false,
      code: "REASON_TOO_SHORT_FOR_LARGE_BACKDATE",
      messageKey: "labRadTime.reasonTooShortForLargeBackdate",
    };
  }
  return { ok: true };
}

export type LabRadOrderItemMilestone = "collected" | "received" | "performed";
export type LabRadResultMilestone = "resulted" | "finalized";

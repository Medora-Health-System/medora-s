import { z } from "zod";
import { deltaMinutesBetween } from "../orders/careProcedureEffectiveClinicalTime.js";

export { deltaMinutesBetween };

const medicationAdministrationEffectiveTimeBodySchema = z
  .object({
    effectiveAdministeredTime: z.string().trim().min(1).optional(),
    /** Client alias (create payload uses effectiveAdministeredAt) — normalized to effectiveAdministeredTime. */
    effectiveAdministeredAt: z.string().trim().min(1).optional(),
    /** Structured correction reason (MEDUI.ED.MAR.H7). */
    correctionReasonCode: z.string().trim().optional(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export const medicationAdministrationEffectiveTimeDtoSchema = medicationAdministrationEffectiveTimeBodySchema
  .transform((body) => ({
    effectiveAdministeredTime:
      body.effectiveAdministeredTime?.trim() || body.effectiveAdministeredAt?.trim() || "",
    correctionReasonCode: body.correctionReasonCode?.trim() || undefined,
    reason: body.reason?.trim() || undefined,
  }))
  .pipe(
    z.object({
      effectiveAdministeredTime: z
        .string()
        .min(1, "Horodatage clinique requis."),
      correctionReasonCode: z.string().optional(),
      reason: z.string().max(500).optional(),
    })
  );

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

/** Advisory-only — timing variance never requires a reason (MEDUI.ED.MAR.HOTFIX.TIME.2). */
export function medicationAdminEffectiveTimeRequiresReason(_input: {
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
  return false;
}

/** Advisory-only — large backdate may show supervisory warning but never blocks save. */
export function medicationAdminEffectiveTimeRequiresDetailedReason(_input: {
  effectiveAdministeredTime: Date;
  systemDocumentedAt: Date;
  reason?: string | null;
}): boolean {
  return false;
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

  return { ok: true };
}

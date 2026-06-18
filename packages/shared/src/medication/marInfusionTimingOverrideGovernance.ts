/** MEDUI.ED.MAR.H9E — infusion/bolus clinical time override governance. */

import { buildMarScheduleTimingDocumentation } from "../mar/marAdministrationSafetyGovernance.js";
import {
  resolveMarMedicationTimingAdvisory,
  type MarMedicationTimingAdvisory,
} from "../mar/marMedicationTimingAdvisory.js";
import {
  type MarMedicationTimingOverrideKind,
} from "../mar/marMedicationTimingOverrideGovernance.js";

export const MAR_INFUSION_TIMING_SAVE_TOLERANCE_MINUTES = 1;

export function marInfusionClinicalTimeDiffersFromSave(
  clinicalAt: Date | string,
  saveAt: Date = new Date(),
  toleranceMinutes = MAR_INFUSION_TIMING_SAVE_TOLERANCE_MINUTES
): boolean {
  const clinicalMs = new Date(clinicalAt).getTime();
  const saveMs = saveAt.getTime();
  if (Number.isNaN(clinicalMs)) return false;
  return Math.abs(clinicalMs - saveMs) > toleranceMinutes * 60_000;
}

export function resolveMarInfusionTimingOverrideKind(
  clinicalAt: Date | string,
  saveAt: Date = new Date()
): MarMedicationTimingOverrideKind {
  const deltaMs = new Date(clinicalAt).getTime() - saveAt.getTime();
  if (Math.abs(deltaMs) <= MAR_INFUSION_TIMING_SAVE_TOLERANCE_MINUTES * 60_000) {
    return "ON_TIME_ADMINISTRATION";
  }
  return deltaMs < 0 ? "EARLY_ADMINISTRATION" : "LATE_ADMINISTRATION";
}

export function computeMarInfusionTimingMovedMinutes(
  clinicalAt: Date | string,
  saveAt: Date = new Date()
): number {
  return Math.round(Math.abs(new Date(clinicalAt).getTime() - saveAt.getTime()) / 60_000);
}

export function validateMarInfusionClinicalTimeOverride(input: {
  clinicalAt: Date | string;
  saveAt?: Date;
  scheduledAt?: Date | string | null;
  reasonCode?: string | null;
  reasonDetail?: string | null;
  isPrn?: boolean;
}): { ok: true; advisory?: MarMedicationTimingAdvisory } {
  void input.reasonCode;
  void input.reasonDetail;

  const advisory = resolveMarMedicationTimingAdvisory({
    scheduledAt: input.scheduledAt,
    clinicalEventAt: input.clinicalAt,
    documentedAt: input.saveAt ?? new Date(),
    isPrn: input.isPrn,
  });

  if (advisory.severity === "NONE") {
    return { ok: true };
  }
  return { ok: true, advisory };
}

export function buildMarInfusionTimingDocumentation(input: {
  clinicalAt: Date | string;
  saveAt?: Date;
  reasonCode: string;
  reasonDetail?: string | null;
}): string | null {
  const saveAt = input.saveAt ?? new Date();
  if (!marInfusionClinicalTimeDiffersFromSave(input.clinicalAt, saveAt)) return null;
  const overrideKind = resolveMarInfusionTimingOverrideKind(input.clinicalAt, saveAt);
  return buildMarScheduleTimingDocumentation({
    kind: overrideKind === "EARLY_ADMINISTRATION" ? "early" : "late",
    reasonCode: input.reasonCode,
    otherText: input.reasonDetail,
    minutesDelta: computeMarInfusionTimingMovedMinutes(input.clinicalAt, saveAt),
  });
}

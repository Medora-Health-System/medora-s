import { z } from "zod";

/**
 * M1.8B.7F.1 — administrable occurrence kind for MedicationDoseInstance rows.
 *
 * Continuous infusions use InfusionSession only — never CONTINUOUS_SESSION here.
 *
 * IVPB_SESSION (M1.8B.7J): one scheduled infusion occurrence under RECURRING_IVPB schedules.
 * Lifecycle: START → infusion session → STOP. Must not use FIXED_ADMINISTRATION for IVPB doses.
 */
export const MEDICATION_DOSE_KINDS = [
  /** Scheduled PO / IM / SQ / IVP bolus administration (dose-gated MAR administer path). */
  "FIXED_ADMINISTRATION",
  /** Recurring IVPB dose — one per-dose infusion START/STOP session (M1.8B.7J). */
  "IVPB_SESSION",
  /** Nurse-initiated PRN administration event (created at administer intent). */
  "PRN_EVENT",
] as const;

export type MedicationDoseKind = (typeof MEDICATION_DOSE_KINDS)[number];

export const medicationDoseKindSchema = z.enum(MEDICATION_DOSE_KINDS);

export function isMedicationDoseKind(value: unknown): value is MedicationDoseKind {
  return medicationDoseKindSchema.safeParse(value).success;
}

export function isIvpbSessionDoseKind(
  value: MedicationDoseKind | string | null | undefined
): boolean {
  return parseMedicationDoseKind(value == null ? null : String(value)) === "IVPB_SESSION";
}

export function parseMedicationDoseKind(
  raw: string | null | undefined
): MedicationDoseKind | null {
  const parsed = medicationDoseKindSchema.safeParse(
    raw == null ? undefined : String(raw).trim().toUpperCase()
  );
  return parsed.success ? parsed.data : null;
}

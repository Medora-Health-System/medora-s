import { z } from "zod";

/**
 * M1.8B.7F.1 — pass-queue and lifecycle status for future MedicationDoseInstance rows.
 */
export const MEDICATION_DOSE_STATUSES = [
  "PLANNED",
  "DUE",
  "OVERDUE",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "HELD",
  "CANCELLED",
  "SUPERSEDED",
] as const;

export type MedicationDoseStatus = (typeof MEDICATION_DOSE_STATUSES)[number];

export const medicationDoseStatusSchema = z.enum(MEDICATION_DOSE_STATUSES);

export const MEDICATION_DOSE_TERMINAL_STATUSES = [
  "COMPLETED",
  "MISSED",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly MedicationDoseStatus[];

export const MEDICATION_DOSE_QUEUE_VISIBLE_STATUSES = [
  "DUE",
  "OVERDUE",
  "IN_PROGRESS",
  "HELD",
] as const satisfies readonly MedicationDoseStatus[];

const TERMINAL_SET = new Set<string>(MEDICATION_DOSE_TERMINAL_STATUSES);
const QUEUE_VISIBLE_SET = new Set<string>(MEDICATION_DOSE_QUEUE_VISIBLE_STATUSES);

export function isMedicationDoseStatus(value: unknown): value is MedicationDoseStatus {
  return medicationDoseStatusSchema.safeParse(value).success;
}

export function parseMedicationDoseStatus(
  raw: string | null | undefined
): MedicationDoseStatus | null {
  const parsed = medicationDoseStatusSchema.safeParse(
    raw == null ? undefined : String(raw).trim().toUpperCase()
  );
  return parsed.success ? parsed.data : null;
}

export function isTerminalMedicationDoseStatus(status: MedicationDoseStatus): boolean {
  return TERMINAL_SET.has(status);
}

export function isActiveMedicationDoseStatus(status: MedicationDoseStatus): boolean {
  return !isTerminalMedicationDoseStatus(status);
}

/** True when dose should appear on an operational medication pass worklist. */
export function isQueueVisibleMedicationDoseStatus(status: MedicationDoseStatus): boolean {
  return QUEUE_VISIBLE_SET.has(status);
}

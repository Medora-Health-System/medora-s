import type { MedicationDoseStatus } from "./medicationDoseStatus.js";
import { parseMedicationDoseStatus } from "./medicationDoseStatus.js";

export const MEDICATION_DOSE_MAR_ADMINISTRABLE_STATUSES = [
  "PLANNED",
  "DUE",
  "OVERDUE",
  "IN_PROGRESS",
] as const satisfies readonly MedicationDoseStatus[];

export type MedicationDoseMarAdministrableStatus =
  (typeof MEDICATION_DOSE_MAR_ADMINISTRABLE_STATUSES)[number];

const ADMINISTRABLE_SET = new Set<string>(MEDICATION_DOSE_MAR_ADMINISTRABLE_STATUSES);

/**
 * Window policy for dose-gated MAR (M1.8B.7I.1).
 *
 * - DUE / OVERDUE / IN_PROGRESS: administrable regardless of window bounds
 * - PLANNED: administrable only when now is within [dueWindowStartAt, dueWindowEndAt]
 */
export function isDoseAdministrableNow(input: {
  doseStatus: MedicationDoseStatus | string;
  now: Date;
  dueWindowStartAt: Date;
  dueWindowEndAt: Date;
}): boolean {
  const status = parseMedicationDoseStatus(input.doseStatus);
  if (!status || !ADMINISTRABLE_SET.has(status)) {
    return false;
  }

  if (status === "DUE" || status === "OVERDUE" || status === "IN_PROGRESS") {
    return true;
  }

  // PLANNED — early administration allowed only inside due window
  const nowMs = input.now.getTime();
  return (
    nowMs >= input.dueWindowStartAt.getTime() && nowMs <= input.dueWindowEndAt.getTime()
  );
}

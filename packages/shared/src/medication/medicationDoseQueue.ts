import type { MedicationDoseStatus } from "./medicationDoseStatus.js";
import { isTerminalMedicationDoseStatus } from "./medicationDoseStatus.js";

/**
 * M1.8B.7F.1 — medication pass queue bucket vocabulary (future HOSPITAL_EMAR UI).
 *
 * DoseInstance-driven buckets: DUE, OVERDUE, IN_PROGRESS, HELD, UPCOMING
 * Non-dose buckets: PRN_AVAILABLE, ACTIVE_INFUSION
 */
export const MEDICATION_PASS_QUEUE_BUCKETS = [
  "DUE",
  "OVERDUE",
  "IN_PROGRESS",
  "HELD",
  "UPCOMING",
  "PRN_AVAILABLE",
  "ACTIVE_INFUSION",
] as const;

export type MedicationPassQueueBucket = (typeof MEDICATION_PASS_QUEUE_BUCKETS)[number];

export const MEDICATION_DOSE_INSTANCE_QUEUE_BUCKETS = [
  "DUE",
  "OVERDUE",
  "IN_PROGRESS",
  "HELD",
  "UPCOMING",
] as const satisfies readonly MedicationPassQueueBucket[];

export const MEDICATION_NON_DOSE_QUEUE_BUCKETS = [
  "PRN_AVAILABLE",
  "ACTIVE_INFUSION",
] as const satisfies readonly MedicationPassQueueBucket[];

/**
 * Maps a dose status to its pass-queue bucket.
 * Returns null for terminal statuses (not shown on active pass lists).
 * PLANNED maps to UPCOMING (not queue-visible until promoted to DUE).
 */
export function mapMedicationDoseStatusToPassQueueBucket(
  status: MedicationDoseStatus
): MedicationPassQueueBucket | null {
  if (isTerminalMedicationDoseStatus(status)) {
    return null;
  }

  switch (status) {
    case "PLANNED":
      return "UPCOMING";
    case "DUE":
      return "DUE";
    case "OVERDUE":
      return "OVERDUE";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "HELD":
      return "HELD";
    case "COMPLETED":
    case "MISSED":
    case "CANCELLED":
    case "SUPERSEDED":
      return null;
  }
}

export function isMedicationDoseInstanceQueueBucket(
  bucket: MedicationPassQueueBucket
): bucket is (typeof MEDICATION_DOSE_INSTANCE_QUEUE_BUCKETS)[number] {
  return (MEDICATION_DOSE_INSTANCE_QUEUE_BUCKETS as readonly string[]).includes(bucket);
}

export function isMedicationNonDoseQueueBucket(
  bucket: MedicationPassQueueBucket
): bucket is (typeof MEDICATION_NON_DOSE_QUEUE_BUCKETS)[number] {
  return (MEDICATION_NON_DOSE_QUEUE_BUCKETS as readonly string[]).includes(bucket);
}

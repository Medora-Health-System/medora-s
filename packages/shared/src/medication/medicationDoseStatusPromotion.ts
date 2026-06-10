import type { MedicationDoseStatus } from "./medicationDoseStatus.js";
import { parseMedicationDoseStatus } from "./medicationDoseStatus.js";

/** Statuses that promotion never modifies (M1.8B.7I.3). */
export const MEDICATION_DOSE_STATUS_PROMOTION_IMMUTABLE_STATUSES = [
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "HELD",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly MedicationDoseStatus[];

export type ResolvePromotedMedicationDoseStatusInput = {
  currentStatus: MedicationDoseStatus | string;
  now: Date;
  dueWindowStartAt: Date;
  dueWindowEndAt: Date;
};

/**
 * Returns the next dose status after time-based promotion, or null when unchanged.
 *
 * Transitions (M1.8B.7I.3):
 * - PLANNED → DUE when now >= dueWindowStartAt
 * - DUE → OVERDUE when now > dueWindowEndAt
 */
export function resolvePromotedMedicationDoseStatus(
  input: ResolvePromotedMedicationDoseStatusInput
): MedicationDoseStatus | null {
  const status = parseMedicationDoseStatus(input.currentStatus);
  if (!status) return null;

  const nowMs = input.now.getTime();
  const windowStartMs = input.dueWindowStartAt.getTime();
  const windowEndMs = input.dueWindowEndAt.getTime();

  if (status === "PLANNED" && nowMs >= windowStartMs) {
    return "DUE";
  }

  if (status === "DUE" && nowMs > windowEndMs) {
    return "OVERDUE";
  }

  return null;
}

/**
 * Chains PLANNED → DUE → OVERDUE in one evaluation when now is past the due window end.
 */
export function resolvePromotedMedicationDoseStatusChained(
  input: ResolvePromotedMedicationDoseStatusInput
): MedicationDoseStatus | null {
  const first = resolvePromotedMedicationDoseStatus(input);
  if (first == null) return null;
  if (first === "DUE") {
    const second = resolvePromotedMedicationDoseStatus({
      ...input,
      currentStatus: "DUE",
    });
    return second ?? first;
  }
  return first;
}

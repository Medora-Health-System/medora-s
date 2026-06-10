import type { MedicationOrderedDoseSnapshotJson } from "./medicationDoseInstanceContract.js";

/** Builds immutable order-line dose snapshot at dose generation time. */
export function buildMedicationOrderedDoseSnapshotJson(input: {
  doseValue?: string | null;
  doseUnit?: string | null;
  route?: string | null;
  quantity?: string | number | null;
  quantityUnit?: string | null;
  medicationLabel?: string | null;
  snapshottedAt?: Date;
}): MedicationOrderedDoseSnapshotJson {
  const quantity =
    input.quantity == null
      ? null
      : typeof input.quantity === "number"
        ? String(input.quantity)
        : input.quantity.trim() || null;

  return {
    doseValue: input.doseValue?.trim() || null,
    doseUnit: input.doseUnit?.trim() || null,
    route: input.route?.trim() || null,
    quantity,
    quantityUnit: input.quantityUnit?.trim() || null,
    medicationLabel: input.medicationLabel?.trim() || null,
    snapshottedAt: (input.snapshottedAt ?? new Date()).toISOString(),
  };
}

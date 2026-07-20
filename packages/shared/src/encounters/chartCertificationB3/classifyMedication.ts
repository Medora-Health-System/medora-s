import type { MedicationOrderSnapshot } from "./types.js";

export const NormalizedMedicationCategory = {
  ED_ADMINISTRATION_REQUIRED: "ED_ADMINISTRATION_REQUIRED",
  ED_ADMINISTRATION_OPTIONAL: "ED_ADMINISTRATION_OPTIONAL",
  PRN_ORDER: "PRN_ORDER",
  INFUSION: "INFUSION",
  DISCHARGE_PRESCRIPTION: "DISCHARGE_PRESCRIPTION",
  HOME_MEDICATION: "HOME_MEDICATION",
  FUTURE_OUTPATIENT_ORDER: "FUTURE_OUTPATIENT_ORDER",
  ADMISSION_CONTINUATION_ORDER: "ADMISSION_CONTINUATION_ORDER",
  TRANSFER_CONTINUATION_ORDER: "TRANSFER_CONTINUATION_ORDER",
  CANCELLED: "CANCELLED",
  DISCONTINUED: "DISCONTINUED",
  HELD: "HELD",
  REFUSED: "REFUSED",
  ENTERED_IN_ERROR: "ENTERED_IN_ERROR",
  SUPERSEDED: "SUPERSEDED",
  EXTERNAL: "EXTERNAL",
  UNKNOWN: "UNKNOWN",
} as const;

export type NormalizedMedicationCategory =
  (typeof NormalizedMedicationCategory)[keyof typeof NormalizedMedicationCategory];

function upper(v: string | null | undefined): string {
  return (v ?? "").trim().toUpperCase();
}

function isPrnFrequency(snapshot: MedicationOrderSnapshot): boolean {
  if (snapshot.isPrn) return true;
  const freq = upper(snapshot.frequencyCode);
  return freq === "PRN" || freq.includes("PRN") || freq === "AS_NEEDED";
}

function looksLikeInfusion(snapshot: MedicationOrderSnapshot): boolean {
  const label = upper(snapshot.medicationLabel);
  const route = upper(snapshot.route);
  const life = upper(snapshot.lifecycleState);
  const catalog = upper(snapshot.catalogItemType);
  if (catalog.includes("INFUSION") || life.includes("INFUSION")) return true;
  if (label.includes("INFUSION") || label.includes("PERFUSION")) return true;
  if (route.includes("IV") && (label.includes("CONTINUOUS") || route.includes("CONTINUOUS"))) {
    return true;
  }
  if (route === "IV_CONTINUOUS" || route === "IV CONTINUOUS") return true;
  return false;
}

/**
 * Deterministic PHI-safe medication order classification for Stage B3.
 * Does not mutate persistence enums.
 */
export function classifyMedicationOrder(
  snapshot: MedicationOrderSnapshot
): NormalizedMedicationCategory {
  if (snapshot.isHomeMedication) {
    return NormalizedMedicationCategory.HOME_MEDICATION;
  }
  if (snapshot.isFutureOutpatient) {
    return NormalizedMedicationCategory.FUTURE_OUTPATIENT_ORDER;
  }

  const intent = upper(snapshot.fulfillmentIntent);
  if (intent === "PHARMACY_DISPENSE" || snapshot.isDischargePrescription) {
    return NormalizedMedicationCategory.DISCHARGE_PRESCRIPTION;
  }

  const medLife = upper(snapshot.medicationLifecycleStatus);
  const order = upper(snapshot.orderStatus);
  const item = upper(snapshot.itemStatus);
  const life = upper(snapshot.lifecycleState);
  const catalog = upper(snapshot.catalogItemType);

  if (
    medLife === "CANCELED_ENTERED_IN_ERROR" ||
    medLife === "ENTERED_IN_ERROR" ||
    life === "ENTERED_IN_ERROR" ||
    item === "ENTERED_IN_ERROR"
  ) {
    return NormalizedMedicationCategory.ENTERED_IN_ERROR;
  }

  if (
    medLife === "SUPERSEDED" ||
    Boolean((snapshot.supersededByOrderItemId ?? "").trim()) ||
    life === "SUPERSEDED"
  ) {
    return NormalizedMedicationCategory.SUPERSEDED;
  }

  if (
    Boolean(snapshot.cancelledAt) ||
    order === "CANCELLED" ||
    item === "CANCELLED" ||
    life === "CANCELLED" ||
    medLife === "CANCELLED"
  ) {
    return NormalizedMedicationCategory.CANCELLED;
  }

  if (medLife === "DISCONTINUED" || life === "DISCONTINUED" || item === "DISCONTINUED") {
    return NormalizedMedicationCategory.DISCONTINUED;
  }

  if (medLife === "ON_HOLD" || life === "ON_HOLD" || item === "ON_HOLD" || item === "HELD") {
    return NormalizedMedicationCategory.HELD;
  }

  if (
    medLife === "REFUSED" ||
    life === "REFUSED" ||
    item === "REFUSED" ||
    order === "REFUSED"
  ) {
    return NormalizedMedicationCategory.REFUSED;
  }

  if (catalog === "EXTERNAL" || catalog.includes("EXTERNAL") || life === "EXTERNAL") {
    return NormalizedMedicationCategory.EXTERNAL;
  }

  if (
    catalog.includes("ADMISSION_CONTINUATION") ||
    catalog === "ADMISSION_CONTINUATION" ||
    life === "ADMISSION_CONTINUATION"
  ) {
    return NormalizedMedicationCategory.ADMISSION_CONTINUATION_ORDER;
  }

  if (
    catalog.includes("TRANSFER_CONTINUATION") ||
    catalog === "TRANSFER_CONTINUATION" ||
    life === "TRANSFER_CONTINUATION"
  ) {
    return NormalizedMedicationCategory.TRANSFER_CONTINUATION_ORDER;
  }

  if (isPrnFrequency(snapshot)) {
    return NormalizedMedicationCategory.PRN_ORDER;
  }

  if (looksLikeInfusion(snapshot)) {
    return NormalizedMedicationCategory.INFUSION;
  }

  if (intent === "ADMINISTER_CHART") {
    const active =
      medLife === "ACTIVE" ||
      medLife === "" ||
      medLife === "COMPLETED" ||
      order === "PLACED" ||
      order === "ACTIVE" ||
      order === "IN_PROGRESS" ||
      item === "PLACED" ||
      item === "ACTIVE" ||
      life === "ORDERED" ||
      life === "ACTIVE";
    if (active) {
      return NormalizedMedicationCategory.ED_ADMINISTRATION_REQUIRED;
    }
    return NormalizedMedicationCategory.ED_ADMINISTRATION_OPTIONAL;
  }

  return NormalizedMedicationCategory.UNKNOWN;
}

/** True when charted administration (MAR) is expected for completion evaluation. */
export function administrationRequired(
  category: NormalizedMedicationCategory,
  _snapshot: MedicationOrderSnapshot
): boolean {
  return category === NormalizedMedicationCategory.ED_ADMINISTRATION_REQUIRED;
}

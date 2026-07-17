/**
 * Phase 2 — billing quantity provenance types.
 * Ordered, dispensed, prepared, administered, wasted, and billable quantities are distinct
 * and must not be substituted in billing math without explicit conversion rules.
 */

export type MedicationQuantityKind =
  | "ordered"
  | "dispensed"
  | "prepared"
  | "administered"
  | "wasted"
  | "billable";

export type MedicationQuantityRecord = {
  kind: MedicationQuantityKind;
  amount: number;
  unit: string;
  /** Optional package or NDC context for billable rows. */
  packageCode?: string | null;
  ndc11?: string | null;
  /** When the quantity was captured in the clinical workflow. */
  capturedAt?: string | null;
};

export type MedicationBillingProvenanceInput = {
  ordered?: MedicationQuantityRecord | null;
  dispensed?: MedicationQuantityRecord | null;
  prepared?: MedicationQuantityRecord | null;
  administered?: MedicationQuantityRecord | null;
  wasted?: MedicationQuantityRecord | null;
  billable?: MedicationQuantityRecord | null;
  mappingStatus?: string | null;
  requiresManualReview?: boolean | null;
};

const QUANTITY_KIND_LABELS: Record<MedicationQuantityKind, string> = {
  ordered: "ordered",
  dispensed: "dispensed",
  prepared: "prepared",
  administered: "administered",
  wasted: "wasted",
  billable: "billable",
};

/**
 * Throws when code attempts to treat two quantity kinds as interchangeable without
 * an explicit conversion (e.g. using dispensed amount as administered for billing).
 */
export function assertQuantitiesNotInterchangeable(
  left: MedicationQuantityKind,
  right: MedicationQuantityKind,
  context: string
): void {
  if (left === right) return;
  throw new Error(
    `Medication quantities are not interchangeable: ${QUANTITY_KIND_LABELS[left]} vs ${QUANTITY_KIND_LABELS[right]} (${context})`
  );
}

/**
 * Billable quantity requires administration provenance unless manual review is explicitly waived
 * and mapping is verified — default safe path keeps requiresManualReview true.
 */
export function billingRequiresAdministrationProvenance(
  input: MedicationBillingProvenanceInput
): boolean {
  if (input.requiresManualReview !== false) return true;
  if (input.mappingStatus?.trim().toUpperCase() !== "VERIFIED") return true;
  if (!input.administered || input.administered.amount <= 0) return true;
  return false;
}

export function pickBillableQuantitySource(
  input: MedicationBillingProvenanceInput
): MedicationQuantityRecord | null {
  if (billingRequiresAdministrationProvenance(input)) {
    return input.administered ?? null;
  }
  return input.billable ?? input.administered ?? null;
}

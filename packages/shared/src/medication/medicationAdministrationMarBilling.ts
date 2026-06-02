import { resolveMedicationMarActionFromStorage, type MarClinicalAction } from "../mar/marClinicalAction.js";

/** M1.4C — provenance for MAR administration billing resolution (capture metadata). */
export const MEDICATION_ADMINISTRATION_BILLING_SOURCE_KINDS = [
  "CATALOG_BILLING_CODE_DEFAULT",
  "BILLING_CATALOG_MEDICATION",
  "MEDICATION_PACKAGE_PROFILE",
  "MEDICATION_PRODUCT_PROFILE",
  "MANUAL_REVIEW",
] as const;

export type MedicationAdministrationBillingSourceKind =
  (typeof MEDICATION_ADMINISTRATION_BILLING_SOURCE_KINDS)[number];
export const NON_BILLABLE_MAR_CLINICAL_ACTIONS = [
  "refused",
  "not_available",
  "md_changed",
] as const satisfies readonly MarClinicalAction[];

export function isMedicationAdministrationBillableMarAction(
  marAction: MarClinicalAction | string | null | undefined,
  notes?: string | null
): boolean {
  const resolved = resolveMedicationMarActionFromStorage({ marAction, notes });
  return resolved === "administered";
}

import { medicationTextMatchesHighRiskPatterns } from "./medication-global-baseline-tier-rules.util";
import {
  normalizeDoseForMatch,
  normalizeFormForMatch,
  normalizeMedicationNameForMatch,
} from "./priority-er-inventory-match-normalize.util";

export type ControlledCatalogMedicationClassification =
  | "SAFE_LOW_RISK"
  | "HIGH_RISK_MANUAL_REVIEW"
  | "MISSING_REQUIRED_FIELDS"
  | "DUPLICATE_OR_CONFLICT";

export type ClassifyControlledMedicationRowInput = {
  medication: string;
  dose: string;
  form: string;
  ndc?: string | null;
};

export type ExistingMedicationMatch = {
  conceptId: string;
  productId: string;
  productCode: string;
};

export function classifyControlledMedicationRow(
  input: ClassifyControlledMedicationRowInput,
  existing: ExistingMedicationMatch | null
): ControlledCatalogMedicationClassification {
  const med = input.medication.trim();
  const dose = input.dose.trim();
  const form = input.form.trim();

  if (!med || !dose || !form) return "MISSING_REQUIRED_FIELDS";

  const haystack = [med, dose, form].join(" ");
  if (medicationTextMatchesHighRiskPatterns(haystack)) return "HIGH_RISK_MANUAL_REVIEW";

  if (existing) return "DUPLICATE_OR_CONFLICT";

  return "SAFE_LOW_RISK";
}

export function controlledMedicationMatchKey(med: string, dose: string, form: string): string {
  return [
    normalizeMedicationNameForMatch(med),
    normalizeDoseForMatch(dose),
    normalizeFormForMatch(form),
  ].join("|");
}

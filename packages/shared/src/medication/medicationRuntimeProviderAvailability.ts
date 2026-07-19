/**
 * Runtime provider medication availability completion.
 * Certifies against the actual target database + MedicationCatalogService.search path.
 * Prior formulation/universal CERTIFIED decisions are not production evidence.
 */

export const MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFICATION_ID =
  "MEDUI.MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_COMPLETION";

export const MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_PROGRAM_KEY =
  "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_COMPLETION_V1";

export const MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_VERSION =
  "medication-runtime-provider-availability-1.0.0";

export const MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_DECISIONS = [
  "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFIED",
  "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFIED_WITH_REVIEW_ITEMS",
  "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_NOT_CERTIFIED",
] as const;

export type MedicationRuntimeProviderAvailabilityDecision =
  (typeof MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_DECISIONS)[number];

export type RuntimeAvailabilityFamilyClass =
  | "AVAILABLE_COMPLETE"
  | "AVAILABLE_PARTIAL"
  | "EXISTS_BUT_HIDDEN"
  | "EXISTS_BUT_INACTIVE"
  | "EXISTS_BUT_NOT_ORDERABLE"
  | "ALIAS_MISSING"
  | "STRENGTH_MISSING"
  | "FORM_MISSING"
  | "ROUTE_MISSING"
  | "FACILITY_FILTERED"
  | "COMPLETELY_ABSENT"
  | "AMBIGUOUS"
  | "SOURCE_REQUIRED";

/** Production-path hard acceptance probes (order composer queries). */
export const RUNTIME_PROVIDER_HARD_ACCEPTANCE_PROBES: readonly {
  query: string;
  requiredStrengthSubstrings: readonly string[];
  mustHaveResults: boolean;
}[] = [
  { query: "jard", requiredStrengthSubstrings: ["10 mg", "25 mg"], mustHaveResults: true },
  { query: "Jardiance", requiredStrengthSubstrings: ["10 mg", "25 mg"], mustHaveResults: true },
  { query: "Biktar", requiredStrengthSubstrings: ["50 mg"], mustHaveResults: true },
  { query: "Biktarvy", requiredStrengthSubstrings: ["50 mg"], mustHaveResults: true },
  { query: "bikt", requiredStrengthSubstrings: ["50 mg"], mustHaveResults: true },
] as const;

export function decideMedicationRuntimeProviderAvailability(input: {
  schemaOk: boolean;
  regressionOk: boolean;
  targetIsProductionEquivalent: boolean;
  usedRealMedicationCatalogService: boolean;
  usedSnapshotBypassValidator: boolean;
  hardAcceptancePass: boolean;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  fabricatedData: boolean;
  /** Search pass rate on runtime clinical gap inventory. */
  runtimeSearchPassRate: number;
  runtimeOrderabilityPassRate: number;
  completelyAbsentCount: number;
  databaseApplyCompleted: boolean;
}): MedicationRuntimeProviderAvailabilityDecision {
  if (
    !input.schemaOk ||
    !input.regressionOk ||
    !input.targetIsProductionEquivalent ||
    !input.usedRealMedicationCatalogService ||
    input.usedSnapshotBypassValidator ||
    input.fabricatedData ||
    input.orderMutations > 0 ||
    input.marMutations > 0 ||
    input.chartMutations > 0 ||
    !input.databaseApplyCompleted ||
    !input.hardAcceptancePass
  ) {
    return "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_NOT_CERTIFIED";
  }

  if (
    input.runtimeSearchPassRate >= 1 &&
    input.runtimeOrderabilityPassRate >= 1 &&
    input.completelyAbsentCount === 0
  ) {
    return "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFIED";
  }

  if (input.runtimeSearchPassRate >= 0.95 && input.hardAcceptancePass) {
    return "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFIED_WITH_REVIEW_ITEMS";
  }

  return "MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_NOT_CERTIFIED";
}

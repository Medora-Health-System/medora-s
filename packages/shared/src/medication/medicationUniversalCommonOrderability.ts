/**
 * Universal Common Medication Orderability Completion
 * Provider-facing clinical completeness across the full common-medication benchmark.
 * Updates certification MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION evidence.
 */

export const UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_PROGRAM_KEY =
  "UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_V1";

export const UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_VERSION =
  "universal-common-medication-orderability-1.0.0";

export const UNIVERSAL_FAMILY_CLASSIFICATIONS = [
  "COMPLETE",
  "MISSING_FAMILY",
  "GENERIC_ONLY",
  "BRAND_ONLY",
  "PARTIAL_STRENGTH",
  "PARTIAL_FORM",
  "PARTIAL_ROUTE",
  "SEARCH_HIDDEN",
  "NOT_ORDERABLE",
  "AMBIGUOUS",
  "OUT_OF_SCOPE",
  "MANUAL_REVIEW",
] as const;

export type UniversalFamilyClassification =
  (typeof UNIVERSAL_FAMILY_CLASSIFICATIONS)[number];

export type UniversalBenchmarkFamily = {
  familyId: string;
  genericName: string;
  domain: string;
  brandQueries: string[];
  genericQueries: string[];
  aliases?: string[];
  expectedStrengthSubstrings?: string[];
  expectedForms?: string[];
  expectedRoutes?: string[];
  sources: string[];
};

/** Full CERTIFIED requires 100% benchmark search + expected orderability. */
export function decideUniversalCommonOrderabilityCertification(input: {
  schemaOk: boolean;
  regressionOk: boolean;
  fabricatedData: boolean;
  dualLayerBulkActivated: boolean;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  completionIdempotent: boolean | null;
  hardAcceptancePass: boolean;
  benchmarkFamilyCount: number;
  benchmarkSearchPassRate: number;
  benchmarkOrderabilityPassRate: number;
  exactBrandRankingPassRate: number;
  exactGenericRankingPassRate: number;
  missingFamilyCount: number;
  /** Prior formulation family probe still must pass. */
  familySearchPassRate: number;
}):
  | "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED"
  | "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS"
  | "MEDICATION_FORMULATION_STRENGTH_COMPLETION_NOT_CERTIFIED" {
  if (
    !input.schemaOk ||
    !input.regressionOk ||
    input.fabricatedData ||
    input.dualLayerBulkActivated ||
    input.orderMutations > 0 ||
    input.marMutations > 0 ||
    input.chartMutations > 0 ||
    input.completionIdempotent === false ||
    !input.hardAcceptancePass ||
    input.benchmarkFamilyCount < 1000 ||
    input.familySearchPassRate < 1
  ) {
    return "MEDICATION_FORMULATION_STRENGTH_COMPLETION_NOT_CERTIFIED";
  }

  const fullyComplete =
    input.benchmarkSearchPassRate >= 1 &&
    input.benchmarkOrderabilityPassRate >= 1 &&
    input.exactBrandRankingPassRate >= 1 &&
    input.exactGenericRankingPassRate >= 1 &&
    input.missingFamilyCount === 0;

  if (fullyComplete) {
    return "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED";
  }

  return "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS";
}

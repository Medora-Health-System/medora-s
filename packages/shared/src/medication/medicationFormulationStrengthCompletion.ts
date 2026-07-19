/**
 * Medication Formulation & Strength Completion — Provider-Orderable Clinical Completeness.
 * Not Phase 19. Not an expansion wave. Completes formulations for existing generics only.
 * Certification requires measured provider-facing search/orderability evidence.
 */

export const MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID =
  "MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION";

export const MEDICATION_FORMULATION_STRENGTH_COMPLETION_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION_CLINICAL_COMPLETENESS";

export const MEDICATION_FORMULATION_STRENGTH_COMPLETION_PROGRAM_KEY =
  "MEDICATION_FORMULATION_STRENGTH_COMPLETION_V1";

export const MEDICATION_FORMULATION_STRENGTH_COMPLETION_VERSION =
  "formulation-strength-completion-1.1.0-provider-facing";

export const MEDICATION_FORMULATION_STRENGTH_COMPLETION_DECISIONS = [
  "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED",
  "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS",
  "MEDICATION_FORMULATION_STRENGTH_COMPLETION_NOT_CERTIFIED",
] as const;

export type MedicationFormulationStrengthCompletionDecision =
  (typeof MEDICATION_FORMULATION_STRENGTH_COMPLETION_DECISIONS)[number];

export const MEDICATION_FORMULATION_STRENGTH_COMPLETION_DEFAULTS = {
  fabricateStrength: false,
  fabricateDosageForm: false,
  fabricateRoute: false,
  fabricateRxNorm: false,
  fabricateNdc: false,
  createNewGenerics: false,
  activateDualLayerProducts: false,
  enableProductionCds: false,
  mutateOrders: false,
  mutateMar: false,
  mutateChart: false,
  useWave4PlaceholderStrengths: false,
} as const;

export function assertMedicationFormulationStrengthCompletionSafetyDefaults(): void {
  const d = MEDICATION_FORMULATION_STRENGTH_COMPLETION_DEFAULTS;
  if (
    d.fabricateStrength ||
    d.fabricateDosageForm ||
    d.fabricateRoute ||
    d.fabricateRxNorm ||
    d.fabricateNdc ||
    d.createNewGenerics ||
    d.activateDualLayerProducts ||
    d.enableProductionCds ||
    d.mutateOrders ||
    d.mutateMar ||
    d.mutateChart ||
    d.useWave4PlaceholderStrengths
  ) {
    throw new Error("Formulation strength completion safety defaults violated.");
  }
}

/** Hard-acceptance + representative family checks (not the full clinical corpus). */
export const MEDICATION_FORMULATION_FAMILY_SEARCH_CHECKS: readonly {
  query: string;
  requiredStrengthSubstrings: readonly string[];
  mustRankBefore?: string;
}[] = [
  { query: "Jardiance", requiredStrengthSubstrings: ["10 mg", "25 mg"] },
  { query: "jard", requiredStrengthSubstrings: ["10 mg", "25 mg"] },
  { query: "jar", requiredStrengthSubstrings: ["10 mg", "25 mg"], mustRankBefore: "tirzepatide" },
  { query: "Empagliflozin", requiredStrengthSubstrings: ["10 mg", "25 mg"] },
  { query: "Biktarvy", requiredStrengthSubstrings: ["50 mg", "200 mg", "25 mg"] },
  { query: "bikt", requiredStrengthSubstrings: ["50 mg", "200 mg", "25 mg"] },
  { query: "bictegravir", requiredStrengthSubstrings: ["50 mg"] },
  { query: "Ceftriaxone", requiredStrengthSubstrings: ["1 g", "2 g"] },
  { query: "Acetaminophen", requiredStrengthSubstrings: ["500 mg", "650 mg"] },
  { query: "Ibuprofen", requiredStrengthSubstrings: ["200 mg", "400 mg"] },
  { query: "Albuterol", requiredStrengthSubstrings: ["2.5 mg"] },
  { query: "Ondansetron", requiredStrengthSubstrings: ["4 mg", "8 mg"] },
  { query: "Pantoprazole", requiredStrengthSubstrings: ["40 mg"] },
  { query: "Insulin glargine", requiredStrengthSubstrings: ["100"] },
  { query: "Normal Saline", requiredStrengthSubstrings: ["0.9"] },
  { query: "Lactated Ringer", requiredStrengthSubstrings: ["500"] },
  { query: "Amoxicillin", requiredStrengthSubstrings: ["500 mg"] },
  { query: "Metformin", requiredStrengthSubstrings: ["500 mg", "1000 mg"] },
  { query: "Eliquis", requiredStrengthSubstrings: ["5 mg"] },
  { query: "Furosemide", requiredStrengthSubstrings: ["40 mg"] },
] as const;

export function normalizeFormulationStrengthKey(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/\bui\b/g, "units")
    .replace(/\bunite[s]?\b/g, "units")
    .replace(/\bper\b/g, "/")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

export function decideMedicationFormulationStrengthCompletion(input: {
  schemaOk: boolean;
  regressionOk: boolean;
  fabricatedData: boolean;
  createdNewGenerics: boolean;
  dualLayerActivated: boolean;
  familySearchPassRate: number;
  formulationsCreated: number;
  sourceApproved: boolean;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  completionIdempotent: boolean | null;
  /** Provider-facing hard acceptance (Biktarvy + Jardiance family). */
  hardAcceptancePass: boolean;
  /** Exact brand ranking success rate on hard queries. */
  exactRankingPassRate: number;
  /** Broad clinical corpus search pass rate (production search path). */
  corpusSearchPassRate: number;
  corpusSize: number;
  absentHardAcceptanceCount: number;
}): MedicationFormulationStrengthCompletionDecision {
  if (
    !input.schemaOk ||
    !input.regressionOk ||
    input.fabricatedData ||
    input.createdNewGenerics ||
    input.dualLayerActivated ||
    !input.sourceApproved ||
    input.orderMutations > 0 ||
    input.marMutations > 0 ||
    input.chartMutations > 0 ||
    input.completionIdempotent === false ||
    !input.hardAcceptancePass ||
    input.absentHardAcceptanceCount > 0 ||
    input.corpusSize < 100
  ) {
    return "MEDICATION_FORMULATION_STRENGTH_COMPLETION_NOT_CERTIFIED";
  }
  if (
    input.familySearchPassRate < 1 ||
    input.exactRankingPassRate < 1 ||
    input.corpusSearchPassRate < 0.95
  ) {
    return "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS";
  }
  if (input.corpusSearchPassRate < 1) {
    return "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS";
  }
  return "MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED";
}

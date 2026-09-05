export type Icd10MultilingualCertificationCounts = {
  release: string;
  totalSearchable: number;
  enExact: number;
  frExact: number;
  esExact: number;
  missingEn: number;
  missingFr: number;
  missingEs: number;
  codeOnlyEn: number;
  codeOnlyFr: number;
  codeOnlyEs: number;
  categorySubstitutions: number;
  invalidTerminologyCodes: number;
  orphanTerminology: number;
  duplicateActivePreferredLabels: number;
  duplicateEffectiveClinicianLabels: number;
  crossLanguageFallback: number;
  aliasUsedAsDisplay: number;
  consumerUsedAsClinician: number;
  canonicalCodeMutations: number;
  expectedBillableRows: number;
};

export type Icd10MultilingualCertificationGates = {
  SAFE_ARCHITECTURE: boolean;
  FULL_TRILINGUAL_COVERAGE: boolean;
};

export type Icd10CertificationGate = "safety" | "coverage";

/** Exit 0 only when the selected gate(s) pass. Coverage-only default failure uses 2. */
export const ICD10_CERTIFICATION_EXIT = {
  PASS: 0,
  SAFETY_FAIL: 1,
  COVERAGE_FAIL: 2,
  USAGE: 64,
} as const;

export function evaluateIcd10MultilingualCertification(
  counts: Icd10MultilingualCertificationCounts,
): Icd10MultilingualCertificationGates {
  const SAFE_ARCHITECTURE =
    counts.categorySubstitutions === 0 &&
    counts.invalidTerminologyCodes === 0 &&
    counts.orphanTerminology === 0 &&
    counts.duplicateActivePreferredLabels === 0 &&
    counts.duplicateEffectiveClinicianLabels === 0 &&
    counts.crossLanguageFallback === 0 &&
    counts.aliasUsedAsDisplay === 0 &&
    counts.consumerUsedAsClinician === 0 &&
    counts.canonicalCodeMutations === 0;

  const FULL_TRILINGUAL_COVERAGE =
    counts.totalSearchable >= counts.expectedBillableRows &&
    counts.enExact === counts.totalSearchable &&
    counts.frExact === counts.totalSearchable &&
    counts.esExact === counts.totalSearchable &&
    counts.missingEn === 0 &&
    counts.missingFr === 0 &&
    counts.missingEs === 0 &&
    counts.codeOnlyFr === 0 &&
    counts.codeOnlyEs === 0;

  return { SAFE_ARCHITECTURE, FULL_TRILINGUAL_COVERAGE };
}

export function icd10MultilingualCertificationExitCode(
  gate: Icd10CertificationGate | "both",
  gates: Icd10MultilingualCertificationGates,
): number {
  if (gate === "safety") {
    return gates.SAFE_ARCHITECTURE ? ICD10_CERTIFICATION_EXIT.PASS : ICD10_CERTIFICATION_EXIT.SAFETY_FAIL;
  }
  if (gate === "coverage") {
    return gates.FULL_TRILINGUAL_COVERAGE ? ICD10_CERTIFICATION_EXIT.PASS : ICD10_CERTIFICATION_EXIT.COVERAGE_FAIL;
  }
  if (!gates.SAFE_ARCHITECTURE) return ICD10_CERTIFICATION_EXIT.SAFETY_FAIL;
  if (!gates.FULL_TRILINGUAL_COVERAGE) return ICD10_CERTIFICATION_EXIT.COVERAGE_FAIL;
  return ICD10_CERTIFICATION_EXIT.PASS;
}

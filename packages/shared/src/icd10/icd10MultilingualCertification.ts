import type { Icd10DiagnosisDisplayResult } from "./icd10TerminologyTypes.js";

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

/**
 * FR/ES presentation sourced from the English catalog path.
 *
 * Origin is sourceKind, not spelling and not exactness:
 * - TERMINOLOGY_ROW: never English catalog fallback (even if EXACT_SOURCE and same spelling)
 * - UNLOCALIZED_CODE: not fallback
 * - CATALOG_SOURCE: English catalog presentation used as FR/ES → fallback
 */
export function isEnglishCatalogFallbackOnNonEnglishLocale(resolved: Icd10DiagnosisDisplayResult): boolean {
  return resolved.sourceKind === "CATALOG_SOURCE";
}

export function countCrossLanguageFallback(input: {
  fr: Icd10DiagnosisDisplayResult;
  es: Icd10DiagnosisDisplayResult;
}): number {
  let n = 0;
  if (isEnglishCatalogFallbackOnNonEnglishLocale(input.fr)) n += 1;
  if (isEnglishCatalogFallbackOnNonEnglishLocale(input.es)) n += 1;
  if (input.fr.localized && !input.es.localized && input.es.displayName === input.fr.displayName) n += 1;
  if (input.es.localized && !input.fr.localized && input.fr.displayName === input.es.displayName) n += 1;
  return n;
}

export function countConsumerUsedAsClinician(input: {
  fr: Icd10DiagnosisDisplayResult;
  es: Icd10DiagnosisDisplayResult;
  consumerLabels: ReadonlySet<string>;
}): number {
  if (input.consumerLabels.size === 0) return 0;
  if (input.consumerLabels.has(input.fr.displayName) || input.consumerLabels.has(input.es.displayName)) return 1;
  return 0;
}

export function countAliasUsedAsDisplay(input: {
  catalogId: string;
  fr: Icd10DiagnosisDisplayResult;
  es: Icd10DiagnosisDisplayResult;
  clinicianFrLabels: ReadonlySet<string>;
  clinicianEsLabels: ReadonlySet<string>;
  aliases: ReadonlyArray<{ icd10CatalogId: string; locale: string; aliasText: string }>;
}): number {
  let n = 0;
  for (const alias of input.aliases) {
    if (alias.icd10CatalogId !== input.catalogId) continue;
    if (
      alias.locale === "fr" &&
      input.fr.localized &&
      input.fr.displayName === alias.aliasText &&
      !input.clinicianFrLabels.has(input.fr.displayName)
    ) {
      n += 1;
    }
    if (
      alias.locale === "es" &&
      input.es.localized &&
      input.es.displayName === alias.aliasText &&
      !input.clinicianEsLabels.has(input.es.displayName)
    ) {
      n += 1;
    }
  }
  return n;
}

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

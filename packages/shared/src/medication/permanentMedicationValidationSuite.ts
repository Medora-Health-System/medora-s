/**
 * Permanent Medication Validation Suite — provider-facing regression protection.
 * Real MedicationCatalogService.search path is the source of truth.
 */

import {
  MEDICATION_PROVIDER_CLINICAL_CORPUS,
  type ProviderClinicalCorpusFamily,
} from "./medicationProviderClinicalCorpus.js";

export const PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFICATION_ID =
  "MEDUI.PERMANENT_MEDICATION_VALIDATION_SUITE";

export const PERMANENT_MEDICATION_VALIDATION_SUITE_PROGRAM_KEY =
  "PERMANENT_MEDICATION_VALIDATION_SUITE_V1";

export const PERMANENT_MEDICATION_VALIDATION_SUITE_VERSION =
  "permanent-medication-validation-suite-1.0.0";

export const PERMANENT_MEDICATION_VALIDATION_SUITE_BENCHMARK_VERSION =
  "permanent-medication-benchmark-1.0.0";

export const PERMANENT_MEDICATION_VALIDATION_SUITE_DECISIONS = [
  "PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFIED",
  "PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFIED_WITH_REVIEW_ITEMS",
  "PERMANENT_MEDICATION_VALIDATION_SUITE_NOT_CERTIFIED",
] as const;

export type PermanentMedicationValidationSuiteDecision =
  (typeof PERMANENT_MEDICATION_VALIDATION_SUITE_DECISIONS)[number];

export const PERMANENT_MEDICATION_FAILURE_CLASSIFICATIONS = [
  "MISSING_FAMILY",
  "MISSING_BRAND_ALIAS",
  "MISSING_GENERIC_ALIAS",
  "MISSING_STRENGTH",
  "MISSING_FORM",
  "MISSING_ROUTE",
  "HIDDEN_BY_RANKING",
  "HIDDEN_BY_LIMIT",
  "FACILITY_FILTERED",
  "INACTIVE",
  "NOT_ORDERABLE",
  "DUPLICATE_RESULT",
  "WRONG_FAMILY",
  "WRONG_BRAND_DISPLAY",
  "WRONG_GENERIC_DISPLAY",
  "API_FAILURE",
  "ENVIRONMENT_DATA_MISMATCH",
  "BENCHMARK_VERSION_MISMATCH",
] as const;

export type PermanentMedicationFailureClassification =
  (typeof PERMANENT_MEDICATION_FAILURE_CLASSIFICATIONS)[number];

export type PermanentValidationTier = "critical" | "full" | "deployment";

export type PermanentBenchmarkFamily = {
  benchmarkFamilyId: string;
  canonicalGenericName: string;
  commonBrandNames: string[];
  /** Generic / INN search terms (not brand product names). */
  commonGenericNames: string[];
  commonSearchTerms: string[];
  expectedStrengths: string[];
  expectedOrderability: boolean;
  requiredForED: boolean;
  clinicalDomains: string[];
  hardAcceptance: boolean;
  source: string;
  sourceVersion: string;
  /** When true, family is intentional formulary exclusion (documented). */
  intentionalExclusion?: boolean;
};

export type PermanentValidationFailure = {
  familyId: string;
  query: string;
  classification: PermanentMedicationFailureClassification;
  expected: string;
  actual: string;
  facilityName?: string;
  environmentHost?: string;
};

export type PermanentValidationSearchItem = {
  label?: string | null;
  code?: string | null;
  name?: string | null;
  displayNameEn?: string | null;
  searchText?: string | null;
  metadata?: {
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
    genericName?: string | null;
  } | null;
};

/** High-priority hard-acceptance family ids (permanent minimum). */
export const PERMANENT_HARD_ACCEPTANCE_FAMILY_IDS = [
  "biktarvy",
  "jardiance",
  "epinephrine",
  "norepinephrine",
  "vasopressin",
  "atropine",
  "adenosine",
  "amiodarone",
  "naloxone",
  "metformin",
  "lisinopril",
  "amlodipine",
  "metoprolol",
  "furosemide",
  "sertraline",
  "lorazepam",
  "omeprazole",
  "ondansetron",
  "acetaminophen",
  "ibuprofen",
  "morphine",
  "ceftriaxone",
  "vancomycin",
  "albuterol",
  "normal-saline",
  "potassium-chloride",
] as const;

/** Clinically common salt / ester suffixes omitted in catalog display names. */
const CLINICAL_SALT_SUFFIXES = [
  "hydrochloride",
  "hydrobromide",
  "sodium",
  "potassium",
  "calcium",
  "magnesium",
  "sulfate",
  "sulphate",
  "phosphate",
  "mesylate",
  "besylate",
  "tosylate",
  "acetate",
  "maleate",
  "tartrate",
  "fumarate",
  "succinate",
  "bitartrate",
  "citrate",
  "hcl",
] as const;

export function normalizeClinicalIngredientKey(value: string): string {
  let n = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let prev = "";
  while (n !== prev) {
    prev = n;
    for (const salt of CLINICAL_SALT_SUFFIXES) {
      n = n
        .replace(new RegExp(`\\s+${salt}$`), "")
        .replace(new RegExp(`^${salt}\\s+`), "")
        .replace(new RegExp(`\\s+${salt}\\s+`), " ")
        .trim();
    }
  }
  return n;
}

/** True when haystack contains token, or salt/base-equivalent ingredient identity. */
export function clinicalFamilyTokenMatch(token: string, haystack: string): boolean {
  const t = token.toLowerCase().trim();
  const hay = haystack.toLowerCase();
  if (!t || t.length < 3) return false;
  if (hay.includes(t)) return true;
  const base = normalizeClinicalIngredientKey(t);
  if (base.length < 4) return false;
  if (hay.includes(base)) return true;
  const hayBase = normalizeClinicalIngredientKey(hay);
  if (hayBase === base || hayBase.includes(base)) return true;
  const baseWords = base.split(" ").filter((w) => w.length >= 4);
  return baseWords.length > 0 && baseWords.every((w) => hayBase.includes(w));
}

function isJardianceOrEmpagliflozinFamily(family: PermanentBenchmarkFamily): boolean {
  const id = family.benchmarkFamilyId.toLowerCase();
  if (id.includes("jardiance") || id.includes("empagliflozin")) return true;
  const blob = [
    family.canonicalGenericName,
    ...family.commonBrandNames,
    ...family.commonGenericNames,
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes("jardiance") || blob.includes("empagliflozin");
}

function isExactBrandQuery(family: PermanentBenchmarkFamily, query: string): boolean {
  const q = query.toLowerCase();
  return family.commonBrandNames.some((b) => b.toLowerCase() === q);
}

/** Family-level strengths apply to generic/INN queries, not brand/product SKUs. */
export function shouldValidateFamilyLevelStrengths(
  family: PermanentBenchmarkFamily,
  query: string
): boolean {
  if (family.expectedStrengths.length === 0) return false;
  const q = query.toLowerCase().trim();
  if (isExactBrandQuery(family, q)) return false;
  if (family.canonicalGenericName.toLowerCase() === q) return true;
  if (family.commonGenericNames.some((g) => g.toLowerCase() === q)) return true;
  // Generic-ish terms present in search terms but not brand list.
  return family.commonSearchTerms.some((t) => t.toLowerCase() === q) &&
    !family.commonBrandNames.some((b) => b.toLowerCase() === q);
}

function corpusToBenchmarkFamily(f: ProviderClinicalCorpusFamily): PermanentBenchmarkFamily {
  const brands = [...f.brandQueries];
  const generics = [...f.genericQueries];
  return {
    benchmarkFamilyId: f.id,
    canonicalGenericName: generics[0] || f.id,
    commonBrandNames: brands,
    commonGenericNames: generics,
    commonSearchTerms: [...brands, ...generics],
    expectedStrengths: [...(f.requiredStrengthSubstrings || [])],
    expectedOrderability: true,
    requiredForED:
      f.specialty === "ER" ||
      f.specialty === "CRITICAL_CARE" ||
      f.specialty === "HIV" ||
      Boolean(f.hardAcceptance),
    clinicalDomains: [f.specialty],
    hardAcceptance: Boolean(f.hardAcceptance) ||
      (PERMANENT_HARD_ACCEPTANCE_FAMILY_IDS as readonly string[]).includes(f.id) ||
      f.id.includes("biktarvy") ||
      f.id.includes("jardiance") ||
      f.id.includes("empagliflozin"),
    source: "MEDORA_PROVIDER_CLINICAL_CORPUS",
    sourceVersion: PERMANENT_MEDICATION_VALIDATION_SUITE_BENCHMARK_VERSION,
  };
}

/** Tier-1 critical benchmark: full clinical corpus (hundreds of families). */
export function buildPermanentCriticalBenchmark(): PermanentBenchmarkFamily[] {
  const byId = new Map<string, PermanentBenchmarkFamily>();
  for (const f of MEDICATION_PROVIDER_CLINICAL_CORPUS) {
    byId.set(f.id, corpusToBenchmarkFamily(f));
  }
  // Ensure hard-acceptance probes from runtime remain represented.
  for (const id of PERMANENT_HARD_ACCEPTANCE_FAMILY_IDS) {
    if (!byId.has(id)) {
      const hit = MEDICATION_PROVIDER_CLINICAL_CORPUS.find(
        (f) => f.id === id || f.id.includes(id) || f.genericQueries.some((g) => g.toLowerCase().includes(id))
      );
      if (hit) byId.set(hit.id, { ...corpusToBenchmarkFamily(hit), hardAcceptance: true });
    }
  }
  return [...byId.values()];
}

export function listPermanentHardAcceptanceBenchmark(): PermanentBenchmarkFamily[] {
  return buildPermanentCriticalBenchmark().filter((f) => f.hardAcceptance);
}

export function formatPermanentValidationFailure(f: PermanentValidationFailure): string {
  return [
    `Medication family: ${f.familyId}`,
    f.facilityName ? `Facility: ${f.facilityName}` : null,
    `Query: "${f.query}"`,
    `Expected: ${f.expected}`,
    `Actual: ${f.actual}`,
    `Failure type: ${f.classification}`,
    f.environmentHost ? `Environment host: ${f.environmentHost}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function validateFamilySearchResult(input: {
  family: PermanentBenchmarkFamily;
  query: string;
  items: PermanentValidationSearchItem[];
}): PermanentValidationFailure | null {
  const { family, query, items } = input;
  if (family.intentionalExclusion) return null;

  if (items.length === 0) {
    return {
      familyId: family.benchmarkFamilyId,
      query,
      classification: "MISSING_FAMILY",
      expected: `${family.commonBrandNames[0] || family.canonicalGenericName} family results`,
      actual: "no results",
    };
  }

  const tokens = [
    family.canonicalGenericName,
    ...family.commonBrandNames,
    ...family.commonGenericNames,
    ...family.commonSearchTerms,
  ]
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 3);

  const hayAll = items
    .map((i) =>
      [
        i.label,
        i.name,
        i.displayNameEn,
        i.code,
        i.searchText,
        i.metadata?.genericName,
        i.metadata?.strength,
      ]
        .join(" ")
        .toLowerCase()
    )
    .join(" || ");

  const familyHit = tokens.some((t) => clinicalFamilyTokenMatch(t, hayAll));
  if (!familyHit) {
    const brandQuery =
      isExactBrandQuery(family, query) ||
      ["jard", "jar", "bikt", "biktar"].includes(query.toLowerCase());
    return {
      familyId: family.benchmarkFamilyId,
      query,
      classification: brandQuery ? "HIDDEN_BY_RANKING" : "WRONG_FAMILY",
      expected: `${family.commonBrandNames[0] || family.canonicalGenericName} family results`,
      actual: items
        .slice(0, 3)
        .map((i) => i.metadata?.genericName || i.label || i.code || "?")
        .join(", "),
    };
  }

  if (family.expectedOrderability) {
    const orderable = items.some(
      (i) =>
        Boolean(i.metadata?.strength?.trim()) &&
        Boolean(i.metadata?.dosageForm?.trim()) &&
        Boolean(i.metadata?.route?.trim())
    );
    if (!orderable) {
      return {
        familyId: family.benchmarkFamilyId,
        query,
        classification: "NOT_ORDERABLE",
        expected: "strength + dosageForm + route on at least one result",
        actual: "no orderable-shaped variant",
      };
    }
  }

  if (shouldValidateFamilyLevelStrengths(family, query)) {
    const strengthBlob = items
      .map((i) => (i.metadata?.strength || "").toLowerCase())
      .join(" | ");
    const missing = family.expectedStrengths.filter(
      (s) => !strengthBlob.includes(s.toLowerCase())
    );
    if (missing.length > 0) {
      return {
        familyId: family.benchmarkFamilyId,
        query,
        classification: "MISSING_STRENGTH",
        expected: missing.join(", "),
        actual: strengthBlob || "(none)",
      };
    }
  }

  // Exact brand / jar prefix ranking — scoped to the family's expected identity.
  const qLower = query.toLowerCase();
  const jarPrefix = qLower === "jard" || qLower === "jar";
  if (isExactBrandQuery(family, query) || jarPrefix) {
    const top = items[0];
    const topHay = [
      top?.label,
      top?.name,
      top?.displayNameEn,
      top?.metadata?.genericName,
      top?.searchText,
    ]
      .join(" ")
      .toLowerCase();

    // Jardiance/empagliflozin only: tirzepatide must not outrank for jar/jard/Jardiance.
    if (
      (jarPrefix || isJardianceOrEmpagliflozinFamily(family)) &&
      isJardianceOrEmpagliflozinFamily(family)
    ) {
      if (
        topHay.includes("tirzepatide") &&
        !topHay.includes("empagliflozin") &&
        !topHay.includes("jardiance")
      ) {
        return {
          familyId: family.benchmarkFamilyId,
          query,
          classification: "HIDDEN_BY_RANKING",
          expected: "Jardiance/empagliflozin family first",
          actual: top?.metadata?.genericName || top?.label || "unrelated top hit",
        };
      }
    }

    const brandOk = tokens.some((t) => clinicalFamilyTokenMatch(t, topHay));
    if (!brandOk) {
      return {
        familyId: family.benchmarkFamilyId,
        query,
        classification: "HIDDEN_BY_RANKING",
        expected: `top result related to ${family.canonicalGenericName}`,
        actual: top?.metadata?.genericName || top?.label || "?",
      };
    }
  }

  return null;
}

/** Controlled negative-test helper: mask brand terms from items (isolated fixture). */
export function maskBrandFromSearchItems(
  items: PermanentValidationSearchItem[],
  brandToken: string
): PermanentValidationSearchItem[] {
  const token = brandToken.toLowerCase();
  return items
    .map((item) => {
      const hay = [item.label, item.name, item.displayNameEn, item.searchText, item.code]
        .join(" ")
        .toLowerCase();
      if (hay.includes(token)) return null;
      return item;
    })
    .filter((x): x is PermanentValidationSearchItem => x != null);
}

export function decidePermanentMedicationValidationSuite(input: {
  schemaOk: boolean;
  criticalSuitePass: boolean;
  fullSuiteConfigured: boolean;
  deploymentSuiteConfigured: boolean;
  usedRealProviderSearchPath: boolean;
  usedSnapshotBypassAsGate: boolean;
  negativeRegressionTestPass: boolean;
  ciIntegrationPresent: boolean;
  reportsGenerated: boolean;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  migrationRequired: boolean;
}): PermanentMedicationValidationSuiteDecision {
  if (
    !input.schemaOk ||
    !input.criticalSuitePass ||
    !input.usedRealProviderSearchPath ||
    input.usedSnapshotBypassAsGate ||
    !input.negativeRegressionTestPass ||
    !input.ciIntegrationPresent ||
    !input.reportsGenerated ||
    input.orderMutations > 0 ||
    input.marMutations > 0 ||
    input.chartMutations > 0 ||
    input.migrationRequired
  ) {
    return "PERMANENT_MEDICATION_VALIDATION_SUITE_NOT_CERTIFIED";
  }

  if (!input.fullSuiteConfigured || !input.deploymentSuiteConfigured) {
    return "PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFIED_WITH_REVIEW_ITEMS";
  }

  return "PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFIED";
}

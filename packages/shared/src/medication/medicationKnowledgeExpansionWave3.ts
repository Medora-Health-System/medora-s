/**
 * Medication Knowledge Expansion Wave 3 — Import-Driven Platform + Formulary Expansion.
 * Not Medication Intelligence Phase 19. Not Enterprise Formulary Wave 3.
 */

import { deriveMedicationCatalogCode } from "./medicationCatalogCodeDerive.js";
import { normalizeMedicationFamilyName } from "./medicationKnowledgePopulationGovernance.js";

export const MK_EXPANSION_WAVE3_CERTIFICATION_ID =
  "MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_IMPORT_DRIVEN_COMPREHENSIVE_FORMULARY";

export const MK_EXPANSION_WAVE3_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_IMPORT_PLATFORM";

export const MK_EXPANSION_WAVE3_PROGRAM_KEY = "EM_KNOWLEDGE_EXPANSION_WAVE3_IMPORT_V1";

export const MK_EXPANSION_WAVE3_CONCEPT_PREFIX = "EM_W3C_";

export const MK_EXPANSION_WAVE3_IMPORTER_VERSION = "wave3-import-1.0.0";

export const MK_EXPANSION_WAVE3_TARGET_TOTAL_GENERICS = 2000;

export const MK_EXPANSION_WAVE3_DEFAULTS = {
  fabricateRxNorm: false,
  fabricateNdc: false,
  fabricateClinicalKnowledge: false,
  autoPlaceOrders: false,
  autoMutateMar: false,
  autoMutateChart: false,
  orderFromRecommendationEnabled: false,
  productionCdsEnabled: false,
  enterpriseActiveAllowed: false,
  duplicateMedicationMaster: false,
  silentlyMergeAmbiguous: false,
  ingestUnapprovedSource: false,
  ingestLicensedCommercialWithoutLicense: false,
} as const;

export const MK_EXPANSION_WAVE3_CERTIFICATION_DECISION_VALUES = [
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_CERTIFIED",
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_CERTIFIED_WITH_REVIEW_ITEMS",
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_NOT_CERTIFIED",
] as const;

export type MkExpansionWave3CertificationDecision =
  (typeof MK_EXPANSION_WAVE3_CERTIFICATION_DECISION_VALUES)[number];

export const MK_EXPANSION_WAVE3_PIPELINE_MODES = [
  "AUDIT",
  "VALIDATE",
  "DRY_RUN",
  "APPLY",
  "VERIFY",
  "REPORT",
  "RECONCILE",
] as const;

export type MkExpansionWave3PipelineMode =
  (typeof MK_EXPANSION_WAVE3_PIPELINE_MODES)[number];

export const MK_EXPANSION_WAVE3_OUTCOMES = [
  "NEW_CANONICAL_CONCEPT",
  "EXISTING_CANONICAL_MATCH",
  "EXISTING_CONCEPT_NEW_ALIAS",
  "EXISTING_CONCEPT_NEW_BRAND",
  "EXISTING_CONCEPT_NEW_FORM",
  "EXISTING_CONCEPT_NEW_STRENGTH",
  "EXISTING_CONCEPT_NEW_PRODUCT",
  "EXISTING_CONCEPT_NEW_PACKAGE",
  "EXISTING_CONCEPT_NEW_MAPPING",
  "DUPLICATE_REJECTED",
  "AMBIGUOUS_MATCH",
  "CONFLICT_REQUIRES_REVIEW",
  "SOURCE_RECORD_INVALID",
  "SOURCE_INSUFFICIENT",
  "RETIRED_SOURCE_CONCEPT",
  "OUT_OF_SCOPE",
] as const;

export type MkExpansionWave3Outcome = (typeof MK_EXPANSION_WAVE3_OUTCOMES)[number];

export type MkExpansionWave3SourceKey =
  | "RXNORM"
  | "DAILYMED"
  | "FDA"
  | "MEDORA_CURATED"
  | "MEDORA_WAVE2"
  | "FACILITY_FORMULARY"
  | "LICENSED_COMMERCIAL";

export type MkExpansionWave3SourceApprovalStatus =
  | "REGISTERED"
  | "VALIDATED"
  | "APPROVED_FOR_INGESTION"
  | "IMPORTED"
  | "ACTIVATED"
  | "REJECTED";

export type MkExpansionWave3SourceDefinition = {
  sourceKey: MkExpansionWave3SourceKey;
  sourceName: string;
  sourceType: string;
  authority: string;
  licenseClassification: string;
  approvalStatus: MkExpansionWave3SourceApprovalStatus;
  notes: string;
};

export const MK_EXPANSION_WAVE3_SOURCE_REGISTRY: readonly MkExpansionWave3SourceDefinition[] = [
  {
    sourceKey: "MEDORA_CURATED",
    sourceName: "Medora curated hospital/ambulatory formulary extract",
    sourceType: "CURATED_MANIFEST",
    authority: "MEDORA",
    licenseClassification: "INTERNAL_CURATED",
    approvalStatus: "APPROVED_FOR_INGESTION",
    notes: "Primary Wave 3 deterministic local extract; no RxNorm/NDC fabricated",
  },
  {
    sourceKey: "MEDORA_WAVE2",
    sourceName: "Wave 2 EM catalog content",
    sourceType: "PRIOR_EXPANSION",
    authority: "MEDORA",
    licenseClassification: "INTERNAL_CURATED",
    approvalStatus: "IMPORTED",
    notes: "Match-only; do not re-create",
  },
  {
    sourceKey: "RXNORM",
    sourceName: "RxNorm / RxNav terminology",
    sourceType: "TERMINOLOGY",
    authority: "NLM",
    licenseClassification: "PUBLIC_TERMINOLOGY",
    approvalStatus: "REGISTERED",
    notes: "Staging/mapping lane only; never invent RxCUI; not full CDS",
  },
  {
    sourceKey: "DAILYMED",
    sourceName: "DailyMed structured labeling",
    sourceType: "LABELING",
    authority: "FDA/NLM",
    licenseClassification: "PUBLIC_LABELING",
    approvalStatus: "REGISTERED",
    notes: "Enrichment/provenance only; no bulk narrative copy in Wave 3",
  },
  {
    sourceKey: "FDA",
    sourceName: "FDA public resources",
    sourceType: "PUBLIC_AUTHORITY",
    authority: "FDA",
    licenseClassification: "PUBLIC",
    approvalStatus: "REGISTERED",
    notes: "Adapter reserved; not primary Wave 3 CREATE source",
  },
  {
    sourceKey: "FACILITY_FORMULARY",
    sourceName: "Facility formulary workbook",
    sourceType: "FACILITY",
    authority: "FACILITY",
    licenseClassification: "FACILITY_LOCAL",
    approvalStatus: "REGISTERED",
    notes: "Existing formulary staging path — not global CREATE",
  },
  {
    sourceKey: "LICENSED_COMMERCIAL",
    sourceName: "Licensed commercial medication knowledge (e.g. FDB)",
    sourceType: "COMMERCIAL",
    authority: "VENDOR",
    licenseClassification: "REQUIRES_LICENSE",
    approvalStatus: "REJECTED",
    notes: "Rejected without active license and approved integration",
  },
] as const;

export function getMkExpansionWave3Source(
  sourceKey: string
): MkExpansionWave3SourceDefinition | undefined {
  return MK_EXPANSION_WAVE3_SOURCE_REGISTRY.find((s) => s.sourceKey === sourceKey);
}

export function assertMkExpansionWave3SourceApprovedForIngestion(sourceKey: string): void {
  const src = getMkExpansionWave3Source(sourceKey);
  if (!src) throw new Error(`Unknown Wave 3 source: ${sourceKey}`);
  if (src.approvalStatus !== "APPROVED_FOR_INGESTION" && src.approvalStatus !== "IMPORTED") {
    throw new Error(
      `Wave 3 source ${sourceKey} is not approved for ingestion (status=${src.approvalStatus}).`
    );
  }
  if (sourceKey === "LICENSED_COMMERCIAL") {
    throw new Error("Wave 3 forbids licensed commercial ingest without license.");
  }
}

export type MkExpansionWave3Variant = {
  strength: string;
  dosageForm: string;
  route: string;
  administrationType: string;
  billingClass: string;
};

export type MkExpansionWave3Candidate = {
  conceptKey: string;
  genericName: string;
  domain: string;
  displayNameEn: string;
  displayNameFr: string;
  therapeuticClass: string;
  aliases: readonly string[];
  brands: readonly string[];
  variants: readonly MkExpansionWave3Variant[];
  sourceNote?: string;
};

export function normalizeMkExpansionWave3ConceptKey(raw: string): string {
  return normalizeMedicationFamilyName(raw)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function mkExpansionWave3ConceptCode(conceptKey: string): string {
  const slug = normalizeMkExpansionWave3ConceptKey(conceptKey)
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${MK_EXPANSION_WAVE3_CONCEPT_PREFIX}${slug || "UNKNOWN"}`.slice(0, 120);
}

export function mkExpansionWave3CatalogCode(input: {
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
}): string {
  return deriveMedicationCatalogCode(input).slice(0, 120);
}

export function assertMkExpansionWave3SafetyDefaults(): void {
  const d = MK_EXPANSION_WAVE3_DEFAULTS;
  if (
    d.fabricateRxNorm ||
    d.fabricateNdc ||
    d.fabricateClinicalKnowledge ||
    d.duplicateMedicationMaster ||
    d.silentlyMergeAmbiguous ||
    d.ingestUnapprovedSource ||
    d.ingestLicensedCommercialWithoutLicense ||
    d.autoPlaceOrders ||
    d.autoMutateMar ||
    d.autoMutateChart ||
    d.orderFromRecommendationEnabled ||
    d.productionCdsEnabled ||
    d.enterpriseActiveAllowed
  ) {
    throw new Error("Wave 3 safety defaults violated.");
  }
}

export function classifyMkExpansionWave3Candidate(input: {
  conceptKey: string;
  variants: readonly MkExpansionWave3Variant[];
  existingNormalizedGenerics: ReadonlySet<string>;
  existingCatalogCodes: ReadonlySet<string>;
}): {
  outcome: MkExpansionWave3Outcome;
  netNewConcept: boolean;
  variantActions: Array<{
    catalogCode: string;
    action: "CREATE_VARIANT" | "SKIP_DUPLICATE_CODE" | "SOURCE_INSUFFICIENT";
  }>;
} {
  const key = normalizeMkExpansionWave3ConceptKey(input.conceptKey);
  if (!key || input.variants.length === 0) {
    return { outcome: "SOURCE_INSUFFICIENT", netNewConcept: false, variantActions: [] };
  }

  const genericExists = input.existingNormalizedGenerics.has(key);
  const variantActions: Array<{
    catalogCode: string;
    action: "CREATE_VARIANT" | "SKIP_DUPLICATE_CODE" | "SOURCE_INSUFFICIENT";
  }> = [];
  let creatable = 0;

  for (const v of input.variants) {
    if (!v.strength?.trim() || !v.dosageForm?.trim() || !v.route?.trim()) {
      variantActions.push({ catalogCode: "", action: "SOURCE_INSUFFICIENT" });
      continue;
    }
    const catalogCode = mkExpansionWave3CatalogCode({
      genericName: key,
      strength: v.strength,
      dosageForm: v.dosageForm,
      route: v.route,
    });
    if (input.existingCatalogCodes.has(catalogCode)) {
      variantActions.push({ catalogCode, action: "SKIP_DUPLICATE_CODE" });
    } else {
      variantActions.push({ catalogCode, action: "CREATE_VARIANT" });
      creatable += 1;
    }
  }

  if (creatable === 0) {
    return {
      outcome: genericExists ? "EXISTING_CANONICAL_MATCH" : "DUPLICATE_REJECTED",
      netNewConcept: false,
      variantActions,
    };
  }

  if (!genericExists) {
    return {
      outcome: "NEW_CANONICAL_CONCEPT",
      netNewConcept: true,
      variantActions,
    };
  }

  return {
    outcome: "EXISTING_CONCEPT_NEW_PRODUCT",
    netNewConcept: false,
    variantActions,
  };
}

export function buildMkExpansionWave3VariantSearchText(input: {
  genericName: string;
  displayNameEn: string;
  displayNameFr: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  domain: string;
  aliases: readonly string[];
  brands: readonly string[];
}): string {
  const parts = [
    input.genericName,
    input.displayNameEn,
    input.displayNameFr,
    input.strength,
    input.dosageForm,
    input.route,
    input.therapeuticClass,
    input.domain,
    `EM_DOMAIN:${input.domain.trim().toUpperCase()}`,
    ...input.aliases,
    ...input.brands,
  ]
    .map((p) => String(p ?? "").toLowerCase().trim())
    .filter(Boolean);
  return [...new Set(parts)].join(" ").slice(0, 2000);
}

/** RxNorm term-type → Medora model policy (documentation + adapter guardrails). */
export const MK_EXPANSION_WAVE3_RXNORM_TERM_TYPE_POLICY = {
  IN: "MAY_CREATE_OR_MATCH_CANONICAL_GENERIC",
  PIN: "MAY_CREATE_OR_MATCH_CANONICAL_GENERIC",
  MIN: "MAY_CREATE_OR_MATCH_MULTI_INGREDIENT_GENERIC",
  BN: "ALIAS_OR_BRAND_ONLY",
  SCD: "PRODUCT_OR_CLINICAL_DRUG_VARIANT",
  SBD: "BRANDED_PRODUCT_VARIANT",
  SCDF: "DOSE_FORM_RELATIONSHIP",
  SBDF: "DOSE_FORM_RELATIONSHIP",
  SCDC: "STRENGTH_COMPONENT",
  SBDC: "STRENGTH_COMPONENT",
  DEFAULT_OTHER: "IGNORE_OR_STAGE_ONLY",
} as const;

/**
 * Medication Knowledge Expansion Wave 4 — Clinical Medication Library Expansion.
 * Reuses Wave 3 import platform types/helpers. Not Medication Intelligence Phase 19.
 * Distinct from Enterprise Formulary Wave 4.
 */

import {
  assertMkExpansionWave3SafetyDefaults,
  assertMkExpansionWave3SourceApprovedForIngestion,
  buildMkExpansionWave3VariantSearchText,
  classifyMkExpansionWave3Candidate,
  normalizeMkExpansionWave3ConceptKey,
  type MkExpansionWave3Candidate,
  type MkExpansionWave3Outcome,
  type MkExpansionWave3PipelineMode,
  type MkExpansionWave3Variant,
} from "./medicationKnowledgeExpansionWave3.js";
import { deriveMedicationCatalogCode } from "./medicationCatalogCodeDerive.js";

export const MK_EXPANSION_WAVE4_CERTIFICATION_ID =
  "MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CLINICAL_LIBRARY";

export const MK_EXPANSION_WAVE4_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CLINICAL_LIBRARY_EXPANSION";

export const MK_EXPANSION_WAVE4_PROGRAM_KEY = "EM_KNOWLEDGE_EXPANSION_WAVE4_IMPORT_V1";

export const MK_EXPANSION_WAVE4_CONCEPT_PREFIX = "EM_W4C_";

export const MK_EXPANSION_WAVE4_IMPORTER_VERSION = "wave4-import-1.0.0";

export const MK_EXPANSION_WAVE4_TARGET_TOTAL_GENERICS = 5000;

export const MK_EXPANSION_WAVE4_CERTIFICATION_DECISION_VALUES = [
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CERTIFIED",
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CERTIFIED_WITH_REVIEW_ITEMS",
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_NOT_CERTIFIED",
] as const;

export type MkExpansionWave4CertificationDecision =
  (typeof MK_EXPANSION_WAVE4_CERTIFICATION_DECISION_VALUES)[number];

export type MkExpansionWave4Candidate = MkExpansionWave3Candidate;
export type MkExpansionWave4Variant = MkExpansionWave3Variant;
export type MkExpansionWave4PipelineMode = MkExpansionWave3PipelineMode;
export type MkExpansionWave4Outcome = MkExpansionWave3Outcome;

export const MK_EXPANSION_WAVE4_DEFAULTS = {
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
  redesignWave3Platform: false,
} as const;

export function assertMkExpansionWave4SafetyDefaults(): void {
  assertMkExpansionWave3SafetyDefaults();
  if (MK_EXPANSION_WAVE4_DEFAULTS.redesignWave3Platform) {
    throw new Error("Wave 4 must reuse Wave 3 import platform.");
  }
}

export function assertMkExpansionWave4SourceApprovedForIngestion(sourceKey: string): void {
  assertMkExpansionWave3SourceApprovedForIngestion(sourceKey);
}

export function normalizeMkExpansionWave4ConceptKey(raw: string): string {
  return normalizeMkExpansionWave3ConceptKey(raw);
}

export function mkExpansionWave4ConceptCode(conceptKey: string): string {
  const slug = normalizeMkExpansionWave4ConceptKey(conceptKey)
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${MK_EXPANSION_WAVE4_CONCEPT_PREFIX}${slug || "UNKNOWN"}`.slice(0, 120);
}

export function mkExpansionWave4CatalogCode(input: {
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
}): string {
  return deriveMedicationCatalogCode(input).slice(0, 120);
}

export function classifyMkExpansionWave4Candidate(input: {
  conceptKey: string;
  variants: readonly MkExpansionWave4Variant[];
  existingNormalizedGenerics: ReadonlySet<string>;
  existingCatalogCodes: ReadonlySet<string>;
}) {
  return classifyMkExpansionWave3Candidate(input);
}

export function buildMkExpansionWave4VariantSearchText(
  input: Parameters<typeof buildMkExpansionWave3VariantSearchText>[0]
): string {
  return buildMkExpansionWave3VariantSearchText(input);
}

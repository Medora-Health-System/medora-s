/**
 * Phase 7 — controlled Emergency Medicine batch governance.
 * Reuses Phase 6.5 duplicate prevention; forbids auto-verify and clinical activation.
 */
import {
  assertNoAutomaticDuplicateMerge,
  assertNoBulkRealMappingApproval,
  assertPilotClinicalActivationDisabled,
  unresolvedExactDuplicatesBlockStaging,
  type MedicationDuplicateClassification,
} from "./medicationPilotDuplicatePrevention.js";

export const MEDICATION_BATCH_STATUS_VALUES = [
  "DRAFT",
  "SOURCE_VALIDATED",
  "EXTRACTED",
  "NORMALIZED",
  "DEDUPE_REVIEW_REQUIRED",
  "DEDUPE_APPROVED",
  "READY_TO_STAGE",
  "STAGED",
  "MAPPING_REVIEW_IN_PROGRESS",
  "MAPPING_REVIEW_COMPLETE",
  "CATALOG_PREPARATION_COMPLETE",
  "ROLLBACK_VALIDATED",
  "COMPLETED",
  "FAILED",
  "ROLLED_BACK",
] as const;

export type MedicationBatchStatus = (typeof MEDICATION_BATCH_STATUS_VALUES)[number];

export const MEDICATION_BATCH_ENTITY_LAYER_VALUES = [
  "MEDICATION_FAMILY",
  "CANONICAL_CONCEPT",
  "CLINICALLY_DISTINCT_PRODUCT",
  "PACKAGE_PRESENTATION",
  "CATALOG_PREPARATION_RECORD",
  "ORDERABLE_MEDICATION",
] as const;

export type MedicationBatchEntityLayer =
  (typeof MEDICATION_BATCH_ENTITY_LAYER_VALUES)[number];

export const MEDICATION_BATCH_REUSE_OUTCOME_VALUES = [
  "REUSE_EXISTING_CONCEPT",
  "REUSE_EXISTING_PRODUCT",
  "REUSE_EXISTING_PACKAGE",
  "REUSE_EXISTING_MAPPING",
  "CREATE_NEW_CONCEPT_PROPOSAL",
  "CREATE_NEW_PRODUCT_PROPOSAL",
  "CREATE_NEW_PACKAGE_PROPOSAL",
  "LINK_AS_SYNONYM",
  "BLOCK_EXACT_DUPLICATE",
  "BLOCK_IDENTITY_COLLISION",
  "BLOCK_NDC_CONFLICT",
  "BLOCK_MAPPING_CONFLICT",
  "BLOCK_FALSE_MERGE_RISK",
  "REQUIRES_HUMAN_REVIEW",
  "EXCLUDE_FROM_BATCH",
] as const;

export type MedicationBatchReuseOutcome =
  (typeof MEDICATION_BATCH_REUSE_OUTCOME_VALUES)[number];

export const MEDICATION_BATCH_FRENCH_DISPLAY_STATUS_VALUES = [
  "CURATED_FRENCH_AVAILABLE",
  "CURATED_FRENCH_MISSING",
  "SOURCE_FRENCH_AVAILABLE",
  "TRANSLATION_REVIEW_REQUIRED",
  "NOT_APPLICABLE",
] as const;

export type MedicationBatchFrenchDisplayStatus =
  (typeof MEDICATION_BATCH_FRENCH_DISPLAY_STATUS_VALUES)[number];

export const MEDICATION_BATCH_GOVERNANCE_REVIEW_VALUES = [
  "CONTROLLED_SUBSTANCE_REVIEW_REQUIRED",
  "HIGH_ALERT_REVIEW_REQUIRED",
  "STANDARD_REVIEW",
] as const;

export type MedicationBatchGovernanceReview =
  (typeof MEDICATION_BATCH_GOVERNANCE_REVIEW_VALUES)[number];

export const MEDICATION_BATCH_CATALOG_LIFECYCLE_VALUES = [
  "BATCH_STAGED",
  "IDENTITY_CONFIRMED",
  "RXNORM_VERIFIED",
  "CATALOG_PREPARED",
  "CLINICAL_REVIEW_REQUIRED",
  "CLINICALLY_INACTIVE",
] as const;

export type MedicationBatchCatalogLifecycle =
  (typeof MEDICATION_BATCH_CATALOG_LIFECYCLE_VALUES)[number];

/** Allowed ordered transitions (no skips). */
export const MEDICATION_BATCH_STATUS_TRANSITIONS: Record<
  MedicationBatchStatus,
  readonly MedicationBatchStatus[]
> = {
  DRAFT: ["SOURCE_VALIDATED", "FAILED"],
  SOURCE_VALIDATED: ["EXTRACTED", "FAILED"],
  EXTRACTED: ["NORMALIZED", "FAILED"],
  NORMALIZED: ["DEDUPE_REVIEW_REQUIRED", "FAILED"],
  DEDUPE_REVIEW_REQUIRED: ["DEDUPE_APPROVED", "FAILED"],
  DEDUPE_APPROVED: ["READY_TO_STAGE", "FAILED"],
  READY_TO_STAGE: ["STAGED", "FAILED"],
  STAGED: ["MAPPING_REVIEW_IN_PROGRESS", "ROLLED_BACK", "FAILED"],
  MAPPING_REVIEW_IN_PROGRESS: ["MAPPING_REVIEW_COMPLETE", "FAILED"],
  MAPPING_REVIEW_COMPLETE: ["CATALOG_PREPARATION_COMPLETE", "FAILED"],
  CATALOG_PREPARATION_COMPLETE: ["ROLLBACK_VALIDATED", "COMPLETED", "FAILED"],
  ROLLBACK_VALIDATED: ["COMPLETED", "ROLLED_BACK", "FAILED"],
  COMPLETED: [],
  FAILED: ["DRAFT"],
  ROLLED_BACK: ["DRAFT"],
};

export function assertBatchClinicalActivationDisabled(
  clinicalActivationAllowed: boolean
): void {
  assertPilotClinicalActivationDisabled(clinicalActivationAllowed);
}

export function assertBatchNoBulkRealMappingApproval(action: string): void {
  assertNoBulkRealMappingApproval(action);
}

export function assertBatchNoAutomaticDuplicateMerge(
  classification: MedicationDuplicateClassification
): void {
  assertNoAutomaticDuplicateMerge(classification);
}

export function batchUnresolvedExactDuplicatesBlockStaging(
  classifications: MedicationDuplicateClassification[]
): boolean {
  return unresolvedExactDuplicatesBlockStaging(classifications);
}

export function assertLegalBatchStatusTransition(
  from: MedicationBatchStatus,
  to: MedicationBatchStatus
): void {
  const allowed = MEDICATION_BATCH_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal batch status transition ${from} → ${to}.`);
  }
}

export function assertAuthenticSourceNotFixtureMasquerade(input: {
  sourceClassification: string;
  isSynthetic: boolean;
  allowStructuralFixtureForCi?: boolean;
}): void {
  const classification = input.sourceClassification.trim().toUpperCase();
  const authentic =
    classification === "AUTHENTIC_NLM_RXNORM" ||
    classification === "NLM_OFFICIAL" ||
    classification === "APPROVED_NLM_EXTRACT";
  if (authentic && input.isSynthetic) {
    throw new Error("Authentic RxNorm source cannot be marked isSynthetic=true.");
  }
  if (
    !input.allowStructuralFixtureForCi &&
    (classification === "SYNTHETIC_FIXTURE" || classification === "DEV_SAMPLE") &&
    authentic
  ) {
    throw new Error("Fixture source cannot masquerade as authentic RxNorm.");
  }
}

export const PHASE7_BATCH_DEFAULTS = {
  clinicalDomain: "EMERGENCY_MEDICINE",
  dataClassification: "CONTROLLED_REAL_BATCH",
  duplicateReviewRequired: true,
  humanVerificationRequired: true,
  clinicalActivationAllowed: false,
  batchStatus: "DRAFT" as MedicationBatchStatus,
  sourceClassification: "AUTHENTIC_NLM_RXNORM",
  releaseScope: "CONTROLLED_EMERGENCY_MEDICINE_BATCH",
  importPurpose: "PHASE_7_CONTROLLED_BATCH",
  isSynthetic: false,
  normalizationVersion: "MEDICATION_BATCH_NORMALIZATION_V1",
  parserVersion: "RXNCONSO_PARSER_V1",
} as const;

/** Operator/staging attestation input (not used by CI platform certification). */
export type Phase7BatchAttestationInput = {
  batchId: string;
  batchVersion: string;
  sourceReleaseId: string;
  sourceChecksumVerified: boolean;
  manifestHashVerified: boolean;
  medicationFamiliesApproved: number;
  sourceRowsProcessed: number;
  existingConceptsReused: number;
  existingProductsReused: number;
  existingPackagesReused: number;
  newConceptsCreated: number;
  newProductsCreated: number;
  newPackagesCreated: number;
  exactDuplicatesBlocked: number;
  probableDuplicatesReviewed: number;
  possibleDuplicatesReviewed: number;
  ndcConflictsResolved: number;
  mappingCandidatesCreated: number;
  realMappingsVerified: number;
  mappingsRejected: number;
  mappingsDeferred: number;
  catalogPreparationRecordsCreated: number;
  clinicalActivationsCreated: number;
  rollbackTested: boolean;
  unresolvedBlockingIssues: number;
  attestedBy: string;
  attestedAt: string;
};

export function evaluatePhase7BatchAttestation(input: Phase7BatchAttestationInput): {
  FinalDecision: "MEDICATION_INTELLIGENCE_PHASE_7_BATCH_ATTESTED" | "MEDICATION_INTELLIGENCE_PHASE_7_BATCH_NOT_ATTESTED";
  blockingReasons: string[];
} {
  const blockingReasons: string[] = [];
  if (input.clinicalActivationsCreated > 0) {
    blockingReasons.push("ClinicalActivationsCreated > 0");
  }
  if (input.unresolvedBlockingIssues > 0) {
    blockingReasons.push("UnresolvedBlockingIssues > 0");
  }
  if (!input.sourceChecksumVerified) {
    blockingReasons.push("SourceChecksumVerified = false");
  }
  if (!input.manifestHashVerified) {
    blockingReasons.push("ManifestHashVerified = false");
  }
  return {
    FinalDecision:
      blockingReasons.length === 0
        ? "MEDICATION_INTELLIGENCE_PHASE_7_BATCH_ATTESTED"
        : "MEDICATION_INTELLIGENCE_PHASE_7_BATCH_NOT_ATTESTED",
    blockingReasons,
  };
}

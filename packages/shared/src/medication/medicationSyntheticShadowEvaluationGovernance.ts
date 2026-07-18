/**
 * Phase 14B Part 3 — controlled synthetic shadow evaluation governance.
 * Execution mode label SYNTHETIC_SHADOW; Phase 10 runtime mode remains SHADOW.
 */

import { PHASE13_WAVE1_KEY } from "./medicationSourceBackedValidationGovernance.js";

export const PHASE14B_SYNTHETIC_SHADOW_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  clinicalActivationEnabled: false,
  knowledgeControlsPatientCare: false,
  orderingChanged: false,
  dispensingChanged: false,
  administrationChanged: false,
  marChanged: false,
  billingChanged: false,
  approvedForShadowImpliesProduction: false,
  consumeMutableDraftKnowledge: false,
} as const;

export const PHASE14B_SYNTHETIC_BATCH_KEY =
  "EM_WAVE1_SYNTHETIC_SHADOW_VALIDATION_V1";
export const PHASE14B_SYNTHETIC_BATCH_VERSION = "1.0.0";
export const PHASE14B_SYNTHETIC_REFERENCE_SET_CODE =
  "PHASE14B_EM_WAVE1_SYNTHETIC_SHADOW_V1";
export const PHASE14B_SYNTHETIC_FIXTURE_MARKER =
  "PHASE14B_SYNTHETIC_SHADOW_FIXTURE";
export const PHASE14B_SYNTHETIC_EXECUTION_MODE = "SYNTHETIC_SHADOW";
export const PHASE14B_SYNTHETIC_WAVE_KEY = PHASE13_WAVE1_KEY;

export const PHASE14B_SYNTHETIC_BATCH_STATUS_VALUES = [
  "DRAFT",
  "VALIDATED",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "EXECUTED",
  "ANALYZED",
  "CERTIFIED",
  "FAILED",
  "CANCELLED",
] as const;

export type Phase14BSyntheticBatchStatus =
  (typeof PHASE14B_SYNTHETIC_BATCH_STATUS_VALUES)[number];

export const PHASE14B_SYNTHETIC_CASE_CATEGORY_VALUES = [
  "NEGATIVE_EXPECTED_NO_FINDING",
  "DEFERRED_DOMAIN_GUARD",
  "PROVENANCE_GUARD",
  "IDENTITY_GUARD",
  "KNOWLEDGE_GAP_DOCUMENTATION",
] as const;

export type Phase14BSyntheticCaseCategory =
  (typeof PHASE14B_SYNTHETIC_CASE_CATEGORY_VALUES)[number];

export const PHASE14B_FINDING_CLASSIFICATION_VALUES = [
  "MATCHED",
  "MISSED",
  "UNEXPECTED",
  "SEVERITY_MISMATCH",
  "DOMAIN_MISMATCH",
  "MEDICATION_IDENTITY_MISMATCH",
  "DEFERRED_DOMAIN_SKIPPED",
  "NOT_EVALUABLE",
  "ENGINE_ERROR",
  "PROVENANCE_ERROR",
] as const;

export type Phase14BFindingClassification =
  (typeof PHASE14B_FINDING_CLASSIFICATION_VALUES)[number];

export const PHASE14B_FAMILY_EXECUTION_STATUS_VALUES = [
  "SHADOW_APPROVED_NOT_EXECUTED",
  "SHADOW_EXECUTED_PASS",
  "SHADOW_EXECUTED_PASS_WITH_NONCRITICAL_GAPS",
  "SHADOW_EXECUTED_REQUIRES_REMEDIATION",
  "SHADOW_EXECUTED_FAIL",
  "DEFERRED",
] as const;

export type Phase14BFamilyExecutionStatus =
  (typeof PHASE14B_FAMILY_EXECUTION_STATUS_VALUES)[number];

export const PHASE14B_BATCH_READINESS_VALUES = [
  "NOT_READY",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "EXECUTED_REQUIRES_REVIEW",
  "QUALIFIED_WITH_GAPS",
  "QUALIFIED",
  "FAILED",
] as const;

/** Informational findings permitted on negative synthetic cases (not unexpected). */
export const PHASE14B_PERMITTED_NEGATIVE_CASE_FINDING_TYPES = [
  "INSUFFICIENT_PATIENT_CONTEXT",
] as const;

export const PHASE14B_DEFERRED_DOMAIN_KEYS = [
  "ADULT_DOSING",
  "PEDIATRIC_DOSING",
  "RENAL_DOSING",
  "HEPATIC_DOSING",
  "PREGNANCY",
  "LACTATION",
  "INTERACTIONS",
  "MONITORING",
] as const;

export function assertPhase14BSyntheticNoWorkflowControl(enabled: boolean): void {
  if (enabled) {
    throw new Error(
      "Phase 14B synthetic shadow forbids Medication Intelligence controlling patient care."
    );
  }
}

export function assertPhase14BSyntheticNoClinicalActivation(
  enabled: boolean
): void {
  if (enabled) {
    throw new Error(
      "Phase 14B synthetic shadow forbids clinicalActivationEnabled=true."
    );
  }
}

export function assertNoMutableDraftKnowledgeConsumption(
  consumeDraft: boolean
): void {
  if (consumeDraft) {
    throw new Error(
      "Phase 14B synthetic shadow forbids consuming mutable draft knowledge."
    );
  }
}

export function isPermittedNegativeCaseFinding(findingType: string): boolean {
  return (
    PHASE14B_PERMITTED_NEGATIVE_CASE_FINDING_TYPES as readonly string[]
  ).includes(findingType);
}

export function classifySyntheticFindingOutcome(input: {
  caseCategory: string;
  expectedFindingCount: number;
  actualSafetyFindingCount: number;
  deferredDomain: boolean;
  provenanceOk: boolean;
  identityResolved: boolean;
  engineError: boolean;
}): Phase14BFindingClassification {
  if (input.engineError) return "ENGINE_ERROR";
  if (!input.provenanceOk) return "PROVENANCE_ERROR";
  if (input.caseCategory === "IDENTITY_GUARD") {
    return input.identityResolved ? "MATCHED" : "MEDICATION_IDENTITY_MISMATCH";
  }
  if (
    input.caseCategory === "DEFERRED_DOMAIN_GUARD" ||
    input.deferredDomain
  ) {
    return "DEFERRED_DOMAIN_SKIPPED";
  }
  if (input.caseCategory === "PROVENANCE_GUARD") {
    return input.provenanceOk ? "MATCHED" : "PROVENANCE_ERROR";
  }
  if (input.caseCategory === "KNOWLEDGE_GAP_DOCUMENTATION") {
    return "NOT_EVALUABLE";
  }
  // NEGATIVE_EXPECTED_NO_FINDING
  if (input.expectedFindingCount === 0) {
    if (input.actualSafetyFindingCount === 0) return "MATCHED";
    return "UNEXPECTED";
  }
  if (input.actualSafetyFindingCount > 0) return "MATCHED";
  return "MISSED";
}

export function evaluateFamilyExecutionStatus(input: {
  casesExecuted: number;
  requiredCases: number;
  criticalMisses: number;
  highSeverityMisses: number;
  unresolvedCriticalUnexpected: number;
  provenanceErrors: number;
  identityErrors: number;
  engineErrors: number;
  noncriticalGaps: number;
}): Phase14BFamilyExecutionStatus {
  if (input.casesExecuted < input.requiredCases) {
    return "SHADOW_EXECUTED_REQUIRES_REMEDIATION";
  }
  if (
    input.criticalMisses > 0 ||
    input.unresolvedCriticalUnexpected > 0 ||
    input.provenanceErrors > 0 ||
    input.identityErrors > 0 ||
    input.engineErrors > 0 ||
    input.highSeverityMisses > 0
  ) {
    return "SHADOW_EXECUTED_FAIL";
  }
  if (input.noncriticalGaps > 0) {
    return "SHADOW_EXECUTED_PASS_WITH_NONCRITICAL_GAPS";
  }
  return "SHADOW_EXECUTED_PASS";
}

export function evaluateBatchReadiness(input: {
  validated: boolean;
  executed: boolean;
  analyzed: boolean;
  familiesPassed: number;
  familiesFailed: number;
  familiesWithGaps: number;
  criticalMisses: number;
  targetFamilies: number;
}): (typeof PHASE14B_BATCH_READINESS_VALUES)[number] {
  if (input.criticalMisses > 0 || input.familiesFailed > 0) return "FAILED";
  if (!input.validated) return "NOT_READY";
  if (!input.executed) return "READY_TO_EXECUTE";
  if (!input.analyzed) return "EXECUTED_REQUIRES_REVIEW";
  if (
    input.familiesPassed + input.familiesWithGaps >= input.targetFamilies &&
    input.familiesWithGaps > 0
  ) {
    return "QUALIFIED_WITH_GAPS";
  }
  if (input.familiesPassed >= input.targetFamilies) return "QUALIFIED";
  return "EXECUTED_REQUIRES_REVIEW";
}

/** Deterministic JSON for hashing (sorted keys; jsonb-safe). */
export function stableJsonHashPayload(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(normalize);
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = normalize(obj[key]);
    }
    return out;
  };
  return JSON.stringify(normalize(value));
}

/**
 * Phase 13 — source-backed review, approval-for-shadow, controlled shadow validation.
 * No clinical activation; no automatic knowledge approval; no automatic identity creation.
 */

import { normalizeMedicationFamilyName } from "./medicationKnowledgePopulationGovernance.js";

export const PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  providerOverrideWorkflowEnabled: false,
  clinicalActivationEnabled: false,
  activeCdsModeAvailable: false,
  automaticMedicationIdentityCreationEnabled: false,
  automaticKnowledgeApprovalEnabled: false,
  draftKnowledgeConsumedByShadowEngine: false,
  readyForLiveAlertingAllowed: false,
  readyForActivationAllowed: false,
} as const;

export const PHASE13_WAVE1_KEY = "EM_WAVE1_SOURCE_BACKED_V1";
export const PHASE13_REFERENCE_SET_CODE = "PHASE13_EM_WAVE1_REFERENCE_SET_V1";

/** Suggested Wave 1 candidates — finalize against live resolved identities only. */
export const PHASE13_SUGGESTED_WAVE1_FAMILY_NAMES = [
  "ibuprofen",
  "ondansetron",
  "famotidine",
  "pantoprazole",
  "dexamethasone",
  "prednisone",
  "cetirizine",
  "ipratropium",
] as const;

export const PHASE13_WAVE_STATUS_VALUES = [
  "DRAFT",
  "SELECTION_COMPLETE",
  "SOURCE_COLLECTION",
  "CONTENT_REMEDIATION",
  "UNDER_REVIEW",
  "PARTIALLY_APPROVED",
  "APPROVED",
  "SHADOW_VALIDATION",
  "COMPLETED",
  "BLOCKED",
  "RETIRED",
] as const;

export type Phase13WaveStatus = (typeof PHASE13_WAVE_STATUS_VALUES)[number];

export const PHASE13_IDENTITY_RESOLUTION_OUTCOMES = [
  "RESOLVED_EXISTING_CANONICAL_CONCEPT",
  "RESOLVED_EXISTING_SYNONYM",
  "RESOLVED_GOVERNED_MAPPING",
  "RESOLVED_AFTER_DUPLICATE_REVIEW",
  "RESOLVED_AFTER_INACTIVE_CONCEPT_REACTIVATION_REVIEW",
  "REQUIRES_NEW_CANONICAL_IDENTITY_GOVERNANCE",
  "DEFERRED_IDENTITY_BLOCKER",
  "EXCLUDED_FROM_PHASE13",
  "OPEN",
  "UNDER_INVESTIGATION",
] as const;

export const PHASE13_READINESS_RESULTS = [
  "NOT_READY",
  "REMEDIATION_REQUIRED",
  "READY_FOR_ADDITIONAL_SHADOW_VALIDATION",
] as const;

/** Forbidden readiness results — must never be emitted. */
export const PHASE13_FORBIDDEN_READINESS_RESULTS = [
  "READY_FOR_LIVE_ALERTING",
  "READY_FOR_ACTIVATION",
  "ACTIVE",
  "ENABLED",
] as const;

export const PHASE13_PLACEHOLDER_MARKERS = [
  "INSTITUTIONAL_SCAFFOLDING",
  "PHASE12_KNOWLEDGE_FIXTURE",
  "PHASE12_CLINICAL_FRAMEWORK",
  "PHASE12_SAFETY_FRAMEWORK",
  "PLACEHOLDER",
  "GENERIC_SCAFFOLDING",
] as const;

export function isPhase13PlaceholderContent(
  value: string | null | undefined
): boolean {
  if (!value) return false;
  const upper = value.toUpperCase();
  return PHASE13_PLACEHOLDER_MARKERS.some((m) => upper.includes(m));
}

export function assertPhase13NoAutomaticApproval(autoApprove: boolean): void {
  if (autoApprove) {
    throw new Error("Phase 13 forbids automatic knowledge approval.");
  }
}

export function assertPhase13NoAutomaticIdentityCreation(
  enabled: boolean
): void {
  if (enabled) {
    throw new Error("Phase 13 forbids automatic medication identity creation.");
  }
}

export function assertPhase13NoProviderFacingAlerts(enabled: boolean): void {
  if (enabled) throw new Error("Phase 13 forbids provider-facing alerts.");
}

export function assertPhase13NoOrderBlocking(enabled: boolean): void {
  if (enabled) throw new Error("Phase 13 forbids order blocking.");
}

export function assertPhase13ClinicalActivationDisabled(
  enabled: boolean
): void {
  if (enabled) {
    throw new Error("Phase 13 forbids clinicalActivationEnabled=true.");
  }
}

export function assertPhase13ReadinessCeiling(result: string): void {
  if (
    (PHASE13_FORBIDDEN_READINESS_RESULTS as readonly string[]).includes(result)
  ) {
    throw new Error(`Phase 13 forbids readiness result: ${result}`);
  }
}

export function assertIdentityBlockerNotApproved(input: {
  resolutionStatus: string;
  approved: boolean;
}): void {
  if (
    input.approved &&
    (input.resolutionStatus === "IDENTITY_REVIEW_REQUIRED" ||
      input.resolutionStatus === "UNRESOLVED" ||
      input.resolutionStatus === "DEFERRED_IDENTITY_BLOCKER")
  ) {
    throw new Error(
      "Phase 13 forbids approving knowledge for identity-blocked families."
    );
  }
}

export function assertShadowApprovalGates(input: {
  identityResolved: boolean;
  structuredContentComplete: boolean;
  validSourceVersion: boolean;
  isPlaceholder: boolean;
  clinicalReviewComplete: boolean;
  pharmacistReviewComplete: boolean;
  medicalReviewRequired: boolean;
  medicalReviewComplete: boolean;
  clinicalActivationAllowed: boolean;
  conflictsBlocking: boolean;
}): void {
  if (!input.identityResolved) {
    throw new Error("Shadow approval blocked: identity not resolved.");
  }
  if (input.isPlaceholder) {
    throw new Error("Shadow approval blocked: placeholder/scaffolding content.");
  }
  if (!input.structuredContentComplete) {
    throw new Error("Shadow approval blocked: structured content incomplete.");
  }
  if (!input.validSourceVersion) {
    throw new Error("Shadow approval blocked: valid source version required.");
  }
  if (!input.clinicalReviewComplete) {
    throw new Error("Shadow approval blocked: clinical review incomplete.");
  }
  if (!input.pharmacistReviewComplete) {
    throw new Error("Shadow approval blocked: pharmacist review incomplete.");
  }
  if (input.medicalReviewRequired && !input.medicalReviewComplete) {
    throw new Error("Shadow approval blocked: medical review required.");
  }
  if (input.clinicalActivationAllowed) {
    throw new Error("Shadow approval blocked: clinicalActivationAllowed must be false.");
  }
  if (input.conflictsBlocking) {
    throw new Error("Shadow approval blocked: blocking conflicts open.");
  }
}

export function selectWave1Families(input: {
  resolvedFamilyNames: string[];
  blockedFamilyNames: string[];
  suggested?: readonly string[];
}): string[] {
  const suggested = (input.suggested ?? PHASE13_SUGGESTED_WAVE1_FAMILY_NAMES).map(
    normalizeMedicationFamilyName
  );
  const resolved = new Set(
    input.resolvedFamilyNames.map(normalizeMedicationFamilyName)
  );
  const blocked = new Set(
    input.blockedFamilyNames.map(normalizeMedicationFamilyName)
  );
  return suggested.filter((n) => resolved.has(n) && !blocked.has(n));
}

export function assessPhase13Readiness(input: {
  criticalMisses: number;
  unresolvedIdentityBlockersInWave: number;
  shadowEvaluableFamilies: number;
  approvedForShadowRecords: number;
  openBlockingGaps: number;
}): { result: (typeof PHASE13_READINESS_RESULTS)[number]; reasonCodes: string[] } {
  const reasonCodes: string[] = [];
  if (input.criticalMisses > 0) reasonCodes.push("CRITICAL_MISSES");
  if (input.unresolvedIdentityBlockersInWave > 0) {
    reasonCodes.push("WAVE_IDENTITY_BLOCKERS");
  }
  if (input.openBlockingGaps > 0) reasonCodes.push("BLOCKING_GAPS");
  if (input.approvedForShadowRecords === 0) {
    reasonCodes.push("NO_APPROVED_FOR_SHADOW_RECORDS");
  }
  if (input.shadowEvaluableFamilies === 0) {
    reasonCodes.push("NO_SHADOW_EVALUABLE_FAMILIES");
  }

  if (reasonCodes.includes("CRITICAL_MISSES") || reasonCodes.includes("BLOCKING_GAPS")) {
    return { result: "REMEDIATION_REQUIRED", reasonCodes };
  }
  if (
    input.approvedForShadowRecords > 0 &&
    input.shadowEvaluableFamilies > 0 &&
    input.criticalMisses === 0
  ) {
    return { result: "READY_FOR_ADDITIONAL_SHADOW_VALIDATION", reasonCodes };
  }
  return { result: "NOT_READY", reasonCodes };
}

export function classifyFindingMatch(input: {
  expected: boolean;
  generated: boolean;
  severityMatch?: boolean;
}): string {
  if (input.expected && input.generated) {
    return input.severityMatch === false
      ? "EXPECTED_MATCH_SEVERITY_DIFFERENCE"
      : "EXPECTED_MATCH";
  }
  if (input.expected && !input.generated) return "MISSED_EXPECTED_FINDING";
  if (!input.expected && input.generated) return "UNEXPECTED_FINDING";
  return "NOT_EVALUABLE";
}

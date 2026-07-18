/**
 * Phase 14B — expert knowledge review, quality scoring, shadow qualification.
 * Knowledge approval ≠ patient-care control. Shadow ≠ clinical activation.
 */

import { PHASE13_WAVE1_KEY } from "./medicationSourceBackedValidationGovernance.js";

export const PHASE14B_EXPERT_REVIEW_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  clinicalActivationEnabled: false,
  activeCdsModeAvailable: false,
  automaticKnowledgeApprovalEnabled: false,
  knowledgeControlsPatientCare: false,
  orderingChanged: false,
  dispensingChanged: false,
  administrationChanged: false,
  marChanged: false,
  billingChanged: false,
  approvedForShadowImpliesProduction: false,
} as const;

export const PHASE14B_PROGRAM_KEY = "EM_WAVE1_EXPERT_REVIEW_SHADOW_QUAL_V1";
export const PHASE14B_PROGRAM_VERSION = "1.0.0";
export const PHASE14B_WAVE_KEY = PHASE13_WAVE1_KEY;

export const PHASE14B_DOMAIN_STATUS_VALUES = [
  "NOT_STARTED",
  "DRAFT",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "READY_FOR_REVIEW",
  "REVIEWED",
  "APPROVED_FOR_SHADOW",
  "DEFERRED",
  "REJECTED",
] as const;

export type Phase14BDomainStatus =
  (typeof PHASE14B_DOMAIN_STATUS_VALUES)[number];

export const PHASE14B_CLINICAL_DOMAINS = [
  "INDICATIONS",
  "MECHANISM",
  "ADULT_DOSING",
  "PEDIATRIC_DOSING",
  "RENAL_DOSING",
  "HEPATIC_DOSING",
  "ADMINISTRATION",
  "INFUSION",
  "MONITORING",
  "CONTRAINDICATIONS",
  "PRECAUTIONS",
  "PREGNANCY",
  "LACTATION",
  "CLINICAL_PROFILE",
  "EMERGENCY_CONTEXT",
] as const;

export const PHASE14B_SAFETY_DOMAINS = [
  "INTERACTIONS",
  "DUPLICATE_THERAPY",
  "ALLERGEN_MAPPING",
  "THERAPEUTIC_CLASS",
  "BLACK_BOX_WARNINGS",
  "ADVERSE_REACTIONS",
  "CROSS_REACTIVITY",
  "SAFETY_MONITORING",
] as const;

/** Domains required at REVIEWED or APPROVED_FOR_SHADOW (DEFERRED allowed with reason). */
export const PHASE14B_REQUIRED_SHADOW_DOMAINS = [
  "CLINICAL_PROFILE",
  "ADMINISTRATION",
  "CONTRAINDICATIONS",
  "EMERGENCY_CONTEXT",
  "THERAPEUTIC_CLASS",
  "ALLERGEN_MAPPING",
  "DUPLICATE_THERAPY",
] as const;

/** Domains that may be DEFERRED without blocking Wave 1 shadow (explicit unsupported). */
export const PHASE14B_DEFERRED_OK_DOMAINS = [
  "ADULT_DOSING",
  "PEDIATRIC_DOSING",
  "RENAL_DOSING",
  "HEPATIC_DOSING",
  "INFUSION",
  "MONITORING",
  "PREGNANCY",
  "LACTATION",
  "MECHANISM",
  "INDICATIONS",
  "PRECAUTIONS",
  "INTERACTIONS",
  "BLACK_BOX_WARNINGS",
  "ADVERSE_REACTIONS",
  "CROSS_REACTIVITY",
  "SAFETY_MONITORING",
] as const;

export const PHASE14B_SHADOW_ELIGIBILITY_VALUES = [
  "NOT_ELIGIBLE",
  "REQUIRES_CHANGES",
  "READY_FOR_REVIEW",
  "APPROVED_FOR_SHADOW",
  "DEFERRED",
  "REJECTED",
] as const;

export type Phase14BShadowEligibility =
  (typeof PHASE14B_SHADOW_ELIGIBILITY_VALUES)[number];

export const PHASE14B_SYNTHETIC_CASE_TYPES = [
  "POSITIVE",
  "NEGATIVE",
  "CONTRAINDICATION",
  "INTERACTION",
  "DUPLICATE_THERAPY",
  "MONITORING",
  "RENAL",
  "PEDIATRIC",
  "PREGNANCY",
  "EMERGENCY_MEDICINE",
] as const;

export function assertPhase14BNoWorkflowControl(enabled: boolean): void {
  if (enabled) {
    throw new Error(
      "Phase 14B forbids Medication Intelligence controlling patient-care workflows."
    );
  }
}

export function assertPhase14BNoClinicalActivation(enabled: boolean): void {
  if (enabled) {
    throw new Error("Phase 14B forbids clinicalActivationEnabled=true.");
  }
}

export function assertPhase14BNoProviderFacingAlerts(enabled: boolean): void {
  if (enabled) throw new Error("Phase 14B forbids provider-facing alerts.");
}

export function assertPhase14BNoOrderBlocking(enabled: boolean): void {
  if (enabled) throw new Error("Phase 14B forbids order blocking.");
}

export function assertPhase14BNoAutomaticApproval(auto: boolean): void {
  if (auto) {
    throw new Error("Phase 14B forbids automatic knowledge approval without review.");
  }
}

export function assertShadowNotProduction(approvedForShadow: boolean): void {
  // Structural reminder — ApprovedForShadow never implies production.
  void approvedForShadow;
  if (PHASE14B_EXPERT_REVIEW_DEFAULTS.approvedForShadowImpliesProduction) {
    throw new Error("Phase 14B forbids ApprovedForShadow implying production.");
  }
}

export function isDomainSatisfiedForShadow(status: string): boolean {
  return (
    status === "REVIEWED" ||
    status === "APPROVED_FOR_SHADOW" ||
    status === "DEFERRED"
  );
}

export function scoreDomainReviewStatus(status: string): number {
  switch (status) {
    case "APPROVED_FOR_SHADOW":
      return 100;
    case "REVIEWED":
      return 90;
    case "READY_FOR_REVIEW":
      return 70;
    case "UNDER_REVIEW":
      return 50;
    case "DEFERRED":
      return 100;
    case "CHANGES_REQUESTED":
      return 20;
    case "DRAFT":
      return 30;
    case "REJECTED":
      return 0;
    case "NOT_STARTED":
    default:
      return 0;
  }
}

export function calculateQualityScores(input: {
  clinicalDomainStatuses: Record<string, string>;
  safetyDomainStatuses: Record<string, string>;
  evidenceCompletenessScore: number;
  consistencyPassed: boolean;
  criticalConflicts: number;
  clinicalReviewComplete: boolean;
  safetyReviewComplete: boolean;
  consistencyReviewComplete: boolean;
}): {
  clinicalScore: number;
  safetyScore: number;
  evidenceScore: number;
  consistencyScore: number;
  reviewScore: number;
  overallScore: number;
} {
  const avg = (statuses: Record<string, string>) => {
    const vals = Object.values(statuses).map(scoreDomainReviewStatus);
    return vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0;
  };
  const clinicalScore = avg(input.clinicalDomainStatuses);
  const safetyScore = avg(input.safetyDomainStatuses);
  const evidenceScore = Math.max(0, Math.min(100, input.evidenceCompletenessScore));
  const consistencyScore = input.consistencyPassed
    ? input.criticalConflicts === 0
      ? 100
      : Math.max(0, 100 - input.criticalConflicts * 25)
    : 0;
  const reviewParts = [
    input.clinicalReviewComplete ? 100 : 0,
    input.safetyReviewComplete ? 100 : 0,
    input.consistencyReviewComplete ? 100 : 0,
  ];
  const reviewScore = Math.round(
    reviewParts.reduce((a, b) => a + b, 0) / reviewParts.length
  );
  const overallScore = Math.round(
    (clinicalScore +
      safetyScore +
      evidenceScore +
      consistencyScore +
      reviewScore) /
      5
  );
  return {
    clinicalScore,
    safetyScore,
    evidenceScore,
    consistencyScore,
    reviewScore,
    overallScore,
  };
}

export function evaluateShadowEligibility(input: {
  identityResolved: boolean;
  evidenceLinks: number;
  knowledgeWithoutProvenance: number;
  requiredDomainsSatisfied: boolean;
  clinicalReviewComplete: boolean;
  safetyReviewComplete: boolean;
  consistencyPassed: boolean;
  criticalConflicts: number;
  isPlaceholder: boolean;
  approvedForShadow: boolean;
}): { status: Phase14BShadowEligibility; reasonCodes: string[] } {
  const reasonCodes: string[] = [];
  if (input.approvedForShadow) {
    return { status: "APPROVED_FOR_SHADOW", reasonCodes: [] };
  }
  if (!input.identityResolved) {
    reasonCodes.push("IDENTITY_UNRESOLVED");
    return { status: "REJECTED", reasonCodes };
  }
  if (input.isPlaceholder) {
    reasonCodes.push("PLACEHOLDER_CONTENT");
    return { status: "REJECTED", reasonCodes };
  }
  if (input.knowledgeWithoutProvenance > 0 || input.evidenceLinks < 1) {
    reasonCodes.push("EVIDENCE_INCOMPLETE");
    return { status: "REQUIRES_CHANGES", reasonCodes };
  }
  if (input.criticalConflicts > 0 || !input.consistencyPassed) {
    reasonCodes.push("CRITICAL_CONFLICTS");
    return { status: "REQUIRES_CHANGES", reasonCodes };
  }
  if (!input.requiredDomainsSatisfied) {
    reasonCodes.push("REQUIRED_DOMAINS_INCOMPLETE");
    return { status: "REQUIRES_CHANGES", reasonCodes };
  }
  if (!input.clinicalReviewComplete || !input.safetyReviewComplete) {
    reasonCodes.push("REVIEW_INCOMPLETE");
    return { status: "READY_FOR_REVIEW", reasonCodes };
  }
  return { status: "READY_FOR_REVIEW", reasonCodes: ["PENDING_APPROVAL_DECISION"] };
}

export function assertRuleBasedShadowApproval(input: {
  evidenceComplete: boolean;
  clinicalReviewComplete: boolean;
  safetyReviewComplete: boolean;
  consistencyPassed: boolean;
  requiredDomainsPresent: boolean;
  noCriticalConflicts: boolean;
  identityCertified: boolean;
  waveAssigned: boolean;
  reviewCompleted: boolean;
  clinicalActivationAllowed: boolean;
}): void {
  if (!input.identityCertified) {
    throw new Error("Shadow approval blocked: identity not certified.");
  }
  if (!input.waveAssigned) {
    throw new Error("Shadow approval blocked: wave not assigned.");
  }
  if (!input.evidenceComplete) {
    throw new Error("Shadow approval blocked: evidence incomplete.");
  }
  if (!input.clinicalReviewComplete) {
    throw new Error("Shadow approval blocked: clinical review incomplete.");
  }
  if (!input.safetyReviewComplete) {
    throw new Error("Shadow approval blocked: safety review incomplete.");
  }
  if (!input.consistencyPassed) {
    throw new Error("Shadow approval blocked: consistency check failed.");
  }
  if (!input.requiredDomainsPresent) {
    throw new Error("Shadow approval blocked: required domains incomplete.");
  }
  if (!input.noCriticalConflicts) {
    throw new Error("Shadow approval blocked: critical conflicts open.");
  }
  if (!input.reviewCompleted) {
    throw new Error("Shadow approval blocked: review incomplete.");
  }
  if (input.clinicalActivationAllowed) {
    throw new Error(
      "Shadow approval blocked: clinicalActivationAllowed must be false."
    );
  }
}

export function buildSyntheticCasePackage(familyKey: string): Array<{
  caseType: (typeof PHASE14B_SYNTHETIC_CASE_TYPES)[number];
  caseKey: string;
  synthetic: true;
}> {
  return PHASE14B_SYNTHETIC_CASE_TYPES.map((caseType) => ({
    caseType,
    caseKey: `P14B_${familyKey}_${caseType}`,
    synthetic: true as const,
  }));
}

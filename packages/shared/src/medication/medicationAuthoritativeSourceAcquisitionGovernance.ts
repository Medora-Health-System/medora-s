/**
 * Phase 15 Part 1 — authoritative source acquisition & Wave 1 remediation foundation.
 *
 * Architectural constants and classifiers only. Part 2 wires DB/API/UI/CLI/certification.
 * Reuses Phase 14A tiers/completeness and Phase 14B gap vocabulary — does not replace them.
 * Knowledge remains advisory; no patient-care workflow control.
 */

import {
  PHASE14A_SOURCE_TIER_VALUES,
  type Phase14ASourceTier,
} from "./medicationEvidenceGovernance.js";
import { PHASE13_SUGGESTED_WAVE1_FAMILY_NAMES } from "./medicationSourceBackedValidationGovernance.js";

export const PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  clinicalActivationEnabled: false,
  activeCdsModeAvailable: false,
  automaticKnowledgeApprovalEnabled: false,
  automaticMedicationIdentityCreationEnabled: false,
  knowledgeControlsPatientCare: false,
  orderingChanged: false,
  dispensingChanged: false,
  administrationChanged: false,
  marChanged: false,
  billingChanged: false,
  medicationReconciliationChanged: false,
  expandBeyondWave1: false,
  resolveAcetaminophenIdentity: false,
  fabricateUnsupportedFacts: false,
  embedCopyrightedSourceContentInRepo: false,
  approvedForShadowImpliesProduction: false,
  completionImpliesCds: false,
  shadowImpliesProduction: false,
} as const;

/** Certification ID (full Phase 15 — Part 2 certifier emits the decision string). */
export const PHASE15_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_15_AUTHORITATIVE_SOURCE_ACQUISITION_TIER1_KNOWLEDGE_COMPLETION_AND_WAVE1_REMEDIATION";

export const PHASE15_CERTIFICATION_DECISION_VALUES = [
  "MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED",
  "MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED_WITH_GOVERNED_DEFERRALS",
  "MEDICATION_INTELLIGENCE_PHASE_15_NOT_CERTIFIED",
] as const;

export type Phase15CertificationDecision =
  (typeof PHASE15_CERTIFICATION_DECISION_VALUES)[number];

/** Preferred when complete; truthful deferral certification is also valid. */
export const PHASE15_EXPECTED_CERTIFICATION_DECISION =
  "MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED_WITH_GOVERNED_DEFERRALS";

export const PHASE15_PART2C_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_15_PART2C_EXECUTION_CERTIFICATION";

export const PHASE15_PART = "PART_1_FOUNDATION" as const;

/** Part 2A implementation marker (full Phase 15 cert remains Part 2C). */
export const PHASE15_PART2A_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_15_PART2A_IMPLEMENTATION";

/** Part 2B operational API/UI/CLI marker — does not certify Phase 15. */
export const PHASE15_PART2B_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_15_PART2B_API_UI_CLI_OPERATIONAL_WORKFLOWS";

export const PHASE15_OPERATIONAL_READINESS_VALUES = [
  "NOT_READY",
  "QUALIFIED_WITH_GAPS",
  "REMEDIATION_IN_PROGRESS",
  "READY_FOR_REQUALIFICATION",
  "BLOCKED",
] as const;

export type Phase15OperationalReadiness =
  (typeof PHASE15_OPERATIONAL_READINESS_VALUES)[number];

export const PHASE15_MUTATION_RESULT_VALUES = [
  "CREATED",
  "UPDATED",
  "NO_CHANGE",
  "ALREADY_COMPLETE",
  "BLOCKED",
  "DEFERRED",
] as const;

export type Phase15MutationResult =
  (typeof PHASE15_MUTATION_RESULT_VALUES)[number];

export function evaluatePhase15OperationalReadiness(input: {
  openWorkItems: number;
  blockedWorkItems: number;
  openTier1Gaps: number;
  resolvedWorkItems: number;
  syntheticQualifiedWithGaps: boolean;
  /** Governed deferrals are not blockers; remaining Tier-1 gaps stay transparent. */
  deferredWorkItems?: number;
}): Phase15OperationalReadiness {
  if (input.blockedWorkItems > 0) return "BLOCKED";
  if (input.openWorkItems > 0) return "REMEDIATION_IN_PROGRESS";
  if (
    input.openTier1Gaps > 0 ||
    input.syntheticQualifiedWithGaps ||
    (input.deferredWorkItems ?? 0) > 0
  ) {
    return "QUALIFIED_WITH_GAPS";
  }
  if (input.resolvedWorkItems > 0) return "READY_FOR_REQUALIFICATION";
  return "NOT_READY";
}

/** Program keys reserved for Part 2 persistence — do not invent parallel programs. */
export const PHASE15_PROGRAM_KEY = "EM_WAVE1_AUTHORITATIVE_SOURCE_REMEDIATION_V1";
export const PHASE15_PROGRAM_VERSION = "1.0.0";
export const PHASE15_WAVE_FAMILY_NAMES = PHASE13_SUGGESTED_WAVE1_FAMILY_NAMES;

export const PHASE15_PROGRAM_STATUS_VALUES = [
  "PLANNED",
  "SEEDING",
  "IN_REMEDIATION",
  "QUALITY_RECALC",
  "COMPLETED",
  "BLOCKED",
] as const;

export type Phase15ProgramStatus =
  (typeof PHASE15_PROGRAM_STATUS_VALUES)[number];

export const PHASE15_WORK_ITEM_STATUS_VALUES = [
  "OPEN",
  "TRIAGED",
  "ROUTED",
  "IN_REMEDIATION",
  "BLOCKED_PENDING_AUTHORITATIVE_SOURCE",
  "AWAITING_QUALITY_RECALC",
  "RESOLVED",
  "DEFERRED",
  "CANCELLED",
] as const;

export type Phase15WorkItemStatus =
  (typeof PHASE15_WORK_ITEM_STATUS_VALUES)[number];

/** Enterprise lifecycle aliases → persisted acquisitionStatus values. */
export const PHASE15_LIFECYCLE_ALIAS_MAP = {
  registered: "REGISTERED",
  verified: "UNDER_REVIEW",
  authoritative: "AUTHORITATIVE_SOURCE_CONFIRMED",
  deprecated: "RETIRED",
  superseded: "SUPERSEDED",
} as const;

export type Phase15LifecycleAlias =
  keyof typeof PHASE15_LIFECYCLE_ALIAS_MAP;

/** Re-export Tier vocabulary — Phase 15 does not redefine tiers. */
export const PHASE15_SOURCE_TIER_VALUES = PHASE14A_SOURCE_TIER_VALUES;
export type Phase15SourceTier = Phase14ASourceTier;

/** Source categories the Part 2 lifecycle must govern (metadata only; no content embed). */
export const PHASE15_SOURCE_CATEGORY_VALUES = [
  "REGULATORY_LABELING",
  "GOVERNMENT_MONOGRAPH",
  "PROFESSIONAL_GUIDELINE",
  "LICENSED_COMPENDIUM",
  "INSTITUTIONAL_POLICY",
  "MANUFACTURER_LABEL",
  "EXPERT_CONSENSUS",
] as const;

export type Phase15SourceCategory =
  (typeof PHASE15_SOURCE_CATEGORY_VALUES)[number];

export const PHASE15_SOURCE_LIFECYCLE_STATUS_VALUES = [
  "PLANNED",
  "REGISTERED",
  "LICENSE_REVIEW",
  "RETRIEVED_METADATA",
  "NORMALIZED",
  "UNDER_REVIEW",
  "AUTHORITATIVE_SOURCE_CONFIRMED",
  "ACCEPTED_FOR_KNOWLEDGE_USE",
  "REJECTED",
  "SUPERSEDED",
  "RETIRED",
] as const;

export type Phase15SourceLifecycleStatus =
  (typeof PHASE15_SOURCE_LIFECYCLE_STATUS_VALUES)[number];

export function resolveLifecycleStatusFromAlias(
  alias: string
): Phase15SourceLifecycleStatus | null {
  const key = alias.trim().toLowerCase() as Phase15LifecycleAlias;
  if (key in PHASE15_LIFECYCLE_ALIAS_MAP) {
    return PHASE15_LIFECYCLE_ALIAS_MAP[key];
  }
  const upper = alias.trim().toUpperCase();
  if (
    (PHASE15_SOURCE_LIFECYCLE_STATUS_VALUES as readonly string[]).includes(upper)
  ) {
    return upper as Phase15SourceLifecycleStatus;
  }
  return null;
}

/** Domains may advance only when an authoritative/accepted registration is linked. */
export function assertDomainHasAuthoritativeProvenance(input: {
  hasAuthoritativeSourceLink: boolean;
  domainStatus: string;
}): void {
  if (
    !input.hasAuthoritativeSourceLink &&
    input.domainStatus !== "DEFERRED" &&
    input.domainStatus !== "DEFERRED_WITH_REASON" &&
    input.domainStatus !== "NOT_APPLICABLE"
  ) {
    throw new Error(
      "Phase 15: knowledge domains without authoritative provenance must remain DEFERRED."
    );
  }
}

/**
 * Domain review extension for Part 2 — use only when Tier-1/licensed evidence
 * is confirmed for that domain. Prefer existing DRAFT…APPROVED_FOR_SHADOW /
 * DEFERRED when they already express the state.
 */
export const PHASE15_DOMAIN_REVIEW_EXTENSION_VALUES = [
  "AUTHORITATIVE_SOURCE_CONFIRMED",
] as const;

export type Phase15DomainReviewExtension =
  (typeof PHASE15_DOMAIN_REVIEW_EXTENSION_VALUES)[number];

/** Remediatable gap categories (root-cause classification before remediation). */
export const PHASE15_REMEDIATION_GAP_CATEGORY_VALUES = [
  "KNOWLEDGE",
  "EVIDENCE",
  "REVIEW",
  "REFERENCE_CASE",
  "PROVENANCE",
  "IDENTITY",
  "ENGINE",
  "QUALITY",
] as const;

export type Phase15RemediationGapCategory =
  (typeof PHASE15_REMEDIATION_GAP_CATEGORY_VALUES)[number];

/** Maps Phase 14B shadow gapType → Part 15 remediation category. */
export function classifyPhase14BGapForRemediation(
  gapType: string
): Phase15RemediationGapCategory {
  const normalized = gapType.trim().toUpperCase();
  if (normalized === "REFERENCE" || normalized === "REFERENCE_GAP") {
    return "REFERENCE_CASE";
  }
  if (normalized === "QUALITY" || normalized === "QUALITY_GAP") {
    return "QUALITY";
  }
  if (
    (PHASE15_REMEDIATION_GAP_CATEGORY_VALUES as readonly string[]).includes(
      normalized
    )
  ) {
    return normalized as Phase15RemediationGapCategory;
  }
  return "KNOWLEDGE";
}

/** Allowed work-item transitions (fail closed). */
export function canTransitionRemediationWorkItem(
  from: Phase15WorkItemStatus,
  to: Phase15WorkItemStatus
): boolean {
  const edges: Record<Phase15WorkItemStatus, Phase15WorkItemStatus[]> = {
    OPEN: ["TRIAGED", "ROUTED", "DEFERRED", "CANCELLED"],
    TRIAGED: ["ROUTED", "BLOCKED_PENDING_AUTHORITATIVE_SOURCE", "DEFERRED", "CANCELLED"],
    ROUTED: [
      "IN_REMEDIATION",
      "BLOCKED_PENDING_AUTHORITATIVE_SOURCE",
      "DEFERRED",
      "CANCELLED",
    ],
    IN_REMEDIATION: [
      "AWAITING_QUALITY_RECALC",
      "BLOCKED_PENDING_AUTHORITATIVE_SOURCE",
      "RESOLVED",
      "DEFERRED",
      "CANCELLED",
    ],
    BLOCKED_PENDING_AUTHORITATIVE_SOURCE: [
      "ROUTED",
      "IN_REMEDIATION",
      "DEFERRED",
      "CANCELLED",
    ],
    AWAITING_QUALITY_RECALC: ["RESOLVED", "IN_REMEDIATION", "DEFERRED"],
    RESOLVED: [],
    DEFERRED: ["OPEN", "TRIAGED"],
    CANCELLED: [],
  };
  return edges[from]?.includes(to) ?? false;
}

/**
 * Positive Tier-1 synthetic gaps from Phase 14B are evidence/knowledge gaps —
 * never fabricate clinical expected findings to close them.
 */
export function isTier1PositiveKnowledgeGap(gapKey: string): boolean {
  return /POSITIVE_TIER1/i.test(gapKey);
}

export function requiresAuthoritativeSourceBeforeRemediation(input: {
  gapCategory: Phase15RemediationGapCategory;
  gapKey: string;
}): boolean {
  if (isTier1PositiveKnowledgeGap(input.gapKey)) return true;
  return (
    input.gapCategory === "KNOWLEDGE" ||
    input.gapCategory === "EVIDENCE" ||
    input.gapCategory === "PROVENANCE"
  );
}

/** Target readiness after Part 2 remediation (execution-based, not merely APPROVED_FOR_SHADOW). */
export const PHASE15_FAMILY_READINESS_TARGET_VALUES = [
  "QUALIFIED_WITH_GAPS",
  "QUALIFIED_WITH_COMPLETE_AUTHORITATIVE_KNOWLEDGE",
  "REQUIRES_REMEDIATION",
  "DEFERRED",
  "IDENTITY_BLOCKED",
] as const;

export type Phase15FamilyReadinessTarget =
  (typeof PHASE15_FAMILY_READINESS_TARGET_VALUES)[number];

export function assertPhase15NoWorkflowControl(enabled: boolean): void {
  if (enabled) {
    throw new Error(
      "Phase 15 forbids Medication Intelligence controlling patient-care workflows."
    );
  }
}

export function assertPhase15NoClinicalActivation(enabled: boolean): void {
  if (enabled) {
    throw new Error("Phase 15 forbids clinicalActivationEnabled=true.");
  }
}

export function assertPhase15NoProviderFacingAlerts(enabled: boolean): void {
  if (enabled) throw new Error("Phase 15 forbids provider-facing alerts.");
}

export function assertPhase15NoOrderBlocking(enabled: boolean): void {
  if (enabled) throw new Error("Phase 15 forbids order blocking.");
}

export function assertPhase15Wave1Only(expandBeyondWave1: boolean): void {
  if (expandBeyondWave1) {
    throw new Error(
      "Phase 15 forbids expanding Medication Intelligence beyond Wave 1 families."
    );
  }
}

export function assertPhase15NoAcetaminophenResolution(resolve: boolean): void {
  if (resolve) {
    throw new Error(
      "Phase 15 forbids resolving acetaminophen identity; it remains IDENTITY_BLOCKED."
    );
  }
}

export function assertPhase15NoFabricatedFacts(fabricate: boolean): void {
  if (fabricate) {
    throw new Error(
      "Phase 15 forbids fabricating unsupported clinical facts for completeness metrics."
    );
  }
}

export function assertPhase15NoCopyrightEmbed(embed: boolean): void {
  if (embed) {
    throw new Error(
      "Phase 15 forbids embedding copyrighted authoritative source content in the repository."
    );
  }
}

export function isTier1OrLicensedSource(tier: Phase15SourceTier): boolean {
  return (
    tier === "TIER_1_REGULATORY" ||
    tier === "TIER_2_GOVERNMENT" ||
    tier === "TIER_3_PROFESSIONAL_GUIDELINE" ||
    tier === "TIER_4_LICENSED_COMPENDIUM"
  );
}

/** Lower tiers must not alone promote unsupported content to authoritative completion. */
export function canPromoteToAuthoritativeSourceConfirmed(input: {
  sourceTier: Phase15SourceTier;
  licensingStatus: "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN";
  reviewStatus: "APPROVED" | "PENDING" | "REJECTED";
  lifecycleStatus: Phase15SourceLifecycleStatus;
}): boolean {
  if (input.reviewStatus !== "APPROVED") return false;
  if (input.licensingStatus === "UNKNOWN" || input.licensingStatus === "RESTRICTED") {
    return false;
  }
  if (!isTier1OrLicensedSource(input.sourceTier)) return false;
  return (
    input.lifecycleStatus === "AUTHORITATIVE_SOURCE_CONFIRMED" ||
    input.lifecycleStatus === "ACCEPTED_FOR_KNOWLEDGE_USE" ||
    input.lifecycleStatus === "UNDER_REVIEW" ||
    input.lifecycleStatus === "NORMALIZED"
  );
}

export function evaluateWave1RemediationReadinessTarget(input: {
  approvedForShadow: boolean;
  syntheticQualifiedWithGaps: boolean;
  openTier1KnowledgeGaps: number;
  criticalMisses: number;
  identityBlocked: boolean;
}): Phase15FamilyReadinessTarget {
  if (input.identityBlocked) return "IDENTITY_BLOCKED";
  if (input.criticalMisses > 0) return "REQUIRES_REMEDIATION";
  if (!input.approvedForShadow) return "REQUIRES_REMEDIATION";
  if (input.openTier1KnowledgeGaps > 0 || input.syntheticQualifiedWithGaps) {
    return "QUALIFIED_WITH_GAPS";
  }
  return "QUALIFIED_WITH_COMPLETE_AUTHORITATIVE_KNOWLEDGE";
}

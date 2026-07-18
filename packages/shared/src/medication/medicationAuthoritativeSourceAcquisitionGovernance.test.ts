import { describe, expect, it } from "vitest";
import {
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  PHASE15_CERTIFICATION_ID,
  PHASE15_EXPECTED_CERTIFICATION_DECISION,
  PHASE15_PART2A_IMPLEMENTATION_ID,
  PHASE15_PART2B_IMPLEMENTATION_ID,
  evaluatePhase15OperationalReadiness,
  PHASE15_WAVE_FAMILY_NAMES,
  assertDomainHasAuthoritativeProvenance,
  assertPhase15NoAcetaminophenResolution,
  assertPhase15NoFabricatedFacts,
  assertPhase15NoWorkflowControl,
  assertPhase15Wave1Only,
  canPromoteToAuthoritativeSourceConfirmed,
  canTransitionRemediationWorkItem,
  classifyPhase14BGapForRemediation,
  evaluateWave1RemediationReadinessTarget,
  isTier1PositiveKnowledgeGap,
  requiresAuthoritativeSourceBeforeRemediation,
  resolveLifecycleStatusFromAlias,
} from "./medicationAuthoritativeSourceAcquisitionGovernance.js";

describe("medicationAuthoritativeSourceAcquisitionGovernance", () => {
  it("keeps MI advisory and Wave 1–only", () => {
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.knowledgeControlsPatientCare).toBe(
      false
    );
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.expandBeyondWave1).toBe(false);
    expect(PHASE15_WAVE_FAMILY_NAMES).toHaveLength(8);
    expect(PHASE15_WAVE_FAMILY_NAMES).not.toContain("acetaminophen");
    expect(() => assertPhase15NoWorkflowControl(true)).toThrow();
    expect(() => assertPhase15Wave1Only(true)).toThrow();
    expect(() => assertPhase15NoAcetaminophenResolution(true)).toThrow();
    expect(() => assertPhase15NoFabricatedFacts(true)).toThrow();
  });

  it("classifies Phase 14B Tier-1 positive gaps as requiring authoritative sources", () => {
    expect(classifyPhase14BGapForRemediation("KNOWLEDGE")).toBe("KNOWLEDGE");
    expect(classifyPhase14BGapForRemediation("QUALITY_GAP")).toBe("QUALITY");
    expect(
      isTier1PositiveKnowledgeGap("KNOWLEDGE_GAP:EM_FAM_IBUPROFEN:POSITIVE_TIER1")
    ).toBe(true);
    expect(
      requiresAuthoritativeSourceBeforeRemediation({
        gapCategory: "KNOWLEDGE",
        gapKey: "KNOWLEDGE_GAP:EM_FAM_IBUPROFEN:POSITIVE_TIER1",
      })
    ).toBe(true);
    expect(resolveLifecycleStatusFromAlias("authoritative")).toBe(
      "AUTHORITATIVE_SOURCE_CONFIRMED"
    );
    expect(canTransitionRemediationWorkItem("OPEN", "TRIAGED")).toBe(true);
    expect(canTransitionRemediationWorkItem("RESOLVED", "OPEN")).toBe(false);
    expect(() =>
      assertDomainHasAuthoritativeProvenance({
        hasAuthoritativeSourceLink: false,
        domainStatus: "UNDER_REVIEW",
      })
    ).toThrow();
    expect(PHASE15_PART2A_IMPLEMENTATION_ID).toContain("PART2A");
    expect(PHASE15_PART2B_IMPLEMENTATION_ID).toContain("PART2B");
    expect(
      evaluatePhase15OperationalReadiness({
        openWorkItems: 1,
        blockedWorkItems: 0,
        openTier1Gaps: 1,
        resolvedWorkItems: 0,
        syntheticQualifiedWithGaps: true,
      })
    ).toBe("REMEDIATION_IN_PROGRESS");
  });

  it("blocks lower-tier promotion to AUTHORITATIVE_SOURCE_CONFIRMED", () => {
    expect(
      canPromoteToAuthoritativeSourceConfirmed({
        sourceTier: "TIER_5_INSTITUTIONAL_POLICY",
        licensingStatus: "LICENSED",
        reviewStatus: "APPROVED",
        lifecycleStatus: "UNDER_REVIEW",
      })
    ).toBe(false);
    expect(
      canPromoteToAuthoritativeSourceConfirmed({
        sourceTier: "TIER_1_REGULATORY",
        licensingStatus: "PUBLIC_DOMAIN",
        reviewStatus: "APPROVED",
        lifecycleStatus: "NORMALIZED",
      })
    ).toBe(true);
  });

  it("targets complete authoritative knowledge only when Tier-1 gaps are closed", () => {
    expect(
      evaluateWave1RemediationReadinessTarget({
        approvedForShadow: true,
        syntheticQualifiedWithGaps: true,
        openTier1KnowledgeGaps: 8,
        criticalMisses: 0,
        identityBlocked: false,
      })
    ).toBe("QUALIFIED_WITH_GAPS");
    expect(
      evaluateWave1RemediationReadinessTarget({
        approvedForShadow: true,
        syntheticQualifiedWithGaps: false,
        openTier1KnowledgeGaps: 0,
        criticalMisses: 0,
        identityBlocked: false,
      })
    ).toBe("QUALIFIED_WITH_COMPLETE_AUTHORITATIVE_KNOWLEDGE");
    expect(PHASE15_CERTIFICATION_ID).toContain("PHASE_15");
    expect(PHASE15_EXPECTED_CERTIFICATION_DECISION).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED_WITH_GOVERNED_DEFERRALS"
    );
  });
});

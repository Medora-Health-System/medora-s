import { describe, expect, it } from "vitest";
import {
  PHASE16_CERTIFICATION_ID,
  PHASE16_EXPECTED_CERTIFICATION_DECISION,
  PHASE16_RECOMMENDATION_DEFAULTS,
  PHASE16_WAVE_FAMILY_NAMES,
  assertPhase16NoEnterpriseActive,
  assertPhase16NoOrderFromRecommendation,
  assertPhase16SafetyDefaults,
  calculateRecommendationConfidence,
  canTransitionRecommendationLifecycle,
  isPhase16LifecycleTransitionAllowed,
  isRecommendationExposableToProviders,
  isWave1RecommendationFamily,
} from "./medicationRecommendationEngineGovernance.js";

describe("medicationRecommendationEngineGovernance", () => {
  it("keeps constitutional defaults shadow-only", () => {
    expect(PHASE16_RECOMMENDATION_DEFAULTS.shadowRecommendationAllowed).toBe(
      true
    );
    expect(PHASE16_RECOMMENDATION_DEFAULTS.controlledPilotAllowed).toBe(false);
    expect(PHASE16_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed).toBe(false);
    expect(PHASE16_RECOMMENDATION_DEFAULTS.orderFromRecommendationAllowed).toBe(
      false
    );
    expect(PHASE16_RECOMMENDATION_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(() => assertPhase16SafetyDefaults()).not.toThrow();
  });

  it("allows Draft→Shadow path and blocks Pilot/Active in Phase 16", () => {
    expect(canTransitionRecommendationLifecycle("DRAFT", "EVIDENCE_COMPLETE")).toBe(
      true
    );
    expect(
      canTransitionRecommendationLifecycle("APPROVED", "SHADOW_RECOMMENDATION")
    ).toBe(true);
    expect(
      canTransitionRecommendationLifecycle(
        "SHADOW_RECOMMENDATION",
        "CONTROLLED_PILOT"
      )
    ).toBe(true);
    expect(
      isPhase16LifecycleTransitionAllowed(
        "SHADOW_RECOMMENDATION",
        "CONTROLLED_PILOT"
      )
    ).toBe(false);
    expect(
      isPhase16LifecycleTransitionAllowed("APPROVED", "SHADOW_RECOMMENDATION")
    ).toBe(true);
    expect(() => assertPhase16NoEnterpriseActive(true)).toThrow(/ENTERPRISE/i);
    expect(() => assertPhase16NoOrderFromRecommendation(true)).toThrow(
      /ordering/i
    );
  });

  it("exposes only SHADOW_RECOMMENDATION to providers", () => {
    expect(isRecommendationExposableToProviders("SHADOW_RECOMMENDATION")).toBe(
      true
    );
    expect(isRecommendationExposableToProviders("APPROVED")).toBe(false);
    expect(isRecommendationExposableToProviders("ENTERPRISE_ACTIVE")).toBe(
      false
    );
  });

  it("scopes Wave 1 and excludes acetaminophen", () => {
    expect(PHASE16_WAVE_FAMILY_NAMES).toHaveLength(8);
    expect(isWave1RecommendationFamily("ibuprofen")).toBe(true);
    expect(isWave1RecommendationFamily("EM_FAM_ONDANSETRON")).toBe(true);
    expect(isWave1RecommendationFamily("acetaminophen")).toBe(false);
  });

  it("does not inflate confidence from empty provenance", () => {
    const empty = calculateRecommendationConfidence({
      hasAuthoritativeSource: false,
      hasEvidenceLink: false,
      evidenceCompletenessPercent: 0,
      approvedByReviewer: false,
      missingReferenceCount: 0,
      unresolvedConflict: false,
      validationStatus: "UNVALIDATED",
    });
    expect(empty.confidenceScore).toBe(0);

    const strong = calculateRecommendationConfidence({
      hasAuthoritativeSource: true,
      hasEvidenceLink: true,
      evidenceCompletenessPercent: 80,
      approvedByReviewer: true,
      missingReferenceCount: 0,
      unresolvedConflict: false,
      validationStatus: "VALIDATED",
    });
    expect(strong.confidenceScore).toBeGreaterThan(70);

    const conflict = calculateRecommendationConfidence({
      hasAuthoritativeSource: true,
      hasEvidenceLink: true,
      evidenceCompletenessPercent: 100,
      approvedByReviewer: true,
      missingReferenceCount: 0,
      unresolvedConflict: true,
      validationStatus: "VALIDATED",
    });
    expect(conflict.confidenceScore).toBe(0);
  });

  it("uses shadow-only expected certification decision", () => {
    expect(PHASE16_CERTIFICATION_ID).toContain("PHASE_16");
    expect(PHASE16_EXPECTED_CERTIFICATION_DECISION).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED_SHADOW_ONLY"
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  PHASE16_CERTIFICATION_ID,
  PHASE16_EXPECTED_CERTIFICATION_DECISION,
  PHASE16_RECOMMENDATION_DEFAULTS,
  PHASE16_WAVE_FAMILY_NAMES,
  PHASE17_CERTIFICATION_ID,
  PHASE17_QUALIFICATION_THRESHOLDS,
  PHASE17_RECOMMENDATION_DEFAULTS,
  PHASE18_CERTIFICATION_ID,
  PHASE18_RECOMMENDATION_DEFAULTS,
  assertEnterpriseActivationBlocked,
  assertGovernanceAlertsOnly,
  assertNoCopyrightedSourceContent,
  assertPhase16SafetyDefaults,
  assertPhase18SafetyDefaults,
  assertPilotTimeWindowValid,
  assertRecommendationImmutable,
  assertReplayDoesNotMutateCare,
  buildRecommendationReplayFingerprint,
  calculateOperationalQualityScores,
  calculatePilotQualification,
  calculateRecommendationConfidence,
  canTransitionPilotAuthorization,
  canTransitionVersionGovernanceState,
  isPhase16LifecycleTransitionAllowed,
  isPhase17LifecycleTransitionAllowed,
  isRecommendationExposableToProviders,
  isWave1RecommendationFamily,
} from "./medicationRecommendationEngineGovernance.js";

describe("medicationRecommendationEngineGovernance (Phase 16)", () => {
  it("keeps constitutional defaults shadow-only", () => {
    expect(PHASE16_RECOMMENDATION_DEFAULTS.shadowRecommendationAllowed).toBe(
      true
    );
    expect(PHASE16_RECOMMENDATION_DEFAULTS.controlledPilotAllowed).toBe(false);
    expect(() => assertPhase16SafetyDefaults()).not.toThrow();
    expect(PHASE16_CERTIFICATION_ID).toContain("PHASE_16");
    expect(PHASE16_EXPECTED_CERTIFICATION_DECISION).toContain("SHADOW_ONLY");
  });

  it("blocks Pilot/Active in Phase 16 lifecycle helper", () => {
    expect(
      isPhase16LifecycleTransitionAllowed(
        "SHADOW_RECOMMENDATION",
        "CONTROLLED_PILOT"
      )
    ).toBe(false);
    expect(isRecommendationExposableToProviders("SHADOW_RECOMMENDATION")).toBe(
      true
    );
  });

  it("scopes Wave 1 and confidence without empty inflation", () => {
    expect(PHASE16_WAVE_FAMILY_NAMES).toHaveLength(8);
    expect(isWave1RecommendationFamily("acetaminophen")).toBe(false);
    expect(
      calculateRecommendationConfidence({
        hasAuthoritativeSource: false,
        hasEvidenceLink: false,
        evidenceCompletenessPercent: 0,
        approvedByReviewer: false,
        missingReferenceCount: 0,
        unresolvedConflict: false,
        validationStatus: "UNVALIDATED",
      }).confidenceScore
    ).toBe(0);
  });
});

describe("Phase 17 controlled pilot governance", () => {
  it("keeps fail-closed defaults", () => {
    expect(PHASE17_RECOMMENDATION_DEFAULTS.controlledPilotAllowed).toBe(false);
    expect(PHASE17_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed).toBe(false);
    expect(PHASE17_RECOMMENDATION_DEFAULTS.orderFromRecommendationEnabled).toBe(
      false
    );
    expect(PHASE17_CERTIFICATION_ID).toContain("PHASE_17");
  });

  it("allows pilot status transitions and blocks enterprise lifecycle", () => {
    expect(canTransitionPilotAuthorization("DRAFT", "SHADOW_EVIDENCE_REVIEW")).toBe(
      true
    );
    expect(canTransitionPilotAuthorization("ACTIVE", "SUSPENDED")).toBe(true);
    expect(canTransitionPilotAuthorization("SUSPENDED", "ACTIVE")).toBe(false);
    expect(
      isPhase17LifecycleTransitionAllowed("SHADOW_RECOMMENDATION", "CONTROLLED_PILOT", {
        explicitPilotAuthorization: true,
      })
    ).toBe(true);
    expect(
      isPhase17LifecycleTransitionAllowed("SHADOW_RECOMMENDATION", "CONTROLLED_PILOT", {
        explicitPilotAuthorization: false,
      })
    ).toBe(false);
    expect(
      isPhase17LifecycleTransitionAllowed("CONTROLLED_PILOT", "ENTERPRISE_ACTIVE", {
        explicitPilotAuthorization: true,
      })
    ).toBe(false);
    expect(() => assertEnterpriseActivationBlocked(true)).toThrow(/ENTERPRISE/i);
  });

  it("qualifies shadow definitions with conservative thresholds", () => {
    const ok = calculatePilotQualification({
      lifecycleStatus: "SHADOW_RECOMMENDATION",
      familyKey: "EM_FAM_IBUPROFEN",
      hasProvenance: true,
      expertApproved: true,
      unresolvedConflictCount: 0,
      shadowEvaluationCount: 1,
      confidenceScore: 52,
      evidenceCompleteness: 40,
      constitutionalViolationCount: 0,
      orderMutationCount: 0,
      marMutationCount: 0,
      chartMutationCount: 0,
      evidenceStale: false,
    });
    expect(ok.decision).toMatch(/PILOT_ELIGIBLE/);
    expect(PHASE17_QUALIFICATION_THRESHOLDS.minConfidenceScore).toBe(40);

    const blocked = calculatePilotQualification({
      lifecycleStatus: "DRAFT",
      familyKey: "acetaminophen",
      hasProvenance: false,
      expertApproved: false,
      unresolvedConflictCount: 1,
      shadowEvaluationCount: 0,
      confidenceScore: 0,
      evidenceCompleteness: 0,
      constitutionalViolationCount: 0,
      orderMutationCount: 1,
      marMutationCount: 0,
      chartMutationCount: 0,
      evidenceStale: true,
    });
    expect(blocked.decision).toBe("NOT_ELIGIBLE");
  });

  it("validates pilot time windows", () => {
    const now = new Date("2026-07-18T12:00:00Z");
    expect(() =>
      assertPilotTimeWindowValid({
        startAt: "2026-07-01T00:00:00Z",
        endAt: "2026-08-01T00:00:00Z",
        now,
      })
    ).not.toThrow();
    expect(() =>
      assertPilotTimeWindowValid({
        startAt: "2026-08-01T00:00:00Z",
        endAt: "2026-09-01T00:00:00Z",
        now,
      })
    ).toThrow(/outside/i);
  });
});

describe("Phase 18 operational governance", () => {
  it("keeps fail-closed defaults and no autonomy increase", () => {
    expect(PHASE18_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed).toBe(false);
    expect(PHASE18_RECOMMENDATION_DEFAULTS.productionCdsEnabled).toBe(false);
    expect(PHASE18_RECOMMENDATION_DEFAULTS.orderFromRecommendationEnabled).toBe(
      false
    );
    expect(PHASE18_RECOMMENDATION_DEFAULTS.claimRegulatoryApproval).toBe(false);
    expect(PHASE18_CERTIFICATION_ID).toContain("PHASE_18");
    expect(() => assertPhase18SafetyDefaults()).not.toThrow();
  });

  it("builds deterministic replay fingerprints and blocks care mutation", () => {
    const a = buildRecommendationReplayFingerprint({
      definitionId: "d1",
      recommendationVersion: "1.0.0",
      knowledgeVersion: "SHADOW_V1",
      title: "Ibuprofen",
      reasonSummary: "First-line",
      recommendationKind: "FIRST_LINE",
      familyKey: "ibuprofen",
      confidenceScore: 52,
      evidenceLevel: "B",
      lifecycleStatus: "SHADOW_RECOMMENDATION",
    });
    const b = buildRecommendationReplayFingerprint({
      definitionId: "d1",
      recommendationVersion: "1.0.0",
      knowledgeVersion: "SHADOW_V1",
      title: "Ibuprofen",
      reasonSummary: "First-line",
      recommendationKind: "FIRST_LINE",
      familyKey: "ibuprofen",
      confidenceScore: 52,
      evidenceLevel: "B",
      lifecycleStatus: "SHADOW_RECOMMENDATION",
    });
    expect(a).toBe(b);
    expect(() => assertReplayDoesNotMutateCare(true)).toThrow(/read-only/i);
    expect(() =>
      assertRecommendationImmutable({
        immutableAt: new Date(),
        attemptingMutation: true,
      })
    ).toThrow(/immutable/i);
    expect(() =>
      assertNoCopyrightedSourceContent({ containsCopyrightedExcerpt: true })
    ).toThrow(/copyrighted/i);
    expect(() => assertGovernanceAlertsOnly(true)).toThrow(/interrupt/i);
  });

  it("supports version governance transitions and quality scores", () => {
    expect(canTransitionVersionGovernanceState("CURRENT", "SUPERSEDED")).toBe(
      true
    );
    expect(canTransitionVersionGovernanceState("ARCHIVED", "CURRENT")).toBe(
      false
    );
    const q = calculateOperationalQualityScores({
      coveragePercent: 80,
      evidenceCompletenessAvg: 70,
      reviewCompletenessPercent: 90,
      confidenceCalibrationPercent: 60,
      governanceCompletenessPercent: 85,
      auditCompletenessPercent: 95,
      traceabilityPercent: 88,
      explainabilityPercent: 92,
      reproducibilityPercent: 100,
    });
    expect(q.qualityScore).toBeGreaterThan(70);
    expect(q.reproducibilityScore).toBe(100);
  });
});

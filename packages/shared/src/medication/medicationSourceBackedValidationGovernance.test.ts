import { describe, expect, it } from "vitest";
import {
  PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS,
  PHASE13_SUGGESTED_WAVE1_FAMILY_NAMES,
  assertIdentityBlockerNotApproved,
  assertPhase13NoAutomaticApproval,
  assertPhase13ReadinessCeiling,
  assertShadowApprovalGates,
  assessPhase13Readiness,
  isPhase13PlaceholderContent,
  selectWave1Families,
} from "./medicationSourceBackedValidationGovernance.js";

describe("medicationSourceBackedValidationGovernance", () => {
  it("keeps activation/alerts/auto-approve off", () => {
    expect(PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(
      PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.automaticKnowledgeApprovalEnabled
    ).toBe(false);
    expect(
      PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.providerFacingAlertsEnabled
    ).toBe(false);
    expect(() => assertPhase13NoAutomaticApproval(true)).toThrow();
    expect(() => assertPhase13ReadinessCeiling("READY_FOR_ACTIVATION")).toThrow();
  });

  it("selects Wave 1 only from resolved non-blocked families", () => {
    const selected = selectWave1Families({
      resolvedFamilyNames: ["ibuprofen", "ondansetron", "famotidine", "vancomycin"],
      blockedFamilyNames: ["acetaminophen"],
    });
    expect(selected).toEqual(["ibuprofen", "ondansetron", "famotidine"]);
    expect(selected).not.toContain("acetaminophen");
    expect(PHASE13_SUGGESTED_WAVE1_FAMILY_NAMES).toContain("ibuprofen");
  });

  it("blocks placeholder and identity-blocked approvals", () => {
    expect(isPhase13PlaceholderContent("PHASE12_CLINICAL_FRAMEWORK_V1")).toBe(
      true
    );
    expect(() =>
      assertIdentityBlockerNotApproved({
        resolutionStatus: "IDENTITY_REVIEW_REQUIRED",
        approved: true,
      })
    ).toThrow();
    expect(() =>
      assertShadowApprovalGates({
        identityResolved: true,
        structuredContentComplete: true,
        validSourceVersion: true,
        isPlaceholder: true,
        clinicalReviewComplete: true,
        pharmacistReviewComplete: true,
        medicalReviewRequired: false,
        medicalReviewComplete: false,
        clinicalActivationAllowed: false,
        conflictsBlocking: false,
      })
    ).toThrow(/placeholder/i);
  });

  it("assesses readiness without live-alert results", () => {
    const r = assessPhase13Readiness({
      criticalMisses: 0,
      unresolvedIdentityBlockersInWave: 0,
      shadowEvaluableFamilies: 0,
      approvedForShadowRecords: 0,
      openBlockingGaps: 0,
    });
    expect(r.result).toBe("NOT_READY");
  });
});

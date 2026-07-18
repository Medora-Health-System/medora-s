import {
  PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS,
  assertIdentityBlockerNotApproved,
  assertPhase13NoAutomaticApproval,
  isPhase13PlaceholderContent,
  selectWave1Families,
} from "@medora/shared";

describe("medicationSourceBackedValidation", () => {
  it("medicationIdentityResolution: keeps acetaminophen blocked from auto-resolve", () => {
    expect(
      PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.automaticMedicationIdentityCreationEnabled
    ).toBe(false);
    expect(() =>
      assertIdentityBlockerNotApproved({
        resolutionStatus: "IDENTITY_REVIEW_REQUIRED",
        approved: true,
      })
    ).toThrow();
  });

  it("medicationApprovalWave: selects only resolved non-blocked families", () => {
    const selected = selectWave1Families({
      resolvedFamilyNames: [
        "ibuprofen",
        "ondansetron",
        "famotidine",
        "pantoprazole",
        "dexamethasone",
        "prednisone",
        "cetirizine",
        "ipratropium",
      ],
      blockedFamilyNames: ["acetaminophen"],
    });
    expect(selected).toHaveLength(8);
    expect(selected).not.toContain("acetaminophen");
  });

  it("medicationKnowledgeApproval: rejects placeholders and auto-approve", () => {
    expect(isPhase13PlaceholderContent("PHASE12_CLINICAL_FRAMEWORK_V1")).toBe(
      true
    );
    expect(() => assertPhase13NoAutomaticApproval(true)).toThrow();
    expect(
      PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.clinicalActivationEnabled
    ).toBe(false);
    expect(
      PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.draftKnowledgeConsumedByShadowEngine
    ).toBe(false);
  });

  it("medicationShadowReferenceSet / medicationShadowValidationRun: safety defaults", () => {
    expect(
      PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.providerFacingAlertsEnabled
    ).toBe(false);
    expect(PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.orderBlockingEnabled).toBe(
      false
    );
    expect(
      PHASE13_SOURCE_BACKED_VALIDATION_DEFAULTS.readyForActivationAllowed
    ).toBe(false);
  });
});

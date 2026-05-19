import { evaluateActivationReadiness } from "./medication-product-activation-readiness.util";

describe("evaluateActivationReadiness", () => {
  const baseInput = {
    facilityId: "fac-1",
    productCode: "PROD-1",
    governanceStatus: "READY_FOR_ACTIVATION",
    concept: { safetyProfile: { isHighAlert: false } },
    product: {
      administrationType: "PUSH",
      administrationProfile: { requiresInfusionSession: false },
      infusionProfile: null,
      packages: [
        {
          code: "PKG-1",
          ndc11: "12345678901",
          billingProfiles: [{}],
          facilityFormulary: { id: "f1" },
        },
      ],
    },
    validationWarnings: [],
    duplicateNdcOnOtherProducts: false,
  };

  it("is ready when all criteria met", () => {
    const r = evaluateActivationReadiness(baseInput);
    expect(r.ready).toBe(true);
    expect(r.blockingReasons).toEqual([]);
  });

  it("blocks when safety profile missing", () => {
    const r = evaluateActivationReadiness({
      ...baseInput,
      concept: { safetyProfile: null },
    });
    expect(r.ready).toBe(false);
    expect(r.blockingReasons).toContain("MISSING_SAFETY_PROFILE");
  });

  it("blocks when governance is BLOCKED or note required paths", () => {
    expect(
      evaluateActivationReadiness({ ...baseInput, governanceStatus: "BLOCKED" }).blockingReasons
    ).toContain("GOVERNANCE_BLOCKED");
  });

  it("blocks infusion products without infusion profile", () => {
    const r = evaluateActivationReadiness({
      ...baseInput,
      product: {
        ...baseInput.product,
        administrationType: "INFUSION",
        infusionProfile: null,
      },
    });
    expect(r.blockingReasons).toContain("MISSING_INFUSION_PROFILE");
  });
});

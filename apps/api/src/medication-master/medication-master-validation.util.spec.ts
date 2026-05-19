import { buildMedicationMasterValidationWarnings } from "./medication-master-validation.util";

describe("buildMedicationMasterValidationWarnings", () => {
  it("flags missing safety profile, NDC, billing, infusion, formulary", () => {
    const warnings = buildMedicationMasterValidationWarnings({
      facilityId: "fac-1",
      concept: { code: "C1", safetyProfile: null, conceptAliases: [] },
      products: [
        {
          code: "P1",
          administrationType: "INFUSION",
          administrationProfile: { requiresInfusionSession: true },
          infusionProfile: null,
          productAliases: [],
          packages: [
            {
              code: "PKG1",
              ndc11: null,
              billingProfiles: [],
              facilityFormulary: null,
            },
          ],
        },
      ],
    });

    const codes = warnings.map((w) => w.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "MISSING_SAFETY_PROFILE",
        "MISSING_INFUSION_PROFILE",
        "MISSING_NDC",
        "MISSING_BILLING_PROFILE",
        "MISSING_FACILITY_FORMULARY",
      ])
    );
  });

  it("flags billing review when all profiles require manual review", () => {
    const warnings = buildMedicationMasterValidationWarnings({
      concept: {
        code: "C1",
        safetyProfile: {},
        conceptAliases: [{ alias: "a" }],
      },
      products: [
        {
          code: "P1",
          administrationType: "PUSH",
          administrationProfile: {},
          infusionProfile: null,
          productAliases: [],
          packages: [
            {
              code: "PKG1",
              ndc11: "12345678901",
              billingProfiles: [{ requiresManualReview: true }],
              facilityFormulary: { id: "f1" },
            },
          ],
        },
      ],
    });

    expect(warnings.some((w) => w.code === "BILLING_REVIEW_REQUIRED")).toBe(true);
    expect(warnings.some((w) => w.code === "MISSING_NDC")).toBe(false);
  });
});

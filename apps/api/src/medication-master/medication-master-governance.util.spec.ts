import {
  aggregateGovernanceFromConcepts,
  readinessPercent,
  type GovernanceConceptRow,
} from "./medication-master-governance.util";

const baseConcept: GovernanceConceptRow = {
  id: "c1",
  code: "CONCEPT-1",
  genericName: "Epinephrine",
  displayName: "Épinéphrine",
  safetyProfile: null,
  conceptAliases: [],
  products: [
    {
      id: "p1",
      code: "PROD-1",
      administrationType: "INFUSION",
      administrationProfile: { requiresInfusionSession: true },
      infusionProfile: null,
      productAliases: [],
      packages: [
        {
          id: "pkg1",
          code: "PKG-1",
          ndc11: null,
          billingProfiles: [],
          facilityFormulary: null,
        },
      ],
    },
  ],
};

describe("aggregateGovernanceFromConcepts", () => {
  it("counts missing safety, NDC, infusion, and formulary gaps", () => {
    const agg = aggregateGovernanceFromConcepts([baseConcept], "fac-1");
    expect(agg.missingSafetyProfile).toBe(1);
    expect(agg.missingNdc).toBe(1);
    expect(agg.missingBillingProfile).toBe(1);
    expect(agg.missingInfusionProfile).toBe(1);
    expect(agg.packagesMissingFormulary).toBe(1);
    expect(agg.conceptsWithCriticalWarnings).toBe(1);
    expect(agg.warningItems.some((w) => w.code === "MISSING_NDC")).toBe(true);
  });

  it("computes readiness percent", () => {
    expect(readinessPercent(3, 4)).toBe(75);
    expect(readinessPercent(0, 0)).toBe(100);
  });
});

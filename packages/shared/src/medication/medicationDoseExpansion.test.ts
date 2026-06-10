import { describe, expect, it } from "vitest";
import {
  evaluateMedicationDoseExpansionEligibility,
  evaluateMedicationDoseExpansionForClassification,
} from "./medicationDoseExpansion.js";

describe("medicationDoseExpansion (M1.8B.7F.1)", () => {
  it("DIRECT_MAR never expands", () => {
    const result = evaluateMedicationDoseExpansionForClassification("DIRECT_MAR");
    expect(result).toEqual({
      shouldExpand: false,
      reason: "DIRECT_MAR_NEVER_EXPANDS",
      classification: "DIRECT_MAR",
    });
  });

  it("INFUSION_LIFECYCLE never expands", () => {
    const result = evaluateMedicationDoseExpansionForClassification("INFUSION_LIFECYCLE");
    expect(result).toEqual({
      shouldExpand: false,
      reason: "INFUSION_LIFECYCLE_NEVER_EXPANDS",
      classification: "INFUSION_LIFECYCLE",
    });
  });

  it("ON_DEMAND does not pre-generate standing doses", () => {
    const result = evaluateMedicationDoseExpansionForClassification("ON_DEMAND");
    expect(result).toEqual({
      shouldExpand: false,
      reason: "ON_DEMAND_PRN_DOES_NOT_PREGENERATE",
      classification: "ON_DEMAND",
    });
  });

  it("RECURRING is eligible for future expansion", () => {
    const result = evaluateMedicationDoseExpansionForClassification("RECURRING");
    expect(result).toEqual({
      shouldExpand: true,
      reason: "RECURRING_MEDICATION_ELIGIBLE",
      classification: "RECURRING",
    });
  });

  it("NOW / STAT / ONCE classifications do not expand", () => {
    for (const frequencyCode of ["NOW", "STAT", "ONCE"] as const) {
      const result = evaluateMedicationDoseExpansionEligibility({ frequencyCode });
      expect(result.shouldExpand).toBe(false);
      expect(result.reason).toBe("DIRECT_MAR_NEVER_EXPANDS");
      expect(result.classification).toBe("DIRECT_MAR");
    }
  });

  it("CONTINUOUS does not expand", () => {
    const result = evaluateMedicationDoseExpansionEligibility({ frequencyCode: "CONTINUOUS" });
    expect(result.shouldExpand).toBe(false);
    expect(result.reason).toBe("INFUSION_LIFECYCLE_NEVER_EXPANDS");
    expect(result.classification).toBe("INFUSION_LIFECYCLE");
  });

  it("blood product catalog does not expand", () => {
    const result = evaluateMedicationDoseExpansionEligibility({
      frequencyCode: "ONCE",
      catalog: {
        catalogCode: "PRBC_TRANSFUSION",
        therapeuticClass: "BLOOD_PRODUCT",
      },
    });
    expect(result.shouldExpand).toBe(false);
    expect(result.reason).toBe("INFUSION_LIFECYCLE_NEVER_EXPANDS");
    expect(result.classification).toBe("INFUSION_LIFECYCLE");
  });

  it("IVPB route does not expand under current M1.8B.7B invariant", () => {
    const result = evaluateMedicationDoseExpansionEligibility({
      frequencyCode: "Q12H",
      orderRoute: "IVPB",
      catalog: {
        catalogCode: "VANCOMYCIN",
        genericName: "Vancomycin",
        administrationType: "PUSH",
      },
    });
    expect(result.shouldExpand).toBe(false);
    expect(result.reason).toBe("INFUSION_LIFECYCLE_NEVER_EXPANDS");
    expect(result.classification).toBe("INFUSION_LIFECYCLE");
  });

  it("recurring oral / IM schedule is eligible", () => {
    const result = evaluateMedicationDoseExpansionEligibility({
      frequencyCode: "BID",
      catalog: {
        catalogCode: "METFORMIN",
        genericName: "Metformin",
        administrationType: "PO",
        route: "PO",
      },
    });
    expect(result.shouldExpand).toBe(true);
    expect(result.reason).toBe("RECURRING_MEDICATION_ELIGIBLE");
    expect(result.classification).toBe("RECURRING");
  });

  it("PRN does not pre-generate", () => {
    const result = evaluateMedicationDoseExpansionEligibility({ frequencyCode: "PRN" });
    expect(result.shouldExpand).toBe(false);
    expect(result.reason).toBe("ON_DEMAND_PRN_DOES_NOT_PREGENERATE");
    expect(result.classification).toBe("ON_DEMAND");
  });
});

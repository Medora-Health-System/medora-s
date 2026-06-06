import { describe, expect, it } from "vitest";
import { resolveMarMedicationRouteCategory } from "./marMedicationRouteNormalization.js";

describe("resolveMarMedicationRouteCategory (M1.8B.4A)", () => {
  it("prioritizes order route over MAR and catalog routes", () => {
    expect(
      resolveMarMedicationRouteCategory({
        orderRoute: "SQ",
        marRoute: "IVP",
        catalogRoute: "IVPB",
      })
    ).toBe("SQ");
  });

  it("normalizes SQ synonyms", () => {
    expect(resolveMarMedicationRouteCategory({ orderRoute: "SC" })).toBe("SQ");
    expect(resolveMarMedicationRouteCategory({ orderRoute: "subcutaneous" })).toBe("SQ");
    expect(resolveMarMedicationRouteCategory({ orderRoute: "sous-cutanée" })).toBe("SQ");
  });

  it("normalizes IVP synonyms", () => {
    expect(resolveMarMedicationRouteCategory({ marRoute: "IV push" })).toBe("IVP");
    expect(resolveMarMedicationRouteCategory({ marRoute: "push" })).toBe("IVP");
    expect(resolveMarMedicationRouteCategory({ marRoute: "bolus" })).toBe("IVP");
  });

  it("normalizes IVPB / infusion synonyms", () => {
    expect(resolveMarMedicationRouteCategory({ catalogRoute: "IV piggyback" })).toBe("IVPB");
    expect(resolveMarMedicationRouteCategory({ catalogRoute: "infusion" })).toBe("IVPB");
    expect(resolveMarMedicationRouteCategory({ catalogRoute: "perfusion" })).toBe("IVPB");
    expect(resolveMarMedicationRouteCategory({ catalogRoute: "drip" })).toBe("IVPB");
  });

  it("uses administrationType when route text is generic injectable", () => {
    expect(
      resolveMarMedicationRouteCategory({
        catalogRoute: "injectable",
        administrationType: "SQ",
      })
    ).toBe("SQ");
    expect(
      resolveMarMedicationRouteCategory({
        catalogRoute: "injectable",
        administrationType: "PUSH",
      })
    ).toBe("IVP");
    expect(
      resolveMarMedicationRouteCategory({
        catalogRoute: "injectable",
        administrationType: "INFUSION",
      })
    ).toBe("IVPB");
  });

  it("treats continuous infusion lifecycle as IVPB", () => {
    expect(
      resolveMarMedicationRouteCategory({
        orderRoute: "IVP",
        isContinuousInfusion: true,
      })
    ).toBe("IVPB");
  });
});

import { describe, expect, it } from "vitest";
import { resolveMedicationResponseVisibilityTier } from "./marMedicationResponseVisibilityGovernance.js";

describe("marMedicationResponseVisibilityGovernance", () => {
  it("PRN => RECOMMENDED", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        frequencyCode: "PRN",
      })
    ).toBe("RECOMMENDED");
  });

  it("pain med => RECOMMENDED", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        medicationLabel: "Morphine 2 mg IV",
      })
    ).toBe("RECOMMENDED");
  });

  it("antiemetic => RECOMMENDED", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        medicationLabel: "Ondansetron 4 mg IV",
      })
    ).toBe("RECOMMENDED");
  });

  it("respiratory => RECOMMENDED", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        medicationLabel: "Albuterol nebulizer",
      })
    ).toBe("RECOMMENDED");
  });

  it("sedative => RECOMMENDED", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        medicationLabel: "Lorazepam 1 mg PO",
      })
    ).toBe("RECOMMENDED");
  });

  it("emergency med => RECOMMENDED", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        frequencyCode: "STAT",
        medicationLabel: "Epinephrine",
      })
    ).toBe("RECOMMENDED");
  });

  it("antibiotic => OPTIONAL", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        medicationLabel: "Ceftriaxone 1 g IV",
        frequencyCode: "DAILY",
      })
    ).toBe("OPTIONAL");
  });

  it("IV fluid => OPTIONAL", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        isContinuousFluid: true,
        manualLabel: "Normal Saline 0.9%",
      })
    ).toBe("OPTIONAL");
  });

  it("maintenance => OPTIONAL", () => {
    expect(
      resolveMedicationResponseVisibilityTier({
        doseStatus: "COMPLETED",
        medicationLabel: "Simvastatin 20 mg",
        frequencyCode: "QHS",
      })
    ).toBe("OPTIONAL");
  });

  it("refused/held/missed/not available => HIDDEN", () => {
    expect(resolveMedicationResponseVisibilityTier({ doseStatus: "REFUSED" })).toBe("HIDDEN");
    expect(resolveMedicationResponseVisibilityTier({ doseStatus: "HELD" })).toBe("HIDDEN");
    expect(resolveMedicationResponseVisibilityTier({ doseStatus: "MISSED" })).toBe("HIDDEN");
    expect(resolveMedicationResponseVisibilityTier({ doseStatus: "NOT_AVAILABLE" })).toBe(
      "HIDDEN"
    );
    expect(resolveMedicationResponseVisibilityTier({ doseStatus: "PENDING" })).toBe("HIDDEN");
  });
});

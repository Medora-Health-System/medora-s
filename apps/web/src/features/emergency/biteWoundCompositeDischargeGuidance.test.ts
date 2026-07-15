import { describe, expect, it } from "vitest";
import { composeBiteWoundDischargeGuidance } from "./biteWoundCompositeDischargeGuidance";

describe("composeBiteWoundDischargeGuidance", () => {
  it("composes human bite + cellulitis without rabies and without duplicate identical sentences", () => {
    const result = composeBiteWoundDischargeGuidance(
      [
        { code: "W50.3XXA", displayName: "Accidental bite by another person", isPrimary: true },
        { code: "L03.119", displayName: "Bite cellulitis of upper limb" },
      ],
      { locale: "en" },
    );
    expect(result.includesRabies).toBe(false);
    expect(result.returnPrecautions.toLowerCase()).not.toMatch(/rabies|animal control/);
    expect(result.provenance.some((p) => p.templateId === "human_bite_v1")).toBe(true);
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
  });

  it("keeps rabies available for animal bite primary", () => {
    const result = composeBiteWoundDischargeGuidance(
      [{ code: "W54.0XXA", displayName: "Bitten by dog", isPrimary: true }],
      { locale: "en" },
    );
    expect(result.includesRabies).toBe(true);
    expect(result.returnPrecautions.toLowerCase()).toMatch(/rabies/);
  });
});

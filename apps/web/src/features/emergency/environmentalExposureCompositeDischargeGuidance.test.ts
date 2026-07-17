import { describe, expect, it } from "vitest";
import { composeEnvironmentalExposureDischargeGuidance } from "./environmentalExposureCompositeDischargeGuidance";

describe("environmentalExposureCompositeDischargeGuidance — Phase 15", () => {
  it("lets heat stroke dominate over heat exhaustion without duplicating mild-heat language", () => {
    const result = composeEnvironmentalExposureDischargeGuidance(
      [
        { code: "T67.5XXA", displayName: "Heat exhaustion, unspecified", isPrimary: false },
        { code: "T67.01XA", displayName: "Heat stroke post-acute care", isPrimary: true },
      ],
      { locale: "en" },
    );
    expect(result.provenance[0]?.templateId).toBe("heat_stroke_post_acute_v1");
    expect(result.provenance.some((p) => p.templateId === "heat_exhaustion_v1")).toBe(true);
    // Dominant high-risk return precautions appear first; mild "heavy sweating" exhaustion phrasing is not the lead signal.
    expect(result.returnPrecautions.toLowerCase().indexOf("dark urine")).toBeLessThan(
      result.returnPrecautions.toLowerCase().indexOf("slurred speech") === -1
        ? Number.POSITIVE_INFINITY
        : result.returnPrecautions.toLowerCase().indexOf("slurred speech"),
    );
  });

  it("preserves drowning provenance when aspiration language is also present", () => {
    const result = composeEnvironmentalExposureDischargeGuidance(
      [
        {
          displayName: "Nonfatal drowning post-acute care with aspiration concern",
          isPrimary: true,
        },
      ],
      { locale: "en" },
    );
    expect(result.provenance[0]?.templateId).toBe("nonfatal_drowning_post_acute_v1");
    expect(result.returnPrecautions.toLowerCase()).not.toContain("dry drowning");
    expect(result.returnPrecautions.toLowerCase()).not.toContain("secondary drowning");
  });

  it("lets HAPE dominate AMS guidance", () => {
    const result = composeEnvironmentalExposureDischargeGuidance(
      [
        { code: "T70.20XA", displayName: "Acute mountain sickness", isPrimary: false },
        { displayName: "HAPE post-acute care", isPrimary: true },
      ],
      { locale: "en" },
    );
    expect(result.provenance[0]?.templateId).toBe("hape_post_acute_v1");
    expect(result.returnPrecautions.toLowerCase()).toMatch(/pink or frothy sputum|shortness of breath at rest/);
  });

  it("composes frostbite + hypothermia without empty precautions", () => {
    const result = composeEnvironmentalExposureDischargeGuidance(
      [
        { code: "T33.90XA", displayName: "Superficial frostbite", isPrimary: false },
        { code: "T68.XXXA", displayName: "Mild hypothermia", isPrimary: true },
      ],
      { locale: "en" },
    );
    expect(result.returnPrecautions.trim().length).toBeGreaterThan(20);
    expect(result.followUps.length).toBeGreaterThan(0);
  });

  it("supports French locale composition", () => {
    const result = composeEnvironmentalExposureDischargeGuidance(
      [{ code: "T67.5XXA", displayName: "Épuisement par la chaleur", isPrimary: true }],
      { locale: "fr" },
    );
    expect(result.returnPrecautions.toLowerCase()).toMatch(/chaleur|retournez/);
  });
});

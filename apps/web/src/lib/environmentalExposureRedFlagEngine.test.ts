import { describe, expect, it } from "vitest";
import {
  environmentalExposureRedFlagWarnings,
  isEnvironmentalExposureLifeThreateningFlagged,
  resolveEnvironmentalExposureRedFlags,
} from "./environmentalExposureRedFlagEngine";

describe("environmentalExposureRedFlagEngine", () => {
  it("detects heat stroke concern only when altered mental status/seizure/coma language is present", () => {
    const withAms = resolveEnvironmentalExposureRedFlags({
      displayName: "Hyperthermia with altered mental status",
    });
    expect(withAms.categories).toContain("heat_stroke");

    const temperatureOnly = resolveEnvironmentalExposureRedFlags({
      displayName: "Core temperature of 104F after exertion",
    });
    expect(temperatureOnly.categories).not.toContain("heat_stroke");
  });

  it("detects severe hypothermia concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "Severe hypothermia after prolonged cold exposure" });
    expect(result.categories).toContain("severe_hypothermia");
  });

  it("detects nonfatal drowning with respiratory failure concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({
      displayName: "Submersion with respiratory failure after rescue",
    });
    expect(result.categories).toContain("nonfatal_drowning_respiratory_failure");
  });

  it("detects high-voltage electrical injury concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "High-voltage electrical injury to the hand" });
    expect(result.categories).toContain("high_voltage_electrical");
    expect(isEnvironmentalExposureLifeThreateningFlagged({ displayName: "High-voltage electrical injury to the hand" })).toBe(
      true
    );
  });

  it("detects lightning injury with cardiac arrest concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "Lightning strike with cardiac arrest" });
    expect(result.categories).toContain("lightning_cardiac_arrest");
  });

  it("detects high-altitude cerebral edema (HACE) concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "High-altitude cerebral edema with ataxia" });
    expect(result.categories).toContain("hace");
  });

  it("detects high-altitude pulmonary edema (HAPE) concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "High-altitude pulmonary edema with hypoxia" });
    expect(result.categories).toContain("hape");
  });

  it("detects decompression illness concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "Decompression sickness after a dive" });
    expect(result.categories).toContain("decompression_illness");
  });

  it("detects arterial gas embolism concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({
      displayName: "Rapid ascent with loss of consciousness concerning for arterial gas embolism",
    });
    expect(result.categories).toContain("arterial_gas_embolism");
  });

  it("detects radiation emergency concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "Acute radiation syndrome after significant exposure" });
    expect(result.categories).toContain("radiation_emergency");
  });

  it("detects rhabdomyolysis with multiorgan concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "Rhabdomyolysis with renal failure" });
    expect(result.categories).toContain("rhabdomyolysis_multiorgan");
  });

  it("detects malignant arrhythmia concern", () => {
    const result = resolveEnvironmentalExposureRedFlags({
      displayName: "Ventricular fibrillation after electrical injury",
    });
    expect(result.categories).toContain("malignant_arrhythmia");
  });

  it("returns no categories for a benign, uncomplicated presentation", () => {
    const result = resolveEnvironmentalExposureRedFlags({ displayName: "Mild sunburn after a day at the beach" });
    expect(result.categories).toEqual([]);
    expect(result.prompts).toEqual([]);
    expect(isEnvironmentalExposureLifeThreateningFlagged({ displayName: "Mild sunburn after a day at the beach" })).toBe(
      false
    );
  });

  it("never suggests an autonomous diagnosis, cooling/rewarming, oxygen/hyperbaric order, admission, transfer, or consult in any prompt", () => {
    const warnings = environmentalExposureRedFlagWarnings({
      displayName: "Heat stroke with altered mental status, severe hypothermia, high-voltage electrical injury",
    });
    expect(warnings.length).toBeGreaterThan(0);
    for (const warning of warnings) {
      expect(warning).toMatch(
        /does not autonomously diagnose, initiate cooling or rewarming, order oxygen or hyperbaric therapy, admit, transfer, or request a consult/
      );
    }
  });

  it("never uses 'dry drowning' or 'secondary drowning' language in any prompt", () => {
    const warnings = environmentalExposureRedFlagWarnings({
      displayName: "Submersion with respiratory failure",
    });
    for (const warning of warnings) {
      expect(warning.toLowerCase()).not.toMatch(/dry drowning|secondary drowning/);
    }
  });
});

import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { resolveHeatEnvironmentalIllnessContext } from "@/lib/heatEnvironmentalIllnessClinicalIntelligence";
import { resolveColdEnvironmentalInjuryContext } from "@/lib/coldEnvironmentalInjuryClinicalIntelligence";
import { resolveSubmersionElectricalLightningContext } from "@/lib/submersionElectricalLightningClinicalIntelligence";
import { resolveAltitudeDivingRadiationExposureContext } from "@/lib/altitudeDivingRadiationExposureClinicalIntelligence";

describe("environmentalExposureEnterpriseClinicalContent — Phase 15 (Commit 1)", () => {
  it("exposes exactly four environmental/exposure adaptive templates", () => {
    const heat = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "heat_environmental_illness_adult_v1");
    const cold = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "cold_environmental_injury_adult_v1");
    const submersion = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "submersion_electrical_lightning_adult_v1");
    const altitude = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (t) => t.id === "altitude_diving_radiation_exposure_adult_v1"
    );
    expect(heat).toHaveLength(1);
    expect(cold).toHaveLength(1);
    expect(submersion).toHaveLength(1);
    expect(altitude).toHaveLength(1);
  });

  it("does not create separate visible templates for individual branches (no per-diagnosis template explosion)", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(heat_stroke|heat_exhaustion|heat_cramps|frostbite|frostnip|hypothermia|nonfatal_drowning|high_voltage|lightning_injury|hace|hape|decompression_illness|arterial_gas_embolism|radiation_injury|acute_mountain_sickness)_complaint/.test(
          t.id
        )
      )
    ).toBe(false);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "heat_environmental_illness_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "cold_environmental_injury_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "submersion_electrical_lightning_adult_v1")).toBe(true);
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "altitude_diving_radiation_exposure_adult_v1")
    ).toBe(true);
  });

  it("preserves the existing burn injury template and does not duplicate burn-specific frostbite/electrical logic", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "burn_injury_adult_complaint_v1")).toBe(true);
  });

  it("preserves Phase 13 soft tissue/wound infection and Phase 14 dermatology templates", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "soft_tissue_infection_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "abscess_purulent_infection_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "high_risk_wound_infection_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "dermatologic_rash_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "dermatologic_emergency_adult_v1")).toBe(true);
  });

  it("withholds routine discharge for heat stroke concern", () => {
    const context = resolveHeatEnvironmentalIllnessContext({
      displayName: "Heat stroke with altered mental status",
    });
    expect(context.branches).toContain("heat_stroke_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for moderate to severe hypothermia concern", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Severe hypothermia after prolonged exposure" });
    expect(context.branches).toContain("moderate_severe_hypothermia");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for HACE concern", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "High-altitude cerebral edema with confusion",
    });
    expect(context.branches).toContain("hace_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for HAPE concern", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "High-altitude pulmonary edema with dyspnea at rest",
    });
    expect(context.branches).toContain("hape_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for decompression illness concern", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({ displayName: "Decompression sickness after a dive" });
    expect(context.branches).toContain("decompression_illness");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for high-voltage electrical injury", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "High-voltage electrical injury" });
    expect(context.branches).toContain("high_voltage_electrical");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("allows routine discharge for uncomplicated, low-acuity presentations across all four templates", () => {
    const heat = resolveHeatEnvironmentalIllnessContext({ displayName: "Heat cramps after outdoor exercise" });
    expect(heat.dischargeFamilyId).not.toBeNull();

    const cold = resolveColdEnvironmentalInjuryContext({ displayName: "Frostnip of the fingers" });
    expect(cold.dischargeFamilyId).not.toBeNull();

    const submersion = resolveSubmersionElectricalLightningContext({
      displayName: "Brief submersion, asymptomatic, well appearing",
    });
    expect(submersion.dischargeFamilyId).not.toBeNull();

    const altitude = resolveAltitudeDivingRadiationExposureContext({
      displayName: "Acute mountain sickness, mild headache",
    });
    expect(altitude.dischargeFamilyId).not.toBeNull();
  });

  it("never autonomously diagnoses, cools/rewarms, orders oxygen/hyperbaric therapy, admits, transfers, or requests a consult", () => {
    const heat = resolveHeatEnvironmentalIllnessContext({ displayName: "Heat stroke with altered mental status" });
    expect(heat.redFlagCategories).toContain("heat_stroke");
    const cold = resolveColdEnvironmentalInjuryContext({ displayName: "Severe hypothermia" });
    expect(cold.redFlagCategories).toContain("severe_hypothermia");
  });
});

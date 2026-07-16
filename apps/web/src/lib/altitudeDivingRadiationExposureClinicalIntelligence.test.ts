import { describe, expect, it } from "vitest";
import { resolveAltitudeDivingRadiationExposureContext } from "./altitudeDivingRadiationExposureClinicalIntelligence";

describe("altitudeDivingRadiationExposureClinicalIntelligence", () => {
  it("resolves acute mountain sickness branch and allows routine discharge", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "Acute mountain sickness, mild headache",
    });
    expect(context.branches).toContain("acute_mountain_sickness");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves HACE concern branch and withholds routine discharge", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "High-altitude cerebral edema with ataxia",
    });
    expect(context.branches).toContain("hace_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves HAPE concern branch and withholds routine discharge", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "High-altitude pulmonary edema with dyspnea at rest",
    });
    expect(context.branches).toContain("hape_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves decompression illness branch and withholds routine discharge", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({ displayName: "Decompression sickness after a dive" });
    expect(context.branches).toContain("decompression_illness");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves arterial gas embolism concern branch and withholds routine discharge", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "Rapid ascent with loss of consciousness concerning for arterial gas embolism",
    });
    expect(context.branches).toContain("arterial_gas_embolism_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves pulmonary barotrauma branch", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({ displayName: "Pulmonary barotrauma after a dive" });
    expect(context.branches).toContain("pulmonary_barotrauma");
  });

  it("resolves ear/sinus barotrauma branch and notes ENT ownership", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({ displayName: "Ear barotrauma after a dive" });
    expect(context.branches).toContain("ear_sinus_barotrauma_ent_overlap");
  });

  it("resolves radiation exposure only branch for a routine, low-dose exposure", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({ displayName: "Radiation exposure, occupational monitoring" });
    expect(context.branches).toContain("radiation_exposure_only");
  });

  it("resolves radiation injury concern branch and withholds routine discharge", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({ displayName: "Acute radiation syndrome after exposure" });
    expect(context.branches).toContain("radiation_injury_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves occupational mass exposure branch", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "Occupational mass exposure, multiple workers exposed",
    });
    expect(context.branches).toContain("occupational_mass_exposure");
  });

  it("links carbon monoxide/smoke mentions only as an exposure source, never as an autonomous toxicology diagnosis", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "Carbon monoxide exposure source reported after a house fire",
    });
    expect(context.branches).not.toContain("radiation_injury_concern");
  });

  it("allows discharge for high-acuity branches only when documented as post-acute follow-up", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({
      displayName: "High-altitude cerebral edema, follow-up recheck visit",
    });
    expect(context.branches).toContain("hace_concern");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("falls back to other when no altitude/diving/radiation terms are documented", () => {
    const context = resolveAltitudeDivingRadiationExposureContext({ displayName: "" });
    expect(context.branches).toContain("other");
  });
});

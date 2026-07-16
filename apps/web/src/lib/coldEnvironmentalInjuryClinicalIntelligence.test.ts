import { describe, expect, it } from "vitest";
import { resolveColdEnvironmentalInjuryContext } from "./coldEnvironmentalInjuryClinicalIntelligence";

describe("coldEnvironmentalInjuryClinicalIntelligence", () => {
  it("resolves mild hypothermia and allows routine discharge", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Mild hypothermia after brief outdoor exposure" });
    expect(context.branches).toContain("mild_hypothermia");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves frostnip branch", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Frostnip of the fingers" });
    expect(context.branches).toContain("frostnip");
  });

  it("resolves superficial frostbite branch", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Superficial frostbite of the toes" });
    expect(context.branches).toContain("superficial_frostbite");
  });

  it("resolves chilblains/pernio branch", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Chilblains of the hands" });
    expect(context.branches).toContain("chilblains_pernio");
  });

  it("resolves immersion foot branch", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Immersion foot after prolonged wet exposure" });
    expect(context.branches).toContain("immersion_foot");
  });

  it("resolves cold water exposure branch when not accompanied by hypothermia language", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Cold water exposure, otherwise well" });
    expect(context.branches).toContain("cold_water_exposure");
  });

  it("does not auto-stage severity from a single temperature mention alone", () => {
    const context = resolveColdEnvironmentalInjuryContext({
      displayName: "Core temperature of 35C after brief cold exposure, alert and oriented",
    });
    expect(context.branches).not.toContain("moderate_severe_hypothermia");
  });

  it("resolves moderate to severe hypothermia concern and withholds routine discharge", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Severe hypothermia after prolonged cold exposure" });
    expect(context.branches).toContain("moderate_severe_hypothermia");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves deep frostbite concern and withholds routine discharge", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Deep frostbite concern of the foot" });
    expect(context.branches).toContain("deep_frostbite");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("allows discharge for high-acuity branches only when documented as post-acute follow-up", () => {
    const context = resolveColdEnvironmentalInjuryContext({
      displayName: "Severe hypothermia, follow-up recheck visit",
    });
    expect(context.branches).toContain("moderate_severe_hypothermia");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("reuses plain-language body region vocabulary without duplicating burn engine terminology", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "Superficial frostbite of the hand" });
    expect(context.branches).toContain("superficial_frostbite");
  });

  it("falls back to other when no cold-related terms are documented", () => {
    const context = resolveColdEnvironmentalInjuryContext({ displayName: "" });
    expect(context.branches).toContain("other");
  });
});

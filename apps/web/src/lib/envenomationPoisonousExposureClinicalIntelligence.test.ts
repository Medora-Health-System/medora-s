import { describe, expect, it } from "vitest";
import { resolveEnvenomationPoisonousExposureContext } from "./envenomationPoisonousExposureClinicalIntelligence";
import { resolveToxicologyToxidromeRedFlags } from "./toxicologyToxidromeRedFlagEngine";

describe("envenomationPoisonousExposureClinicalIntelligence", () => {
  it("resolves snake envenomation and forbids cutting/suction/ice/tight tourniquet advice", () => {
    const context = resolveEnvenomationPoisonousExposureContext({
      displayName: "Venomous snake bite with local swelling",
    });
    expect(context.branches).toContain("snake_envenomation");
    expect(context.forbidsCuttingSuctionIceTightTourniquet).toBe(true);
    const flags = resolveToxicologyToxidromeRedFlags({
      displayName: "Snake envenomation with systemic toxicity",
    });
    expect(flags.prompts.join(" ").toLowerCase()).toMatch(/do not recommend cutting/);
  });

  it("withholds routine discharge for systemic snake envenomation with coagulopathy", () => {
    const context = resolveEnvenomationPoisonousExposureContext({
      displayName: "Snake envenomation with coagulopathy and hypotension",
    });
    expect(context.branches).toContain("snake_envenomation");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("does not steal ordinary dog bite into envenomation branches", () => {
    const context = resolveEnvenomationPoisonousExposureContext({
      displayName: "Dog bite to hand",
    });
    expect(context.branches).not.toContain("snake_envenomation");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves organophosphate/pesticide exposure", () => {
    const context = resolveEnvenomationPoisonousExposureContext({
      displayName: "Organophosphate pesticide poisoning with bronchorrhea",
    });
    expect(context.branches).toContain("pesticide_organophosphate");
  });
});

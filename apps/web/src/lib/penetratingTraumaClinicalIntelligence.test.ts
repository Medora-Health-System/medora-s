import { describe, expect, it } from "vitest";
import { resolvePenetratingTraumaContextFromDiagnosis } from "./penetratingTraumaClinicalIntelligence";

describe("penetratingTraumaClinicalIntelligence", () => {
  it.each([
    ["GSW upper arm", "gunshot_single", "upper_extremity", "trauma_penetrating_gsw_extremity", undefined],
    ["Knife stab to thigh", "stab_knife", "lower_extremity", "trauma_penetrating_stab_minor", undefined],
    ["Impaled object in chest", "impalement", "chest", "trauma_penetrating_chest", undefined],
    ["Retained bullet in lower leg", "gunshot_single", "lower_extremity", "trauma_penetrating_retained_projectile", undefined],
    ["Penetrating wound of right front wall of thorax", null, "chest", "trauma_penetrating_chest", "S21.301A"],
    ["Open bite of abdominal wall", null, "abdomen", "trauma_penetrating_abdomen", "S31.601A"],
    ["Penetrating wound of unspecified eye", null, "eye", "trauma_penetrating_eye", "S05.50XA"],
    ["Superficial puncture wound of hand", "accidental_puncture", "hand", "trauma_penetrating_hand", undefined],
  ])("resolves %s", (displayName, mechanism, region, family, code) => {
    const context = resolvePenetratingTraumaContextFromDiagnosis({ code, displayName });
    if (mechanism) expect(context.mechanisms).toContain(mechanism);
    expect(context.regions).toContain(region);
    expect(context.dischargeFamilyId).toBe(family);
  });

  it("keeps an empty diagnosis generic and non-autonomous", () => {
    const context = resolvePenetratingTraumaContextFromDiagnosis({});
    expect(context.dischargeFamilyId).toBeNull();
    expect(context.dispositionRecommendations.some((recommendation) => recommendation.id === "discharge")).toBe(true);
  });
});

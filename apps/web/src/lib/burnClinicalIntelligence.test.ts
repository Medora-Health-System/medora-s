import { describe, expect, it } from "vitest";
import { resolveBurnContextFromDiagnosis } from "./burnClinicalIntelligence";

describe("burnClinicalIntelligence", () => {
  it.each([
    ["T20.10XA", "Burn of first degree of unspecified part of head, face and neck", "face", "superficial", "trauma_burn_face"],
    ["T23.201A", "Burn of second degree of unspecified hand", "hand", "superficial_partial", "trauma_burn_hand"],
    ["T27.0XXA", "Burn of larynx and trachea", "respiratory", "not_applicable_inhalation", "trauma_burn_inhalation"],
    ["T25.0XXA", "Corrosion of unspecified ankle and foot", "foot", "indeterminate", "trauma_burn_chemical"],
    ["T33.90XA", "Superficial frostbite of unspecified site", "frostbite_site", "superficial", "trauma_burn_frostbite"],
    ["T75.4XXA", "Electrocution, accidental", null, "indeterminate", "trauma_burn_electrical"],
    ["L55.0", "Sunburn of first degree", null, "superficial", "trauma_burn_sunburn"],
  ])("resolves %s", (code, displayName, region, depth, dischargeFamilyId) => {
    const context = resolveBurnContextFromDiagnosis({ code, displayName });
    if (region) expect(context.regions).toContain(region);
    expect(context.depth).toBe(depth);
    expect(context.dischargeFamilyId).toBe(dischargeFamilyId);
  });

  it("keeps an empty diagnosis generic and non-autonomous", () => {
    const context = resolveBurnContextFromDiagnosis({});
    expect(context.dischargeFamilyId).toBeNull();
    expect(context.dispositionRecommendations.some((recommendation) => recommendation.id === "discharge")).toBe(true);
    expect(context.dispositionRecommendations.every((recommendation) => recommendation.rationale.length > 10)).toBe(true);
  });
});

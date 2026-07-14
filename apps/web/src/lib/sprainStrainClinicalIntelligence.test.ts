import { describe, expect, it } from "vitest";
import {
  adaptSprainStrainComplaintIntel,
  resolveSprainStrainContextFromDiagnosis,
} from "./sprainStrainClinicalIntelligence";
import { SPRAIN_STRAIN_ADULT_COMPLAINT_V1_INTEL } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";

describe("sprainStrainClinicalIntelligence", () => {
  it.each([
    {
      code: "S93.401A",
      displayName: "Ankle sprain",
      regions: ["ankle"],
      family: "trauma_sprain_ankle",
    },
    {
      code: "S63.501A",
      displayName: "Wrist sprain",
      regions: ["wrist"],
      family: "trauma_sprain_wrist",
    },
    {
      code: "S83.90XA",
      displayName: "Knee sprain",
      regions: ["knee"],
      family: "trauma_sprain_knee",
    },
    {
      code: "S16.1XXA",
      displayName: "Neck strain",
      regions: ["cervical"],
      family: "trauma_strain_neck",
    },
    {
      code: "S39.012A",
      displayName: "Back strain",
      regions: ["lumbar"],
      family: "trauma_strain_back",
    },
    {
      code: "S43.401A",
      displayName: "Shoulder sprain",
      regions: ["shoulder"],
      family: "trauma_sprain_shoulder",
    },
    {
      code: "S76.311A",
      displayName: "Hamstring strain",
      regions: ["hamstring", "thigh"],
      family: "trauma_sprain_generic",
    },
  ])("resolves $code", ({ code, displayName, regions, family }) => {
    const ctx = resolveSprainStrainContextFromDiagnosis({ code, displayName });
    for (const region of regions) expect(ctx.regions).toContain(region);
    expect(ctx.dischargeFamilyId).toBe(family);
    expect(ctx.dispositionRecommendations.length).toBeGreaterThan(0);
  });

  it("does not claim pure shoulder dislocation codes", () => {
    const ctx = resolveSprainStrainContextFromDiagnosis({
      code: "S43.001A",
      displayName: "Shoulder dislocation",
    });
    expect(ctx.regions).toEqual([]);
    expect(ctx.dischargeFamilyId).toBeNull();
  });

  it("adaptSprainStrainComplaintIntel prioritizes ankle chips", () => {
    const adapted = adaptSprainStrainComplaintIntel(SPRAIN_STRAIN_ADULT_COMPLAINT_V1_INTEL, {
      regions: ["ankle"],
    });
    const hpi = adapted.hpi ?? [];
    const ankleIndex = hpi.findIndex((k) => k.toLowerCase().includes("ankle"));
    const cervicalIndex = hpi.findIndex((k) => k.toLowerCase().includes("cervical"));
    expect(ankleIndex).toBeGreaterThanOrEqual(0);
    expect(cervicalIndex).toBeGreaterThanOrEqual(0);
    expect(ankleIndex).toBeLessThan(cervicalIndex);
  });
});

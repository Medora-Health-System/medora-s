import { describe, expect, it } from "vitest";
import {
  adaptTendonComplaintIntel,
  resolveTendonContextFromDiagnosis,
} from "./tendonClinicalIntelligence";
import { TENDON_INJURY_ADULT_COMPLAINT_V1_INTEL } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";

describe("tendonClinicalIntelligence", () => {
  it.each([
    {
      code: "S86.011A",
      displayName: "Achilles tendon rupture",
      regions: ["achilles"],
      family: "trauma_tendon_achilles",
    },
    {
      code: "S46.011A",
      displayName: "Rotator cuff tendon injury",
      regions: ["rotator_cuff"],
      family: "trauma_tendon_shoulder",
    },
    {
      code: "S66.321A",
      displayName: "Extensor tendon laceration",
      regions: ["extensor_hand"],
      family: "trauma_tendon_hand",
    },
    {
      code: "S76.111A",
      displayName: "Quadriceps tendon rupture",
      regions: ["quadriceps"],
      family: "trauma_tendon_extensor_mechanism",
    },
  ])("resolves $code", ({ code, displayName, regions, family }) => {
    const ctx = resolveTendonContextFromDiagnosis({ code, displayName });
    for (const region of regions) expect(ctx.regions).toContain(region);
    expect(ctx.dischargeFamilyId).toBe(family);
    expect(ctx.dispositionRecommendations.length).toBeGreaterThan(0);
    expect(ctx.dispositionRecommendations.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("does not claim pure ACL ligament codes", () => {
    const ctx = resolveTendonContextFromDiagnosis({
      code: "S83.511A",
      displayName: "ACL sprain",
    });
    expect(ctx.regions).toEqual([]);
    expect(ctx.dischargeFamilyId).toBeNull();
  });

  it("adaptTendonComplaintIntel prioritizes Achilles chips", () => {
    const adapted = adaptTendonComplaintIntel(TENDON_INJURY_ADULT_COMPLAINT_V1_INTEL, {
      regions: ["achilles"],
    });
    const hpi = adapted.hpi ?? [];
    const achillesIndex = hpi.findIndex((k) => k.toLowerCase().includes("achilles"));
    const shoulderIndex = hpi.findIndex((k) => k.toLowerCase().includes("shoulder"));
    expect(achillesIndex).toBeGreaterThanOrEqual(0);
    expect(shoulderIndex).toBeGreaterThanOrEqual(0);
    expect(achillesIndex).toBeLessThan(shoulderIndex);
  });
});

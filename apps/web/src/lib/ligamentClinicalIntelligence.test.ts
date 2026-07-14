import { describe, expect, it } from "vitest";
import {
  adaptLigamentComplaintIntel,
  resolveLigamentContextFromDiagnosis,
} from "./ligamentClinicalIntelligence";
import { LIGAMENT_INJURY_ADULT_COMPLAINT_V1_INTEL } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";

describe("ligamentClinicalIntelligence", () => {
  it.each([
    {
      code: "S83.511A",
      displayName: "ACL tear",
      regions: ["acl"],
      family: "trauma_ligament_knee",
    },
    {
      code: "S83.411A",
      displayName: "MCL sprain",
      regions: ["mcl"],
      family: "trauma_ligament_knee",
    },
    {
      code: "S93.431A",
      displayName: "High ankle syndesmosis sprain",
      regions: ["syndesmosis"],
      family: "trauma_ligament_ankle",
    },
    {
      code: "S63.641A",
      displayName: "Skier's thumb UCL injury",
      regions: ["thumb_ucl"],
      family: "trauma_ligament_hand",
    },
    {
      code: "S63.511A",
      displayName: "Scapholunate ligament injury",
      regions: ["scapholunate"],
      family: "trauma_ligament_upper_extremity",
    },
  ])("resolves $code", ({ code, displayName, regions, family }) => {
    const ctx = resolveLigamentContextFromDiagnosis({ code, displayName });
    for (const region of regions) expect(ctx.regions).toContain(region);
    expect(ctx.dischargeFamilyId).toBe(family);
    expect(ctx.dispositionRecommendations.length).toBeGreaterThan(0);
    expect(ctx.dispositionRecommendations.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("does not claim pure Achilles tendon rupture", () => {
    const ctx = resolveLigamentContextFromDiagnosis({
      code: "S86.011A",
      displayName: "Achilles tendon rupture",
    });
    expect(ctx.regions).toEqual([]);
    expect(ctx.dischargeFamilyId).toBeNull();
  });

  it("adaptLigamentComplaintIntel prioritizes ACL chips", () => {
    const adapted = adaptLigamentComplaintIntel(LIGAMENT_INJURY_ADULT_COMPLAINT_V1_INTEL, {
      regions: ["acl"],
    });
    const hpi = adapted.hpi ?? [];
    const aclIndex = hpi.findIndex((k) => k.toLowerCase().includes("acl"));
    const ankleIndex = hpi.findIndex((k) => k.toLowerCase().includes("ankle"));
    expect(aclIndex).toBeGreaterThanOrEqual(0);
    expect(ankleIndex).toBeGreaterThanOrEqual(0);
    expect(aclIndex).toBeLessThan(ankleIndex);
  });
});

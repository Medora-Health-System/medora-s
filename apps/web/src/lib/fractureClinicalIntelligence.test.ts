import { describe, expect, it } from "vitest";
import {
  adaptFractureComplaintIntel,
  resolveFractureContextFromDiagnosis,
} from "./fractureClinicalIntelligence";
import { FRACTURE_ADULT_COMPLAINT_V1_INTEL } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";

describe("fractureClinicalIntelligence", () => {
  it.each([
    {
      code: "S52.531A",
      displayName: "Displaced Colles' fracture of right radius",
      regions: ["forearm", "upper_extremity"],
      family: "trauma_fracture_upper_extremity",
      modifiers: ["closed"],
    },
    {
      code: "S72.001A",
      displayName: "Fracture of neck of right femur",
      regions: ["hip"],
      family: "trauma_fracture_hip",
      modifiers: ["closed"],
    },
    {
      code: "S02.3XXA",
      displayName: "Fracture of orbital floor",
      regions: ["orbital", "facial"],
      family: "trauma_fracture_facial",
      modifiers: ["closed"],
    },
    {
      code: "S32.010A",
      displayName: "Wedge compression fracture of first lumbar vertebra",
      regions: ["lumbar_spine", "spinal"],
      family: "trauma_fracture_spinal",
      modifiers: ["closed"],
    },
    {
      code: "S82.201B",
      displayName: "Open tibia fracture",
      regions: ["tibia_fibula", "lower_extremity"],
      family: "trauma_fracture_open",
      modifiers: ["open"],
    },
    {
      code: "S32.810A",
      displayName: "Multiple fractures of pelvis",
      regions: ["pelvis"],
      family: "trauma_fracture_lower_extremity",
      modifiers: ["closed"],
    },
    {
      code: "M84.351A",
      displayName: "Stress fracture, right hip",
      regions: ["hip"],
      family: "trauma_fracture_hip",
      modifiers: ["stress"],
    },
    {
      code: "S52.121A",
      displayName: "Displaced greenstick fracture of upper end of right radius",
      regions: ["forearm", "upper_extremity"],
      family: "trauma_fracture_upper_extremity",
      modifiers: ["closed", "pediatric"],
    },
  ])("resolves $code to expected region/family/modifiers", ({ code, displayName, regions, family, modifiers }) => {
    const ctx = resolveFractureContextFromDiagnosis({ code, displayName });
    for (const region of regions) {
      expect(ctx.regions).toContain(region);
    }
    expect(ctx.dischargeFamilyId).toBe(family);
    for (const modifier of modifiers) {
      expect(ctx.modifiers).toContain(modifier);
    }
    expect(ctx.dispositionRecommendations.length).toBeGreaterThan(0);
  });

  it("keyword-only broken wrist resolves upper extremity/hand context", () => {
    const ctx = resolveFractureContextFromDiagnosis({ displayName: "broken wrist" });
    expect(ctx.regions).toEqual(expect.arrayContaining(["wrist", "hand"]));
    expect(ctx.dischargeFamilyId).toBe("trauma_fracture_hand");
  });

  it("hip disposition advises admission and orthopedics", () => {
    const ctx = resolveFractureContextFromDiagnosis({
      code: "S72.001A",
      displayName: "hip fracture",
    });
    const ids = ctx.dispositionRecommendations.map((r) => r.id);
    expect(ids).toContain("admission");
    expect(ids).toContain("orthopedics");
  });

  it("open fracture disposition advises admission transfer and orthopedics", () => {
    const ctx = resolveFractureContextFromDiagnosis({
      code: "S82.201B",
      displayName: "open tibia fracture",
    });
    const ids = ctx.dispositionRecommendations.map((r) => r.id);
    expect(ids).toContain("admission");
    expect(ids).toContain("transfer");
    expect(ids).toContain("orthopedics");
  });

  it("facial fracture disposition advises maxillofacial consult", () => {
    const ctx = resolveFractureContextFromDiagnosis({
      code: "S02.3XXA",
      displayName: "orbital floor fracture",
    });
    expect(ctx.dispositionRecommendations.map((r) => r.id)).toContain("maxillofacial");
  });

  it("spinal fracture disposition advises neurosurgery and trauma", () => {
    const ctx = resolveFractureContextFromDiagnosis({
      code: "S32.010A",
      displayName: "lumbar compression fracture",
    });
    const ids = ctx.dispositionRecommendations.map((r) => r.id);
    expect(ids).toContain("neurosurgery");
    expect(ids).toContain("trauma");
  });

  it("adaptFractureComplaintIntel prioritizes region-matching HPI chips", () => {
    const adapted = adaptFractureComplaintIntel(FRACTURE_ADULT_COMPLAINT_V1_INTEL, {
      regions: ["hip"],
    });
    const hpi = adapted.hpi ?? [];
    const hipIndex = hpi.findIndex((k) => k.toLowerCase().includes("hip"));
    const skullIndex = hpi.findIndex((k) => k.toLowerCase().includes("skull"));
    expect(hipIndex).toBeGreaterThanOrEqual(0);
    expect(skullIndex).toBeGreaterThanOrEqual(0);
    expect(hipIndex).toBeLessThan(skullIndex);
  });
});

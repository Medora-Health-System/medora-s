import { describe, expect, it } from "vitest";
import {
  adaptDislocationComplaintIntel,
  resolveDislocationContextFromDiagnosis,
} from "./dislocationClinicalIntelligence";
import { DISLOCATION_ADULT_COMPLAINT_V1_INTEL } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";

describe("dislocationClinicalIntelligence", () => {
  it.each([
    {
      code: "S43.001A",
      displayName: "Anterior subluxation of right humerus",
      regions: ["shoulder"],
      family: "trauma_dislocation_shoulder",
    },
    {
      code: "S53.031A",
      displayName: "Nursemaid's elbow",
      regions: ["radial_head", "elbow"],
      family: "trauma_dislocation_elbow",
      modifiers: ["pediatric_nursemaid"],
    },
    {
      code: "S73.001A",
      displayName: "Hip dislocation",
      regions: ["hip"],
      family: "trauma_dislocation_hip",
    },
    {
      code: "S83.001A",
      displayName: "Patella dislocation",
      regions: ["patella", "knee"],
      family: "trauma_dislocation_patella",
    },
    {
      code: "S63.116A",
      displayName: "Finger dislocation",
      regions: ["finger", "hand"],
      family: "trauma_dislocation_hand",
    },
    {
      code: "S03.0XXA",
      displayName: "Dislocation of jaw",
      regions: ["jaw_tmj"],
      family: "trauma_dislocation_jaw",
    },
  ])("resolves $code", ({ code, displayName, regions, family, modifiers }) => {
    const ctx = resolveDislocationContextFromDiagnosis({ code, displayName });
    for (const region of regions) expect(ctx.regions).toContain(region);
    expect(ctx.dischargeFamilyId).toBe(family);
    for (const modifier of modifiers ?? []) expect(ctx.modifiers).toContain(modifier);
    expect(ctx.dispositionRecommendations.length).toBeGreaterThan(0);
  });

  it("does not claim pure fracture codes without dislocation wording", () => {
    const ctx = resolveDislocationContextFromDiagnosis({
      code: "S52.531A",
      displayName: "Colles fracture of right radius",
    });
    expect(ctx.regions).toEqual([]);
    expect(ctx.dischargeFamilyId).toBeNull();
  });

  it("hip disposition advises admission and orthopedics", () => {
    const ids = resolveDislocationContextFromDiagnosis({
      code: "S73.001A",
      displayName: "hip dislocation",
    }).dispositionRecommendations.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["admission", "orthopedics"]));
  });

  it("adaptDislocationComplaintIntel prioritizes shoulder chips", () => {
    const adapted = adaptDislocationComplaintIntel(DISLOCATION_ADULT_COMPLAINT_V1_INTEL, {
      regions: ["shoulder"],
    });
    const hpi = adapted.hpi ?? [];
    const shoulderIndex = hpi.findIndex((k) => k.toLowerCase().includes("shoulder"));
    const toeIndex = hpi.findIndex((k) => k.toLowerCase().includes("toe"));
    expect(shoulderIndex).toBeGreaterThanOrEqual(0);
    expect(toeIndex).toBeGreaterThanOrEqual(0);
    expect(shoulderIndex).toBeLessThan(toeIndex);
  });
});

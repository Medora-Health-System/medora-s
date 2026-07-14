import { describe, expect, it } from "vitest";
import { resolveForeignBodyContextFromDiagnosis } from "./foreignBodyClinicalIntelligence";

describe("foreignBodyClinicalIntelligence", () => {
  it("resolves ocular foreign body", () => {
    const ctx = resolveForeignBodyContextFromDiagnosis({
      code: "T15.00XA",
      displayName: "Foreign body in cornea",
    });
    expect(ctx.regions).toContain("eye");
    expect(ctx.dischargeFamilyId).toBe("trauma_foreign_body_eye");
    expect(ctx.dispositionRecommendations.some((r) => r.id === "ophthalmology")).toBe(true);
  });

  it("resolves hand puncture with foreign body", () => {
    const ctx = resolveForeignBodyContextFromDiagnosis({
      code: "S61.441A",
      displayName: "Puncture wound with foreign body of right hand",
    });
    expect(ctx.regions).toContain("hand_finger");
    expect(ctx.dischargeFamilyId).toBe("trauma_foreign_body_hand_finger");
  });

  it("resolves fishhook keyword", () => {
    const ctx = resolveForeignBodyContextFromDiagnosis({
      displayName: "Fishhook injury of finger",
    });
    expect(ctx.materials).toContain("fishhook");
    expect(ctx.dischargeFamilyId).toBe("trauma_foreign_body_fishhook");
  });

  it("resolves aspirated foreign body urgently", () => {
    const ctx = resolveForeignBodyContextFromDiagnosis({
      code: "T17.208A",
      displayName: "Foreign body in pharynx",
    });
    expect(ctx.regions).toContain("aspirated");
    expect(ctx.dispositionRecommendations.some((r) => r.id === "airway" || r.id === "transfer")).toBe(true);
  });
});

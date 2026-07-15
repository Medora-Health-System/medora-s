import { describe, expect, it } from "vitest";
import { resolveAmputationContextFromDiagnosis } from "./traumaticAmputationClinicalIntelligence";

describe("traumaticAmputationClinicalIntelligence", () => {
  it("resolves finger amputation to site-specific family", () => {
    const ctx = resolveAmputationContextFromDiagnosis({
      code: "S68.110A",
      displayName: "Complete traumatic MCP amputation of right index finger",
    });
    expect(ctx.regions).toContain("finger_thumb");
    expect(ctx.extent).toBe("complete");
    expect(ctx.dischargeFamilyId).toBe("trauma_amputation_finger_thumb");
    expect(ctx.dispositionRecommendations.some((r) => r.id === "hand_surgery")).toBe(true);
  });

  it("resolves toe amputation", () => {
    const ctx = resolveAmputationContextFromDiagnosis({
      code: "S98.111A",
      displayName: "Complete traumatic amputation of right great toe",
    });
    expect(ctx.regions).toContain("toe");
  });

  it("partial keyword preserves extent while preferring site-specific family", () => {
    const ctx = resolveAmputationContextFromDiagnosis({
      code: "S68.110A",
      displayName: "Partial traumatic amputation of finger",
    });
    expect(ctx.extent).toBe("partial");
    expect(ctx.dischargeFamilyId).toBe("trauma_amputation_finger_thumb");
  });

  it("head amputation routes to generic amp family", () => {
    const ctx = resolveAmputationContextFromDiagnosis({
      code: "S08.111A",
      displayName: "Complete traumatic amputation of right ear, initial encounter",
    });
    expect(ctx.dischargeFamilyId).toBe("trauma_amputation_generic");
  });
});

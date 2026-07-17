import { describe, expect, it } from "vitest";
import { resolveCapacityRefusalSafetyDispositionContext } from "./capacityRefusalSafetyDispositionClinicalIntelligence";

describe("capacityRefusalSafetyDispositionClinicalIntelligence", () => {
  it("resolves refusal and AMA branches", () => {
    const context = resolveCapacityRefusalSafetyDispositionContext({
      displayName: "Refusal of psychiatric evaluation, leaving against medical advice",
    });
    expect(context.branches).toContain("refusal");
    expect(context.branches).toContain("ama");
    expect(context.refusalNotIncapacity).toBe(true);
    expect(context.amaNotCapacity).toBe(true);
  });

  it("withholds routine discharge for active SI with plan in capacity context", () => {
    const context = resolveCapacityRefusalSafetyDispositionContext({
      displayName: "Capacity concern with active suicidal ideation with plan",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("allows follow-up discharge after observation for safety disposition planning", () => {
    const context = resolveCapacityRefusalSafetyDispositionContext({
      displayName: "Safety disposition planning, post-observation follow-up",
    });
    expect(context.dischargeFamilyId).toBe("behavioral_health_safety_plan_v1");
  });
});

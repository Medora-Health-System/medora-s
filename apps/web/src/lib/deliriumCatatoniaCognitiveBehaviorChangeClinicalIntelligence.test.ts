import { describe, expect, it } from "vitest";
import { resolveDeliriumCatatoniaCognitiveBehaviorChangeContext } from "./deliriumCatatoniaCognitiveBehaviorChangeClinicalIntelligence";

describe("deliriumCatatoniaCognitiveBehaviorChangeClinicalIntelligence", () => {
  it("resolves delirium branch", () => {
    const context = resolveDeliriumCatatoniaCognitiveBehaviorChangeContext({
      displayName: "Delirium with fluctuating mental status",
    });
    expect(context.branches).toContain("delirium");
    expect(context.deliriumMedicalEmergencyAdvisory).toBe(true);
  });

  it("withholds routine discharge for delirium", () => {
    const context = resolveDeliriumCatatoniaCognitiveBehaviorChangeContext({
      displayName: "Acute delirium with inattention and fever",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("allows follow-up discharge after observation for cognitive change", () => {
    const context = resolveDeliriumCatatoniaCognitiveBehaviorChangeContext({
      displayName: "Cognitive change, post-observation follow-up",
    });
    expect(context.dischargeFamilyId).toBe("dementia_behavior_change_v1");
  });
});

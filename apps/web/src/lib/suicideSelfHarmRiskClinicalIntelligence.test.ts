import { describe, expect, it } from "vitest";
import { resolveSuicideSelfHarmRiskContext } from "./suicideSelfHarmRiskClinicalIntelligence";
import { parseBehavioralHealthFromText } from "./behavioralHealthFoundation";

describe("suicideSelfHarmRiskClinicalIntelligence", () => {
  it("resolves active SI with plan branch", () => {
    const context = resolveSuicideSelfHarmRiskContext({
      displayName: "Active suicidal ideation with plan to overdose",
    });
    expect(context.branches).toContain("active_si_with_plan");
  });

  it("withholds routine discharge for active SI with plan", () => {
    const context = resolveSuicideSelfHarmRiskContext({
      displayName: "Suicidal ideation with plan and intent to die",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("does not invent prior suicide attempt when not documented", () => {
    const findings = parseBehavioralHealthFromText("Passive suicidal ideation without plan, denies prior attempts");
    expect(findings.priorSuicideAttemptReported).toBe(false);
  });

  it("allows follow-up discharge family after observation for passive SI", () => {
    const context = resolveSuicideSelfHarmRiskContext({
      displayName: "Passive suicidal ideation, post-observation follow-up",
    });
    expect(context.dischargeFamilyId).toBe("suicidal_ideation_post_assessment_v1");
  });
});

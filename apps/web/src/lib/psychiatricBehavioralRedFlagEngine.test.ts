import { describe, expect, it } from "vitest";
import {
  isPsychiatricBehavioralLifeThreateningFlagged,
  resolvePsychiatricBehavioralRedFlags,
} from "./psychiatricBehavioralRedFlagEngine";

describe("psychiatricBehavioralRedFlagEngine", () => {
  it("flags active suicidal intent with plan or means with advisory non-autonomous language", () => {
    const result = resolvePsychiatricBehavioralRedFlags({
      displayName: "Active suicidal ideation with plan and access to lethal means",
    });
    expect(result.categories).toContain("active_suicidal_intent_with_plan_or_means");
    expect(result.prompts[0]).toMatch(/does not autonomously diagnose/i);
    expect(result.prompts[0]).toMatch(/Do not state low suicide risk/i);
  });

  it("flags delirium as high-visibility medical emergency advisory", () => {
    const result = resolvePsychiatricBehavioralRedFlags({
      displayName: "Delirium with fluctuating mental status and inattention",
    });
    expect(result.categories).toContain("delirium_medical_emergency");
    expect(result.prompts.join(" ")).toMatch(/HIGH-VISIBILITY ADVISORY/i);
    expect(result.prompts.join(" ")).toMatch(/medical emergency/i);
  });

  it("flags postpartum psychosis with high-visibility advisory", () => {
    const result = resolvePsychiatricBehavioralRedFlags({
      displayName: "Postpartum psychosis with psychotic symptoms after delivery",
    });
    expect(result.categories).toContain("postpartum_psychosis_concern");
    expect(result.prompts.join(" ")).toMatch(/HIGH-VISIBILITY ADVISORY/i);
  });

  it("marks life-threatening categories", () => {
    expect(
      isPsychiatricBehavioralLifeThreateningFlagged({
        displayName: "Active homicidal intent with plan to harm others",
      })
    ).toBe(true);
  });
});

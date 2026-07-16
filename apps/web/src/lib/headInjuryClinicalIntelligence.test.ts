import { describe, expect, it } from "vitest";
import { adaptHeadInjuryComplaintIntel, resolveHeadInjuryContext } from "./headInjuryClinicalIntelligence";
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const baseIntel = {
  hpi: ["hpi.minorHead", "hpi.nat", "hpi.concussion"],
  rosRedFlags: ["rf.nat", "rf.headache"],
  mdmPlanSummary: ["plan.imaging", "plan.return"],
} as ProviderDocumentationComplaintIntelligence;

describe("headInjuryClinicalIntelligence", () => {
  it("resolves minor head, concussion/mild TBI, moderate, and severe TBI branches", () => {
    expect(resolveHeadInjuryContext({ displayName: "Minor head injury" }).branches).toContain("minor_head");
    expect(resolveHeadInjuryContext({ displayName: "Concussion" }).branches).toContain("concussion_mild_tbi");
    expect(resolveHeadInjuryContext({ displayName: "Moderate traumatic brain injury" }).branches).toContain("moderate_tbi");
    expect(resolveHeadInjuryContext({ displayName: "Severe traumatic brain injury" }).branches).toContain("severe_tbi");
  });

  it("resolves ICH, contusion, DAI, skull fracture, and basilar branches", () => {
    expect(resolveHeadInjuryContext({ displayName: "Subdural hematoma" }).branches).toContain("ich");
    expect(resolveHeadInjuryContext({ displayName: "Cerebral contusion" }).branches).toContain("contusion");
    expect(resolveHeadInjuryContext({ displayName: "Diffuse axonal injury" }).branches).toContain("dai");
    expect(resolveHeadInjuryContext({ code: "S02.0", displayName: "Skull fracture" }).branches).toContain("skull_fracture");
    expect(resolveHeadInjuryContext({ documentedFlags: ["Battle sign"] }).branches).toContain("basilar");
  });

  it("resolves anticoagulated, pediatric, geriatric, and NAT modifiers", () => {
    expect(resolveHeadInjuryContext({ documentedFlags: ["takes warfarin"] }).branches).toContain("anticoagulated");
    expect(resolveHeadInjuryContext({ documentedFlags: ["pediatric patient"] }).branches).toContain("pediatric");
    expect(resolveHeadInjuryContext({ documentedFlags: ["elderly patient"] }).branches).toContain("geriatric");
    expect(resolveHeadInjuryContext({ documentedFlags: ["suspicious injury pattern"] }).branches).toContain("nat");
  });

  it("routes concussion to concussion_mild_tbi discharge family", () => {
    expect(resolveHeadInjuryContext({ displayName: "Concussion" }).dischargeFamilyId).toBe("concussion_mild_tbi");
  });

  it("routes acute ICH away from routine discharge but supports a followup context", () => {
    expect(resolveHeadInjuryContext({ displayName: "Subdural hematoma" }).dischargeFamilyId).toBeNull();
    expect(
      resolveHeadInjuryContext({ displayName: "Subdural hematoma", documentedFlags: ["follow-up interval CT"] })
        .dischargeFamilyId,
    ).toBe("intracranial_hemorrhage_followup");
  });

  it("routes uncomplicated skull fracture to skull_fracture_followup", () => {
    expect(resolveHeadInjuryContext({ code: "S02.0", displayName: "Skull fracture" }).dischargeFamilyId).toBe(
      "skull_fracture_followup",
    );
  });

  it("keeps severe/moderate TBI, basilar, DAI, anticoagulated, and NAT away from routine discharge", () => {
    expect(resolveHeadInjuryContext({ displayName: "Severe traumatic brain injury" }).dischargeFamilyId).toBeNull();
    expect(resolveHeadInjuryContext({ displayName: "Moderate traumatic brain injury" }).dischargeFamilyId).toBeNull();
    expect(resolveHeadInjuryContext({ documentedFlags: ["Battle sign"] }).dischargeFamilyId).toBeNull();
    expect(resolveHeadInjuryContext({ displayName: "Diffuse axonal injury" }).dischargeFamilyId).toBeNull();
    expect(resolveHeadInjuryContext({ displayName: "Concussion", documentedFlags: ["takes apixaban"] }).dischargeFamilyId).toBeNull();
    expect(resolveHeadInjuryContext({ documentedFlags: ["suspicious injury pattern"] }).dischargeFamilyId).toBeNull();
  });

  it("adapts documentation order to prioritize red flags without changing diagnosis ownership", () => {
    const adapted = adaptHeadInjuryComplaintIntel(baseIntel, {
      branches: ["nat", "minor_head"],
      redFlagCategories: ["non_accidental_trauma"],
    });
    expect(adapted.hpi?.[0]?.toLowerCase()).toContain("nat");
  });
});

import { describe, expect, it } from "vitest";
import {
  isToxicologyLifeThreateningFlagged,
  resolveToxicologyToxidromeRedFlags,
} from "./toxicologyToxidromeRedFlagEngine";

describe("toxicologyToxidromeRedFlagEngine", () => {
  it("flags opioid toxidrome with advisory non-autonomous language", () => {
    const result = resolveToxicologyToxidromeRedFlags({
      displayName: "Opioid overdose with respiratory depression and pinpoint pupils",
    });
    expect(result.categories).toContain("opioid_toxidrome");
    expect(result.prompts[0]).toMatch(/does not autonomously diagnose/i);
    expect(result.prompts[0]).toMatch(/MAR/i);
  });

  it("flags intentional self-harm linkage without medical-clearance language", () => {
    const result = resolveToxicologyToxidromeRedFlags({
      displayName: "Intentional overdose with suicidal intent",
    });
    expect(result.categories).toContain("intentional_self_harm_linkage");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/do not state medically cleared/);
  });

  it("flags carbon monoxide concern and notes pulse oximetry limitation", () => {
    const result = resolveToxicologyToxidromeRedFlags({
      displayName: "Carbon monoxide poisoning after enclosed-space exposure",
    });
    expect(result.categories).toContain("carbon_monoxide_poisoning_concern");
    expect(result.prompts.join(" ")).toMatch(/Pulse oximetry alone does not exclude/i);
  });

  it("flags severe envenomation without cutting/suction recommendations", () => {
    const result = resolveToxicologyToxidromeRedFlags({
      displayName: "Snake envenomation with coagulopathy",
    });
    expect(result.categories).toContain("severe_envenomation");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/do not recommend cutting/);
  });

  it("marks life-threatening categories", () => {
    expect(
      isToxicologyLifeThreateningFlagged({ displayName: "Organophosphate poisoning with bronchorrhea" })
    ).toBe(true);
  });
});

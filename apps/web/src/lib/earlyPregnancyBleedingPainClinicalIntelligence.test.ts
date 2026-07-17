import { describe, expect, it } from "vitest";
import { resolveEarlyPregnancyBleedingPainContext } from "./earlyPregnancyBleedingPainClinicalIntelligence";
import { hasGestationalAgeSource, isGestationalAgeInvented, parseReproductiveGuFromText } from "./reproductiveGuFoundation";

describe("earlyPregnancyBleedingPainClinicalIntelligence", () => {
  it("resolves ectopic concern branch", () => {
    const context = resolveEarlyPregnancyBleedingPainContext({
      displayName: "Ectopic pregnancy concern with pelvic pain",
    });
    expect(context.branches).toContain("ectopic_concern");
  });

  it("withholds routine discharge for ruptured ectopic", () => {
    const context = resolveEarlyPregnancyBleedingPainContext({
      displayName: "Ruptured ectopic pregnancy with hypotension",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("does not invent gravidity parity or EGA", () => {
    const findings = parseReproductiveGuFromText("Early pregnancy bleeding, gravidity unknown, EGA unknown");
    expect(findings.gravidityReported).toBe(false);
    expect(findings.estimatedGestationalAgeReported).toBe(false);
  });

  it("detects gestational age invention risk without source", () => {
    const findings = parseReproductiveGuFromText("12 weeks gestation without documented dating source");
    expect(isGestationalAgeInvented(findings)).toBe(true);
    expect(hasGestationalAgeSource(findings)).toBe(false);
  });

  it("allows follow-up discharge family after observation", () => {
    const context = resolveEarlyPregnancyBleedingPainContext({
      displayName: "Threatened miscarriage, post-observation follow-up",
    });
    expect(context.dischargeFamilyId).toBe("early_pregnancy_bleeding_followup_v1");
  });
});

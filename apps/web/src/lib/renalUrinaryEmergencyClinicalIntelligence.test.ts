import { describe, expect, it } from "vitest";
import { resolveRenalUrinaryEmergencyContext } from "./renalUrinaryEmergencyClinicalIntelligence";

describe("renalUrinaryEmergencyClinicalIntelligence", () => {
  it("resolves infected stone branch", () => {
    const context = resolveRenalUrinaryEmergencyContext({
      displayName: "Infected obstructive stone with fever and flank pain",
    });
    expect(context.branches).toContain("infected_stone");
  });

  it("withholds routine discharge for urinary sepsis", () => {
    const context = resolveRenalUrinaryEmergencyContext({
      displayName: "Urinary sepsis with hypotension",
    });
    expect(context.branches).toContain("urinary_sepsis");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("allows pyelonephritis follow-up after acute care", () => {
    const context = resolveRenalUrinaryEmergencyContext({
      displayName: "Pyelonephritis, post-acute follow-up",
    });
    expect(context.branches).toContain("pyelonephritis");
    expect(context.dischargeFamilyId).toBe("pyelonephritis_followup_v1");
  });
});

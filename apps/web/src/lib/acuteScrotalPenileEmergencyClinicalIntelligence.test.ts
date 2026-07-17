import { describe, expect, it } from "vitest";
import { resolveAcuteScrotalPenileEmergencyContext } from "./acuteScrotalPenileEmergencyClinicalIntelligence";

describe("acuteScrotalPenileEmergencyClinicalIntelligence", () => {
  it("resolves testicular torsion branch", () => {
    const context = resolveAcuteScrotalPenileEmergencyContext({
      displayName: "Testicular torsion with sudden scrotal pain and nausea",
    });
    expect(context.branches).toContain("testicular_torsion");
  });

  it("withholds routine discharge for testicular torsion", () => {
    const context = resolveAcuteScrotalPenileEmergencyContext({
      displayName: "Testicular torsion concern, acute scrotum",
    });
    expect(context.dischargeFamilyId).toBeNull();
    expect(context.torsionExclusionForbidden).toBe(true);
  });

  it("documents Fournier overlap without owning disposition", () => {
    const context = resolveAcuteScrotalPenileEmergencyContext({
      displayName: "Fournier gangrene overlap with scrotal necrosis",
    });
    expect(context.branches).toContain("fournier_overlap");
    expect(context.fournierPhase13OverlapOnly).toBe(true);
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("allows epididymitis follow-up in post-acute context", () => {
    const context = resolveAcuteScrotalPenileEmergencyContext({
      displayName: "Epididymitis, post-acute follow-up",
    });
    expect(context.branches).toContain("epididymitis");
    expect(context.dischargeFamilyId).toBe("epididymitis_followup_v1");
  });
});

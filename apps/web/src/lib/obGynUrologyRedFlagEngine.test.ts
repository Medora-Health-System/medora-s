import { describe, expect, it } from "vitest";
import {
  isObGynUrologyLifeThreateningFlagged,
  resolveObGynUrologyRedFlags,
} from "./obGynUrologyRedFlagEngine";

describe("obGynUrologyRedFlagEngine", () => {
  it("flags ruptured ectopic with advisory non-autonomous language", () => {
    const result = resolveObGynUrologyRedFlags({
      displayName: "Ruptured ectopic pregnancy with hemoperitoneum and hypotension",
    });
    expect(result.categories).toContain("ruptured_ectopic_concern");
    expect(result.prompts[0]).toMatch(/does not autonomously diagnose/i);
    expect(result.prompts[0]).toMatch(/Do not state ectopic excluded/i);
  });

  it("flags ovarian torsion and notes Doppler limitation", () => {
    const result = resolveObGynUrologyRedFlags({
      displayName: "Ovarian torsion concern with sudden pelvic pain and nausea",
    });
    expect(result.categories).toContain("ovarian_torsion_concern");
    expect(result.prompts.join(" ")).toMatch(/Doppler flow presence does not exclude torsion/i);
  });

  it("flags testicular torsion without exclusion language", () => {
    const result = resolveObGynUrologyRedFlags({
      displayName: "Testicular torsion with sudden scrotal pain and nausea",
    });
    expect(result.categories).toContain("testicular_torsion_concern");
    expect(result.prompts.join(" ")).toMatch(/Do not state torsion excluded/i);
  });

  it("documents Fournier overlap without owning Phase 13 disposition", () => {
    const result = resolveObGynUrologyRedFlags({
      displayName: "Fournier gangrene concern with perineal necrosis",
    });
    expect(result.categories).toContain("fournier_concern");
    expect(result.prompts.join(" ")).toMatch(/Phase 13 NSTI ownership/i);
  });

  it("marks life-threatening categories", () => {
    expect(
      isObGynUrologyLifeThreateningFlagged({ displayName: "Severe preeclampsia with seizure in pregnancy" })
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { resolveBlastPolytraumaContextFromDiagnosis } from "./blastPolytraumaClinicalIntelligence";

describe("blastPolytraumaClinicalIntelligence", () => {
  it.each([
    ["T07.XXXA", "Unspecified multiple injuries", "trauma_polytrauma", "multiple"],
    ["T79.4XXA", "Traumatic shock", "trauma_polytrauma", undefined],
    ["S09.20XA", "Traumatic rupture of unspecified ear drum after explosion", "trauma_blast_ear", "ear"],
    ["T70.8XXA", "Other effects of high altitude, blast lung barotrauma", "trauma_blast_lung", "lung"],
    ["T71.21XA", "Asphyxiation due to cave-in", "trauma_blast_collapse", "crush"],
    ["W39.XXXA", "Discharge of firework", "trauma_blast_minor", undefined],
  ])("resolves %s", (code, displayName, family, system) => {
    const context = resolveBlastPolytraumaContextFromDiagnosis({ code, displayName });
    expect(context.dischargeFamilyId).toBe(family);
    if (system) expect(context.systems).toContain(system);
  });

  it("keeps advice clinician-directed for multisystem blast injury", () => {
    const context = resolveBlastPolytraumaContextFromDiagnosis({ code: "T07.XXXA", displayName: "Enclosed explosion with abdominal pain and tinnitus" });
    expect(context.dispositionRecommendations.map((item) => item.id)).toContain("transfer");
    expect(context.dispositionRecommendations.map((item) => item.id)).toContain("trauma");
  });
});

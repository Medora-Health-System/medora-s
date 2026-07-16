import { describe, expect, it } from "vitest";
import { composeSoftTissueWoundInfectionDischargeGuidance } from "./softTissueWoundInfectionCompositeDischargeGuidance";

describe("softTissueWoundInfectionCompositeDischargeGuidance — Phase 13", () => {
  it("lets necrotizing infection dominate over routine cellulitis without duplicate lines", () => {
    const result = composeSoftTissueWoundInfectionDischargeGuidance([
      { code: "L03.90", displayName: "Cellulitis", isPrimary: true },
      { code: "M72.6", displayName: "Necrotizing fasciitis" },
    ]);
    const ids = result.provenance.map((p) => p.templateId);
    expect(ids[0]).toBe("necrotizing_soft_tissue_infection_post_acute_v1");
    expect(ids).toEqual(expect.arrayContaining(["cellulitis_v1", "necrotizing_soft_tissue_infection_post_acute_v1"]));
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase()).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("composes abscess + cellulitis without duplicate paragraphs", () => {
    const result = composeSoftTissueWoundInfectionDischargeGuidance([
      { code: "L02.91", displayName: "Cutaneous abscess", isPrimary: true },
      { code: "L03.90", displayName: "Cellulitis" },
    ]);
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["abscess_without_drainage_v1", "cellulitis_v1"]),
    );
  });

  it("lets diabetic foot infection dominate over generic cellulitis", () => {
    const result = composeSoftTissueWoundInfectionDischargeGuidance([
      { code: "L03.115", displayName: "Cellulitis of right lower limb" },
      { code: "E11.621", displayName: "Type 2 diabetes mellitus with foot ulcer", isPrimary: true },
    ]);
    expect(result.provenance.map((p) => p.templateId)[0]).toBe("diabetic_foot_infection_v1");
  });

  it("keeps postoperative dehiscence and infection both visible", () => {
    const result = composeSoftTissueWoundInfectionDischargeGuidance([
      { code: "T81.31XA", displayName: "Disruption of external operation wound" },
      { code: "T81.41XA", displayName: "Infection following a procedure, surgical site" },
    ]);
    const ids = result.provenance.map((p) => p.templateId);
    expect(ids).toEqual(
      expect.arrayContaining(["wound_dehiscence_post_acute_v1", "postoperative_wound_infection_v1"]),
    );
  });

  it("preserves bite provenance with cellulitis without rabies language", () => {
    const result = composeSoftTissueWoundInfectionDischargeGuidance([
      { displayName: "Bite cellulitis", isPrimary: true },
      { code: "L03.113", displayName: "Cellulitis of right upper limb" },
    ]);
    expect(result.returnPrecautions.toLowerCase()).not.toMatch(/rabies/);
  });
});

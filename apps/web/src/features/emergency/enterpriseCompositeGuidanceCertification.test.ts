import { describe, expect, it } from "vitest";
import { composePsychiatricBehavioralDischargeGuidance } from "./psychiatricBehavioralCompositeDischargeGuidance";
import { composeObGynUrologyDischargeGuidance } from "./obGynUrologyCompositeDischargeGuidance";

describe("enterpriseCompositeGuidanceCertification — Phase 19 Commit 1", () => {
  it("composes intentional OD + SI without duplicate return precautions", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "T50.902A", displayName: "Intentional overdose with suicidal ideation", isPrimary: true },
      { code: "R45.851", displayName: "Suicidal ideation", isPrimary: false },
    ]);
    expect(result.provenance.some((row) => row.templateId === "suicidal_ideation_post_assessment_v1")).toBe(
      true
    );
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("composes delirium + agitation without duplicate observation sentences", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "F05", displayName: "Delirium", isPrimary: true },
      { code: "R45.1", displayName: "Agitation", isPrimary: false },
    ]);
    expect(result.provenance[0]?.templateId).toBe("delirium_post_acute_v1");
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("composes postpartum psychosis + insomnia with obstetric emergency tone", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "F53.0", displayName: "Postpartum psychosis", isPrimary: true },
      { code: "G47.00", displayName: "Insomnia", isPrimary: false },
    ]);
    expect(result.provenance[0]?.templateId).toBe("postpartum_psychiatric_crisis_post_acute_v1");
    expect(result.returnPrecautions.toLowerCase()).not.toContain("medically cleared");
  });

  it("preserves Fournier NSTI when co-listed with scrotal pain context", () => {
    const result = composeObGynUrologyDischargeGuidance([
      { code: "N49.3", displayName: "Fournier gangrene", isPrimary: true },
      { code: "N45.1", displayName: "Epididymitis", isPrimary: false },
    ]);
    expect(
      result.provenance.some((row) => row.templateId === "necrotizing_soft_tissue_infection_post_acute_v1")
    ).toBe(true);
  });

  it("composes self-inflicted injury + suicide attempt without duplicate lines", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "T14.91XA", displayName: "Suicide attempt", isPrimary: true },
      { code: "X78.1XXA", displayName: "Self-inflicted cut", isPrimary: false },
    ]);
    expect(result.provenance[0]?.templateId).toBe("suicide_attempt_post_acute_v1");
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });
});

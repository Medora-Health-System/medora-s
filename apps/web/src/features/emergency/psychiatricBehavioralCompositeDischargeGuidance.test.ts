import { describe, expect, it } from "vitest";
import { composePsychiatricBehavioralDischargeGuidance } from "./psychiatricBehavioralCompositeDischargeGuidance";

describe("psychiatricBehavioralCompositeDischargeGuidance — Phase 18", () => {
  it("composes intentional OD + SI without duplicate return precautions", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "T50.902A", displayName: "Intentional overdose with suicidal ideation", isPrimary: true },
      { code: "R45.851", displayName: "Suicidal ideation", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "suicidal_ideation_post_assessment_v1")).toBe(true);
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("composes self-inflicted injury + attempt without duplicate lines", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "T14.91XA", displayName: "Suicide attempt", isPrimary: true },
      { code: "X78.1XXA", displayName: "Self-inflicted cut", isPrimary: false },
    ]);
    expect(result.provenance[0]?.templateId).toBe("suicide_attempt_post_acute_v1");
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("composes psychosis + stimulant intoxication with substance family dominance", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "F19.959", displayName: "Substance-induced psychosis", isPrimary: true },
      { code: "F29", displayName: "Acute psychosis", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "substance_induced_behavioral_crisis_v1")).toBe(true);
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

  it("composes dementia + acute confusion", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "F03.91", displayName: "Dementia with behavioral disturbance", isPrimary: true },
      { code: "R41.0", displayName: "Acute confusion", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "dementia_behavior_change_v1")).toBe(true);
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("composes eating disorder + hypokalemia", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "F50.01", displayName: "Anorexia nervosa", isPrimary: true },
      { code: "E87.6", displayName: "Hypokalemia", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "eating_disorder_medical_followup_v1")).toBe(true);
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("composes refusal + impaired capacity without capacity assertions", () => {
    const result = composePsychiatricBehavioralDischargeGuidance([
      { code: "Z53.20", displayName: "Refusal of treatment", isPrimary: true },
      { code: "R45.851", displayName: "Suicidal ideation", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "informed_refusal_v1")).toBe(true);
    expect(result.returnPrecautions.toLowerCase()).not.toContain("has capacity");
    expect(result.returnPrecautions.toLowerCase()).not.toContain("lacks capacity");
  });
});

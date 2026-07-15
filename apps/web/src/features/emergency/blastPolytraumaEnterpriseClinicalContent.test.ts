import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import { composeBlastPolytraumaDischargeGuidance } from "./blastPolytraumaCompositeDischargeGuidance";

describe("PHASE_7 blast/polytrauma enterprise clinical content", () => {
  it("routes official blast and polytrauma codes without replacing anatomy-first care", () => {
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "T07.XXXA", displayName: "Unspecified multiple injuries" }).template.id).toBe("polytrauma_followup_v1");
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "S09.20XA", displayName: "Traumatic rupture of unspecified ear drum" }).template.id).toBe("blast_ear_injury_v1");
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "W40.0XXA", displayName: "Explosion of blasting material" }).template.id).toBe("blast_injury_minor_v1");
  });

  it("merges only blast contributor precautions and records provenance", () => {
    const guidance = composeBlastPolytraumaDischargeGuidance([
      { code: "T07.XXXA", displayName: "Unspecified multiple injuries", isPrimary: true },
      { code: "S09.20XA", displayName: "Traumatic rupture of unspecified ear drum" },
      { code: "S27.0XXA", displayName: "Traumatic pneumothorax" },
    ]);
    expect(guidance.provenance.map((item) => item.templateId)).toEqual(["polytrauma_followup_v1", "blast_ear_injury_v1"]);
    expect(guidance.returnPrecautions).toContain("Return immediately");
  });
});

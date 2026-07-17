import { describe, expect, it } from "vitest";
import { composeObGynUrologyDischargeGuidance } from "./obGynUrologyCompositeDischargeGuidance";

describe("obGynUrologyCompositeDischargeGuidance", () => {
  it("surfaces ectopic pregnancy ahead of generic early bleeding text without duplicate noise", () => {
    const result = composeObGynUrologyDischargeGuidance([
      { code: "O00.90", displayName: "Ectopic pregnancy, unspecified", isPrimary: true },
      { code: "O20.9", displayName: "Hemorrhage in early pregnancy, unspecified", isPrimary: false },
    ]);
    expect(result.provenance[0]?.templateId).toBe("ectopic_pregnancy_post_acute_v1");
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("does not invent ectopic or torsion exclusion language", () => {
    const result = composeObGynUrologyDischargeGuidance([
      { code: "N83.511", displayName: "Torsion of ovary and ovarian pedicle", isPrimary: true },
    ]);
    expect(result.returnPrecautions.toLowerCase()).not.toContain("torsion excluded");
    expect(result.returnPrecautions.toLowerCase()).not.toContain("ectopic excluded");
    expect(result.returnPrecautions.toLowerCase()).not.toContain("medically cleared");
  });

  it("keeps pyelonephritis and cystitis guidance distinct without duplicate observation sentences", () => {
    const result = composeObGynUrologyDischargeGuidance([
      { code: "N10", displayName: "Acute pyelonephritis", isPrimary: true },
      { code: "N30.00", displayName: "Acute cystitis without hematuria", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "pyelonephritis_v1")).toBe(true);
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("preserves Fournier NSTI when co-listed with scrotal pain context", () => {
    const result = composeObGynUrologyDischargeGuidance([
      { code: "N49.3", displayName: "Fournier gangrene", isPrimary: true },
      { code: "N45.1", displayName: "Epididymitis", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "necrotizing_soft_tissue_infection_post_acute_v1")).toBe(
      true,
    );
  });
});

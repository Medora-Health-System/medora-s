import { describe, expect, it } from "vitest";
import { composeEyeEmergencyDischargeGuidance } from "./eyeEmergencyCompositeDischargeGuidance";

describe("composeEyeEmergencyDischargeGuidance", () => {
  it("corneal abrasion + corneal foreign body: both templates contribute, no duplicate generic text", () => {
    const result = composeEyeEmergencyDischargeGuidance([
      { code: "H16.101A", displayName: "Corneal abrasion", isPrimary: true },
      { displayName: "Foreign body in cornea" },
    ]);
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["corneal_abrasion_v1", "corneal_foreign_body_v1"])
    );
    expect(result.returnPrecautions.toLowerCase()).toMatch(/eye pain|redness/);
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
  });

  it("open globe + hyphema: open globe precautions dominate", () => {
    const result = composeEyeEmergencyDischargeGuidance([
      { code: "H21.00", displayName: "Traumatic hyphema" },
      { code: "S05.20XA", displayName: "Open globe injury", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("open_globe_post_acute_v1");
    expect(result.returnPrecautions.toLowerCase()).toMatch(/vision loss|eye pain/);
  });

  it("corneal abrasion + retinal detachment: retinal detachment dominates over routine abrasion language", () => {
    const result = composeEyeEmergencyDischargeGuidance([
      { code: "H16.101A", displayName: "Corneal abrasion", isPrimary: true },
      { code: "H33.001", displayName: "Retinal detachment" },
    ]);
    expect(result.provenance[0]?.templateId).toBe("retinal_detachment_followup_v1");
    expect(result.returnPrecautions.toLowerCase()).toMatch(/curtain|shadow|floaters|flashes/);
  });

  it("eyelid laceration + orbital cellulitis: both contribute without duplicate return-precaution sentences", () => {
    const result = composeEyeEmergencyDischargeGuidance([
      { code: "S01.111A", displayName: "Eyelid laceration", isPrimary: true },
      { code: "H05.011", displayName: "Orbital cellulitis" },
    ]);
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["eyelid_laceration_v1", "orbital_cellulitis_followup_v1"])
    );
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
    expect(result.returnPrecautions.toLowerCase()).toMatch(/spreading redness|pus/);
    expect(result.returnPrecautions.toLowerCase()).toMatch(/bulging|eye movement/);
  });

  it("acute glaucoma is never contraindicated for IOP-lowering follow-up language and stays first over corneal ulcer when primary", () => {
    const result = composeEyeEmergencyDischargeGuidance([
      { code: "H16.001", displayName: "Corneal ulcer" },
      { code: "H40.211", displayName: "Acute angle-closure glaucoma", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("acute_glaucoma_followup_v1");
    expect(result.returnPrecautions.toLowerCase()).toMatch(/headache|nausea|halos/);
  });
});

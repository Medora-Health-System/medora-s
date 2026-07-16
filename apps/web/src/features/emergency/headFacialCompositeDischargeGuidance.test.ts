import { describe, expect, it } from "vitest";
import { composeHeadFacialDischargeGuidance } from "./headFacialCompositeDischargeGuidance";

describe("composeHeadFacialDischargeGuidance", () => {
  it("concussion + nasal fracture: both templates contribute, no duplicate generic text", () => {
    const result = composeHeadFacialDischargeGuidance([
      { code: "S06.0X0A", displayName: "Concussion", isPrimary: true },
      { code: "S02.2XXA", displayName: "Nasal fracture" },
    ]);
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["concussion_mild_tbi_v1", "nasal_fracture_v1"])
    );
    expect(result.returnPrecautions.toLowerCase()).toMatch(/headache|vomiting|seizure/);
    expect(result.returnPrecautions.toLowerCase()).toMatch(/nose|nosebleed/);
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
  });

  it("orbital fracture + hyphema: ocular precautions dominate", () => {
    const result = composeHeadFacialDischargeGuidance([
      { code: "S02.3XXA", displayName: "Orbital fracture" },
      { displayName: "Traumatic hyphema", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("orbital_fracture_v1");
    expect(result.provenance.every((p) => p.templateId === "orbital_fracture_v1")).toBe(true);
    expect(result.returnPrecautions.toLowerCase()).toMatch(/vision|double vision|eye/);
  });

  it("skull fracture + intracranial hemorrhage: ICH dominates over routine skull-fracture language", () => {
    const result = composeHeadFacialDischargeGuidance([
      { code: "S02.0XXA", displayName: "Skull fracture", isPrimary: true },
      { code: "S06.5X0A", displayName: "Traumatic subdural hemorrhage" },
    ]);
    expect(result.provenance[0]?.templateId).toBe("intracranial_hemorrhage_followup_v1");
    expect(result.returnPrecautions.toLowerCase()).toMatch(/emergency services|neurologic symptoms|close follow-up/);
    expect(result.returnPrecautions.toLowerCase()).not.toMatch(/return-to-play|return to sports/);
  });

  it("facial laceration + mandibular fracture: both contribute without duplicate pain/return sentences", () => {
    const result = composeHeadFacialDischargeGuidance([
      { displayName: "Facial laceration", isPrimary: true },
      { code: "S02.600A", displayName: "Mandibular fracture" },
    ]);
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["facial_laceration_v1", "mandibular_fracture_v1"])
    );
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
    expect(result.returnPrecautions.toLowerCase()).toMatch(/spreading redness|pus/);
    expect(result.returnPrecautions.toLowerCase()).toMatch(/inability to close the mouth|misaligned bite/);
  });
});

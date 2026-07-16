import { describe, expect, it } from "vitest";
import { composeEntEmergencyDischargeGuidance } from "./entEmergencyCompositeDischargeGuidance";

describe("composeEntEmergencyDischargeGuidance", () => {
  it("malignant otitis externa dominates over routine acute otitis externa", () => {
    const result = composeEntEmergencyDischargeGuidance([
      { code: "H60.31", displayName: "Acute otitis externa" },
      { code: "H60.20", displayName: "Malignant otitis externa", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("malignant_otitis_externa_post_acute_v1");
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["acute_otitis_externa_v1", "malignant_otitis_externa_post_acute_v1"])
    );
    expect(result.returnPrecautions.toLowerCase()).toMatch(/facial weakness|worsening ear pain/);
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
  });

  it("mastoiditis dominates over routine otitis media", () => {
    const result = composeEntEmergencyDischargeGuidance([
      { code: "H66.90", displayName: "Otitis media" },
      { code: "H70.90", displayName: "Mastoiditis", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("mastoiditis_post_acute_v1");
    expect(result.returnPrecautions.toLowerCase()).toMatch(/behind the ear|facial weakness|neck stiffness/);
  });

  it("sudden sensorineural hearing loss dominates over routine cerumen impaction", () => {
    const result = composeEntEmergencyDischargeGuidance([
      { displayName: "Cerumen impaction" },
      { code: "H91.21", displayName: "Sudden sensorineural hearing loss", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("sudden_hearing_loss_followup_v1");
    expect(result.returnPrecautions.toLowerCase()).toMatch(/dizziness|vertigo|hearing loss/);
  });

  it("Ludwig's angina dominates over routine dental pain", () => {
    const result = composeEntEmergencyDischargeGuidance([
      { code: "K04.7", displayName: "Dental pain" },
      { code: "K12.2", displayName: "Ludwig's angina", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("ludwig_angina_post_acute_v1");
    expect(result.returnPrecautions.toLowerCase()).toMatch(/breathing|swallowing|drooling/);
  });

  it("peritonsillar abscess dominates over routine pharyngitis and both contribute without duplicate lines", () => {
    const result = composeEntEmergencyDischargeGuidance([
      { code: "J02.9", displayName: "Pharyngitis" },
      { code: "J36", displayName: "Peritonsillar abscess", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("peritonsillar_abscess_post_drainage_v1");
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["otitis_pharyngitis_v1", "peritonsillar_abscess_post_drainage_v1"])
    );
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
    expect(result.returnPrecautions.toLowerCase()).toMatch(/difficulty breathing|swallowing/);
  });

  it("epiglottitis dominates over deep neck infection when marked primary and both templates contribute", () => {
    const result = composeEntEmergencyDischargeGuidance([
      { code: "J39.0", displayName: "Retropharyngeal abscess" },
      { code: "J05.1", displayName: "Epiglottitis", isPrimary: true },
    ]);
    expect(result.provenance[0]?.templateId).toBe("epiglottitis_post_acute_v1");
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["deep_neck_infection_post_acute_v1", "epiglottitis_post_acute_v1"])
    );
  });

  it("BPPV + vestibular neuritis: both templates contribute, no duplicate return-precaution lines", () => {
    const result = composeEntEmergencyDischargeGuidance([
      { code: "H81.10", displayName: "BPPV", isPrimary: true },
      { code: "H81.2", displayName: "Vestibular neuritis" },
    ]);
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["bppv_v1", "vestibular_neuritis_v1"])
    );
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
  });
});

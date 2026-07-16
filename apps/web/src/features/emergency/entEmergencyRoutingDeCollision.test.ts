import { describe, expect, it } from "vitest";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

/**
 * Phase 12 — ENT emergencies routing de-collision tests.
 * Confirms new high-acuity ENT families/templates never fall back to the broader,
 * lower-acuity family/template they would otherwise collide with.
 */
describe("Phase 12 ENT emergencies — routing de-collision", () => {
  it("malignant otitis externa (H60.2x) never resolves to routine acute otitis externa", () => {
    const malignant = resolveClinicalConditionFamily({ code: "H60.20", displayName: "Malignant otitis externa" });
    const routine = resolveClinicalConditionFamily({ code: "H60.339", displayName: "Swimmer's ear" });
    expect(malignant.familyId).toBe("malignant_otitis_externa_post_acute");
    expect(routine.familyId).toBe("acute_otitis_externa");
    expect(malignant.templateId).not.toBe(routine.templateId);

    const malignantTemplate = resolveProviderDischargeTemplateForDiagnosis({
      code: "H60.20",
      displayName: "Malignant otitis externa",
    });
    const routineTemplate = resolveProviderDischargeTemplateForDiagnosis({
      code: "H60.339",
      displayName: "Swimmer's ear",
    });
    expect(malignantTemplate.template.id).toBe("malignant_otitis_externa_post_acute_v1");
    expect(routineTemplate.template.id).toBe("acute_otitis_externa_v1");
  });

  it("mastoiditis (H70) never resolves to routine otitis media", () => {
    const mastoiditis = resolveClinicalConditionFamily({ code: "H70.90", displayName: "Mastoiditis" });
    const otitisMedia = resolveClinicalConditionFamily({
      code: "H66.90",
      displayName: "Otitis media",
      context: { patientAgeYears: 30 },
    });
    expect(mastoiditis.familyId).toBe("mastoiditis_post_acute");
    expect(otitisMedia.familyId).toBe("otitis_media");
    expect(mastoiditis.templateId).not.toBe(otitisMedia.templateId);

    const mastoiditisTemplate = resolveProviderDischargeTemplateForDiagnosis({
      code: "H70.90",
      displayName: "Mastoiditis",
    });
    expect(mastoiditisTemplate.template.id).toBe("mastoiditis_post_acute_v1");
    expect(mastoiditisTemplate.template.id).not.toBe(otitisMedia.templateId);
  });

  it("sudden sensorineural hearing loss (H91.2) never resolves to routine cerumen impaction / generic fallback", () => {
    const ssnhl = resolveClinicalConditionFamily({ code: "H91.20", displayName: "Sudden sensorineural hearing loss" });
    expect(ssnhl.familyId).toBe("sudden_hearing_loss_followup");
    expect(ssnhl.templateId).toBe("sudden_hearing_loss_followup_v1");

    const cerumen = resolveClinicalConditionFamily({ displayName: "Cerumen impaction" });
    expect(cerumen.templateId).not.toBe("sudden_hearing_loss_followup_v1");

    const ssnhlTemplate = resolveProviderDischargeTemplateForDiagnosis({
      code: "H91.20",
      displayName: "Sudden sensorineural hearing loss",
    });
    expect(ssnhlTemplate.template.id).toBe("sudden_hearing_loss_followup_v1");
  });

  it("peritonsillar abscess (J36), deep neck infection (J39.0), and Ludwig's angina (K12.2) never resolve to routine pharyngitis/dental pain", () => {
    const pta = resolveClinicalConditionFamily({ code: "J36", displayName: "Peritonsillar abscess" });
    const deepNeck = resolveClinicalConditionFamily({ code: "J39.0", displayName: "Retropharyngeal abscess" });
    const ludwig = resolveClinicalConditionFamily({ code: "K12.2", displayName: "Ludwig's angina" });
    const pharyngitis = resolveClinicalConditionFamily({ code: "J02.9", displayName: "Pharyngitis" });
    const dentalPain = resolveClinicalConditionFamily({ code: "K04.7", displayName: "Dental pain" });

    expect(pta.familyId).toBe("peritonsillar_abscess_post_drainage");
    expect(deepNeck.familyId).toBe("deep_neck_infection_post_acute");
    expect(ludwig.familyId).toBe("ludwig_angina_post_acute");
    expect([pta.templateId, deepNeck.templateId, ludwig.templateId]).not.toContain(pharyngitis.templateId);
    expect(ludwig.templateId).not.toBe(dentalPain.templateId);

    const ptaTemplate = resolveProviderDischargeTemplateForDiagnosis({ code: "J36", displayName: "Peritonsillar abscess" });
    const pharyngitisTemplate = resolveProviderDischargeTemplateForDiagnosis({ code: "J02.9", displayName: "Pharyngitis" });
    expect(ptaTemplate.template.id).toBe("peritonsillar_abscess_post_drainage_v1");
    expect(pharyngitisTemplate.template.id).toBe("otitis_pharyngitis_v1");
    expect(ptaTemplate.template.id).not.toBe(pharyngitisTemplate.template.id);
  });

  it("epiglottitis (J05.1) never resolves to pediatric croup/respiratory or routine pharyngitis", () => {
    const epiglottitis = resolveClinicalConditionFamily({ code: "J05.10", displayName: "Epiglottitis" });
    const pharyngitis = resolveClinicalConditionFamily({ code: "J02.9", displayName: "Pharyngitis" });
    expect(epiglottitis.familyId).toBe("epiglottitis_post_acute");
    expect(epiglottitis.templateId).toBe("epiglottitis_post_acute_v1");
    expect(epiglottitis.templateId).not.toBe(pharyngitis.templateId);
    expect(epiglottitis.templateId).not.toBe("pediatric_rsv_bronchiolitis_v1");
    expect(epiglottitis.templateId).not.toBe("pediatric_croup_v1");
  });

  it("BPPV (H81.1x) resolves to the dedicated bppv_v1 template, not the generic vertigo/dizziness template", () => {
    const bppv = resolveClinicalConditionFamily({ code: "H81.10", displayName: "BPPV" });
    expect(bppv.familyId).toBe("vertigo_tier2");
    expect(bppv.templateId).toBe("bppv_v1");
    expect(bppv.templateId).not.toBe("vertigo_dizziness_v1");
  });

  it("vestibular neuritis and labyrinthitis resolve distinctly from each other and from BPPV", () => {
    const neuritis = resolveClinicalConditionFamily({ code: "H81.20", displayName: "Vestibular neuritis" });
    const labyrinthitis = resolveClinicalConditionFamily({ code: "H83.01", displayName: "Labyrinthitis" });
    const bppv = resolveClinicalConditionFamily({ code: "H81.10", displayName: "BPPV" });
    expect(neuritis.templateId).toBe("vestibular_neuritis_v1");
    expect(labyrinthitis.templateId).toBe("labyrinthitis_v1");
    expect(new Set([neuritis.templateId, labyrinthitis.templateId, bppv.templateId]).size).toBe(3);
  });

  it("facial nerve palsy (G51.0) and Ramsay Hunt (B02.2) resolve distinctly", () => {
    const bellsPalsy = resolveClinicalConditionFamily({ code: "G51.0", displayName: "Bell's palsy" });
    const ramsayHunt = resolveClinicalConditionFamily({ code: "B02.21", displayName: "Ramsay Hunt syndrome" });
    expect(bellsPalsy.templateId).toBe("facial_nerve_palsy_v1");
    expect(ramsayHunt.templateId).toBe("ramsay_hunt_followup_v1");
    expect(bellsPalsy.templateId).not.toBe(ramsayHunt.templateId);
  });

  it("sialadenitis (K11.2) and salivary duct obstruction (K11.5) resolve distinctly", () => {
    const sialadenitis = resolveClinicalConditionFamily({ code: "K11.20", displayName: "Sialadenitis" });
    const sialolithiasis = resolveClinicalConditionFamily({ code: "K11.50", displayName: "Sialolithiasis" });
    expect(sialadenitis.templateId).toBe("sialadenitis_v1");
    expect(sialolithiasis.templateId).toBe("salivary_obstruction_v1");
    expect(sialadenitis.templateId).not.toBe(sialolithiasis.templateId);
  });

  it("nasal foreign body (keyword-only) does not steal ICD ownership from trauma_foreign_body_ear_nose", () => {
    const nasalFbCode = resolveClinicalConditionFamily({ code: "T17.1XXA", displayName: "Foreign body in nostril" });
    expect(nasalFbCode.familyId).toBe("trauma_foreign_body_ear_nose");

    const nasalFbKeyword = resolveClinicalConditionFamily({ displayName: "Nasal foreign body removed" });
    expect(nasalFbKeyword.familyId).toBe("nasal_foreign_body");
  });
});

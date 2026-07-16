import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { resolveEntEarHearingVertigoContext } from "@/lib/entEarHearingVertigoClinicalIntelligence";
import { resolveEntNoseEpistaxisContext } from "@/lib/entNoseEpistaxisClinicalIntelligence";
import { resolveEntThroatNeckAirwayContext } from "@/lib/entThroatNeckAirwayClinicalIntelligence";
import { isHintsDocumentationAllowed } from "@/lib/hintsExaminationSafety";

describe("entEmergencyEnterpriseClinicalContent — Phase 12", () => {
  it("exposes exactly three ENT emergency adaptive templates", () => {
    const earHearingVertigo = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (t) => t.id === "ent_ear_hearing_vertigo_adult_v1"
    );
    const noseEpistaxis = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "ent_nose_epistaxis_adult_v1");
    const throatNeckAirway = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (t) => t.id === "ent_throat_neck_airway_adult_v1"
    );
    expect(earHearingVertigo).toHaveLength(1);
    expect(noseEpistaxis).toHaveLength(1);
    expect(throatNeckAirway).toHaveLength(1);
  });

  it("does not create separate visible templates for otitis, epistaxis, peritonsillar abscess, Ludwig angina, or mastoiditis diagnosis-specific branches", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(otitis_externa|otitis_media|malignant_otitis_externa|bppv|posterior_epistaxis|anterior_epistaxis|peritonsillar_abscess|ludwig_angina|mastoiditis|epiglottitis)_complaint/.test(
          t.id
        )
      )
    ).toBe(false);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "ent_ear_hearing_vertigo_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "ent_nose_epistaxis_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "ent_throat_neck_airway_adult_v1")).toBe(true);
  });

  it("does not break the existing ear_pain_otitis_complaint_v1, vertigo_complaint_v1, or sore_throat templates", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "ear_pain_otitis_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "vertigo_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "sore_throat_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "sore_throat_infectious_complaint_v1")).toBe(true);
  });

  it("withholds routine discharge for malignant otitis externa and mastoiditis unless documented as post-acute follow-up", () => {
    const malignantOe = resolveEntEarHearingVertigoContext({ displayName: "Malignant otitis externa, diabetic patient" });
    const mastoiditis = resolveEntEarHearingVertigoContext({ displayName: "Mastoiditis with postauricular swelling" });
    const malignantOeFollowUp = resolveEntEarHearingVertigoContext({
      displayName: "Malignant otitis externa, follow-up recheck",
    });
    expect(malignantOe.branches).toContain("malignant_otitis_externa");
    expect(malignantOe.dischargeFamilyId).toBeNull();
    expect(mastoiditis.branches).toContain("mastoiditis");
    expect(mastoiditis.dischargeFamilyId).toBeNull();
    expect(malignantOeFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for sudden sensorineural hearing loss (SSNHL)", () => {
    const ssnhl = resolveEntEarHearingVertigoContext({ displayName: "Sudden sensorineural hearing loss" });
    expect(ssnhl.branches).toContain("ssnhl");
    expect(ssnhl.dischargeFamilyId).toBeNull();
  });

  it("never resolves an automatic discharge family for central vertigo concern, even on follow-up context", () => {
    const centralVertigo = resolveEntEarHearingVertigoContext({
      displayName: "Vertigo with dysarthria and truncal ataxia",
    });
    const centralVertigoFollowUp = resolveEntEarHearingVertigoContext({
      displayName: "Vertigo with dysarthria, follow-up recheck",
    });
    expect(centralVertigo.branches).toContain("central_vertigo_concern");
    expect(centralVertigo.dischargeFamilyId).toBeNull();
    expect(centralVertigoFollowUp.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for posterior epistaxis concern unless documented as post-acute follow-up", () => {
    const posterior = resolveEntNoseEpistaxisContext({ displayName: "Posterior epistaxis, failed anterior packing" });
    const posteriorFollowUp = resolveEntNoseEpistaxisContext({
      displayName: "Posterior epistaxis, follow-up recheck",
    });
    expect(posterior.branches).toContain("posterior_epistaxis_concern");
    expect(posterior.dischargeFamilyId).toBeNull();
    expect(posteriorFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("allows routine discharge for uncomplicated anterior epistaxis", () => {
    const anterior = resolveEntNoseEpistaxisContext({ displayName: "Anterior epistaxis" });
    expect(anterior.branches).toContain("anterior_epistaxis");
    expect(anterior.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for Ludwig angina and epiglottitis unless documented as post-acute follow-up", () => {
    const ludwig = resolveEntThroatNeckAirwayContext({ displayName: "Ludwig's angina, floor of mouth swelling" });
    const epiglottitis = resolveEntThroatNeckAirwayContext({ displayName: "Epiglottitis, thumbprint sign" });
    const ludwigFollowUp = resolveEntThroatNeckAirwayContext({
      displayName: "Ludwig's angina, follow-up recheck",
    });
    expect(ludwig.branches).toContain("ludwig_angina");
    expect(ludwig.dischargeFamilyId).toBeNull();
    expect(epiglottitis.branches).toContain("epiglottitis");
    expect(epiglottitis.dischargeFamilyId).toBeNull();
    expect(ludwigFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for peritonsillar abscess and retropharyngeal abscess", () => {
    const pta = resolveEntThroatNeckAirwayContext({ displayName: "Peritonsillar abscess, quinsy" });
    const rpa = resolveEntThroatNeckAirwayContext({ displayName: "Retropharyngeal abscess" });
    expect(pta.dischargeFamilyId).toBeNull();
    expect(rpa.dischargeFamilyId).toBeNull();
  });

  it("allows routine discharge for uncomplicated pharyngitis/tonsillitis", () => {
    const pharyngitis = resolveEntThroatNeckAirwayContext({ displayName: "Viral pharyngitis" });
    expect(pharyngitis.branches).toContain("pharyngitis_tonsillitis");
    expect(pharyngitis.dischargeFamilyId).not.toBeNull();
  });

  it("does not allow HINTS documentation for episodic positional dizziness (BPPV pattern)", () => {
    expect(isHintsDocumentationAllowed({ timing: "episodic_positional" })).toBe(false);
    expect(
      isHintsDocumentationAllowed({
        documentedFlags: ["positional vertigo triggered by rolling in bed", "BPPV pattern"],
      })
    ).toBe(false);
  });

  it("allows HINTS documentation only for continuous acute vestibular syndrome", () => {
    expect(isHintsDocumentationAllowed({ timing: "continuous_acute" })).toBe(true);
    expect(isHintsDocumentationAllowed({ documentedFlags: ["continuous vertigo since onset"] })).toBe(true);
    expect(isHintsDocumentationAllowed({ timing: "unknown" })).toBe(false);
    expect(isHintsDocumentationAllowed({})).toBe(false);
  });

  it("leaves existing eye, facial trauma, and dental templates unchanged", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "eye_complaint_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "eye_trauma_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "facial_trauma_adult_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "dental_pain_infection_complaint_v1")).toBe(true);
  });
});

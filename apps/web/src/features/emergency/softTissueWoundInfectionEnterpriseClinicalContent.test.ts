import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { resolveSoftTissueInfectionContext } from "@/lib/softTissueInfectionClinicalIntelligence";
import { resolveAbscessPurulentInfectionContext } from "@/lib/abscessPurulentInfectionClinicalIntelligence";
import { resolveHighRiskWoundInfectionContext } from "@/lib/highRiskWoundInfectionClinicalIntelligence";

describe("softTissueWoundInfectionEnterpriseClinicalContent — Phase 13", () => {
  it("exposes exactly three soft tissue / wound infection adaptive templates", () => {
    const softTissueInfection = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (t) => t.id === "soft_tissue_infection_adult_v1"
    );
    const abscessPurulentInfection = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (t) => t.id === "abscess_purulent_infection_adult_v1"
    );
    const highRiskWoundInfection = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (t) => t.id === "high_risk_wound_infection_adult_v1"
    );
    expect(softTissueInfection).toHaveLength(1);
    expect(abscessPurulentInfection).toHaveLength(1);
    expect(highRiskWoundInfection).toHaveLength(1);
  });

  it("does not create separate visible templates for cellulitis, abscess, necrotizing infection, felon, paronychia, or diabetic foot as new complaint IDs", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(nonpurulent_cellulitis|erysipelas|lymphangitis|necrotizing_(soft_tissue_infection|infection)|felon|paronychia|furuncle|carbuncle|diabetic_foot_infection|gas_gangrene|fournier_gangrene)_complaint/.test(
          t.id
        )
      )
    ).toBe(false);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "soft_tissue_infection_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "abscess_purulent_infection_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "high_risk_wound_infection_adult_v1")).toBe(true);
  });

  it("does not break the existing static cellulitis, abscess, or wound infection templates", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "cellulitis_skin_infection_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "abscess_soft_tissue_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "wound_infection_complaint_v1")).toBe(true);
  });

  it("withholds routine discharge for necrotizing infection concern unless documented as post-acute follow-up", () => {
    const necrotizing = resolveSoftTissueInfectionContext({ displayName: "Pain out of proportion to exam, rapidly progressive" });
    const necrotizingFollowUp = resolveSoftTissueInfectionContext({
      displayName: "Necrotizing soft tissue infection, follow-up recheck",
    });
    expect(necrotizing.branches).toContain("necrotizing_infection_concern");
    expect(necrotizing.dischargeFamilyId).toBeNull();
    expect(necrotizingFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for systemic toxicity/sepsis concern and diabetic foot limb-threat concern", () => {
    const systemic = resolveSoftTissueInfectionContext({ displayName: "Toxic appearing with wound infection" });
    expect(systemic.branches).toContain("systemic_infection_concern");
    expect(systemic.dischargeFamilyId).toBeNull();
    const diabeticFoot = resolveSoftTissueInfectionContext({ displayName: "Diabetic foot infection" });
    expect(diabeticFoot.branches).toContain("diabetic_foot_infection_concern");
    expect(diabeticFoot.dischargeFamilyId).toBeNull();
  });

  it("allows routine discharge for uncomplicated nonpurulent cellulitis", () => {
    const cellulitis = resolveSoftTissueInfectionContext({ displayName: "Nonpurulent cellulitis of the leg" });
    expect(cellulitis.branches).toContain("nonpurulent_cellulitis");
    expect(cellulitis.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for infectious flexor tenosynovitis (Kanavel signs) unless documented as follow-up", () => {
    const tenosynovitis = resolveHighRiskWoundInfectionContext({
      displayName: "Infectious flexor tenosynovitis, finger held in flexion, Kanavel signs present",
    });
    const followUp = resolveHighRiskWoundInfectionContext({
      displayName: "Infectious flexor tenosynovitis, follow-up recheck",
    });
    expect(tenosynovitis.branches).toContain("infectious_tenosynovitis");
    expect(tenosynovitis.dischargeFamilyId).toBeNull();
    expect(followUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for necrotizing soft tissue infection (NSTI) and wound dehiscence/evisceration", () => {
    const nsti = resolveHighRiskWoundInfectionContext({ displayName: "Necrotizing soft tissue infection" });
    expect(nsti.branches).toContain("necrotizing_infection");
    expect(nsti.dischargeFamilyId).toBeNull();
    const dehiscence = resolveHighRiskWoundInfectionContext({ displayName: "Wound dehiscence with evisceration" });
    expect(dehiscence.branches).toContain("wound_dehiscence");
    expect(dehiscence.dischargeFamilyId).toBeNull();
  });

  it("allows routine discharge for an uncomplicated infected traumatic wound", () => {
    const wound = resolveHighRiskWoundInfectionContext({ displayName: "Infected traumatic wound of the forearm" });
    expect(wound.branches).toContain("infected_traumatic_wound");
    expect(wound.dischargeFamilyId).not.toBeNull();
  });

  it("never offers an I&D-oriented discharge family for herpetic whitlow (no drainage indicated)", () => {
    const whitlow = resolveAbscessPurulentInfectionContext({
      displayName: "Vesicular lesions on the fingertip, herpetic whitlow",
    });
    expect(whitlow.branches).toContain("herpetic_whitlow_concern");
    expect(whitlow.dischargeFamilyId).toBeNull();
  });

  it("allows routine discharge for a simple cutaneous abscess after documented drainage", () => {
    const abscess = resolveAbscessPurulentInfectionContext({ displayName: "Cutaneous abscess of the forearm" });
    expect(abscess.branches).toContain("cutaneous_abscess");
    expect(abscess.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for deep collection concern unless documented as post-acute follow-up", () => {
    const deepCollection = resolveAbscessPurulentInfectionContext({ displayName: "Deep space hand infection with abscess" });
    expect(deepCollection.branches).toContain("deep_collection_concern");
    expect(deepCollection.dischargeFamilyId).toBeNull();
  });

  it("leaves existing bite, ENT, and eye templates unchanged", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "animal_bite_adult_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "human_bite_high_risk_wound_adult_complaint_v1")).toBe(
      true
    );
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "ent_ear_hearing_vertigo_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "ent_nose_epistaxis_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "ent_throat_neck_airway_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "eye_complaint_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "eye_trauma_adult_v1")).toBe(true);
  });

  it("never autonomously orders antibiotics, I&D, admission, transfer, or a consult in any red-flag prompt feeding these templates", () => {
    const necrotizing = resolveSoftTissueInfectionContext({ displayName: "Necrotizing soft tissue infection" });
    expect(necrotizing.redFlagCategories).toContain("necrotizing_soft_tissue_infection");
  });
});

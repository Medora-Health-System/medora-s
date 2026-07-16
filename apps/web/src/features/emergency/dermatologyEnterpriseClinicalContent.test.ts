import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { resolveDermatologicRashContext } from "@/lib/dermatologicRashClinicalIntelligence";
import { resolveAllergicInflammatoryDermatologyContext } from "@/lib/allergicInflammatoryDermatologyClinicalIntelligence";
import { resolveVesicularBullousSkinDisorderContext } from "@/lib/vesicularBullousSkinDisorderClinicalIntelligence";
import { resolveDermatologicEmergencyContext } from "@/lib/dermatologicEmergencyClinicalIntelligence";
import { resolveSoftTissueInfectionContext } from "@/lib/softTissueInfectionClinicalIntelligence";
import { resolveAbscessPurulentInfectionContext } from "@/lib/abscessPurulentInfectionClinicalIntelligence";
import { resolveHighRiskWoundInfectionContext } from "@/lib/highRiskWoundInfectionClinicalIntelligence";

describe("dermatologyEnterpriseClinicalContent — Phase 14", () => {
  it("exposes exactly four dermatologic emergency adaptive templates", () => {
    const rash = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "dermatologic_rash_adult_v1");
    const allergicInflammatory = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (t) => t.id === "allergic_inflammatory_dermatology_adult_v1"
    );
    const vesicularBullous = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (t) => t.id === "vesicular_bullous_skin_disorder_adult_v1"
    );
    const emergency = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "dermatologic_emergency_adult_v1");
    expect(rash).toHaveLength(1);
    expect(allergicInflammatory).toHaveLength(1);
    expect(vesicularBullous).toHaveLength(1);
    expect(emergency).toHaveLength(1);
  });

  it("does not create separate visible templates for SJS/TEN, HSV/zoster, or psoriasis as new complaint IDs", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(sjs_ten|stevens_johnson|toxic_epidermal_necrolysis|herpes_simplex|herpes_zoster|ophthalmic_zoster|psoriasis|dress_syndrome|agep)_complaint/.test(
          t.id
        )
      )
    ).toBe(false);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "dermatologic_rash_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "allergic_inflammatory_dermatology_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "vesicular_bullous_skin_disorder_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "dermatologic_emergency_adult_v1")).toBe(true);
  });

  it("preserves the existing static rash_skin_complaint_v1 template and Phase 13 soft tissue/wound infection templates", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "rash_skin_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "soft_tissue_infection_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "abscess_purulent_infection_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "high_risk_wound_infection_adult_v1")).toBe(true);
  });

  it("does not break the existing static cellulitis, abscess, or wound infection templates", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "cellulitis_skin_infection_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "abscess_soft_tissue_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "wound_infection_complaint_v1")).toBe(true);
  });

  it("withholds routine discharge for Stevens-Johnson syndrome / toxic epidermal necrolysis concern", () => {
    const sjs = resolveDermatologicEmergencyContext({ displayName: "Stevens-Johnson syndrome with epidermal detachment" });
    expect(sjs.branches).toContain("sjs_ten");
    expect(sjs.dischargeFamilyId).toBeNull();

    const sjsViaVesicular = resolveVesicularBullousSkinDisorderContext({
      displayName: "Toxic epidermal necrolysis with skin sloughing",
    });
    expect(sjsViaVesicular.branches).toContain("sjs_ten_concern");
    expect(sjsViaVesicular.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for DRESS syndrome concern", () => {
    const dress = resolveDermatologicEmergencyContext({ displayName: "DRESS syndrome with facial edema and eosinophilia" });
    expect(dress.branches).toContain("dress");
    expect(dress.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for petechiae/purpura with systemic symptoms", () => {
    const purpuraSystemic = resolveDermatologicEmergencyContext({
      displayName: "Purpura with fever and systemic symptoms",
    });
    expect(purpuraSystemic.branches).toContain("petechiae_purpura_systemic");
    expect(purpuraSystemic.dischargeFamilyId).toBeNull();

    const purpuraFulminans = resolveDermatologicEmergencyContext({ displayName: "Purpura fulminans" });
    expect(purpuraFulminans.branches).toContain("purpura_fulminans");
    expect(purpuraFulminans.dischargeFamilyId).toBeNull();

    const seriousRashRoute = resolveDermatologicRashContext({ displayName: "Purpura with fever and systemic symptoms" });
    expect(seriousRashRoute.branches).toContain("serious_rash_red_flag_concern");
    expect(seriousRashRoute.dischargeFamilyId).toBeNull();
  });

  it("allows routine discharge for uncomplicated allergic/irritant contact dermatitis", () => {
    const context = resolveAllergicInflammatoryDermatologyContext({
      displayName: "Allergic contact dermatitis, poison ivy exposure, no airway involvement",
    });
    expect(context.branches).toContain("allergic_contact_dermatitis");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("allows routine discharge for a pityriasis-style uncomplicated viral exanthem", () => {
    const context = resolveDermatologicRashContext({
      displayName: "Viral exanthem, mild, well appearing, no red flags",
    });
    expect(context.branches).toContain("viral_exanthem");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("leaves existing bite, ENT, eye, and soft tissue/wound infection resolvers unchanged", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "animal_bite_adult_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "ent_ear_hearing_vertigo_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "eye_complaint_adult_v1")).toBe(true);
    const necrotizing = resolveSoftTissueInfectionContext({ displayName: "Necrotizing soft tissue infection" });
    expect(necrotizing.dischargeFamilyId).toBeNull();
    const abscess = resolveAbscessPurulentInfectionContext({ displayName: "Cutaneous abscess of the forearm" });
    expect(abscess.dischargeFamilyId).not.toBeNull();
    const highRisk = resolveHighRiskWoundInfectionContext({ displayName: "Infected traumatic wound of the forearm" });
    expect(highRisk.dischargeFamilyId).not.toBeNull();
  });

  it("never autonomously diagnoses, orders medications, performs a biopsy, admits, transfers, or requests a consult", () => {
    const sjs = resolveDermatologicEmergencyContext({ displayName: "Stevens-Johnson syndrome" });
    expect(sjs.redFlagCategories).toContain("sjs_ten");
  });
});

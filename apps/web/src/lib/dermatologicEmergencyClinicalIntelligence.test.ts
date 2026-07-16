import { describe, expect, it } from "vitest";
import {
  adaptDermatologicEmergencyIntel,
  resolveDermatologicEmergencyContext,
} from "./dermatologicEmergencyClinicalIntelligence";

describe("dermatologicEmergencyClinicalIntelligence", () => {
  it("withholds routine discharge for Stevens-Johnson syndrome/TEN unless documented as follow-up", () => {
    const sjs = resolveDermatologicEmergencyContext({ displayName: "Stevens-Johnson syndrome with epidermal detachment" });
    const sjsFollowUp = resolveDermatologicEmergencyContext({
      displayName: "Stevens-Johnson syndrome, follow-up recheck",
    });
    expect(sjs.branches).toContain("sjs_ten");
    expect(sjs.dischargeFamilyId).toBeNull();
    expect(sjsFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for DRESS syndrome concern", () => {
    const dress = resolveDermatologicEmergencyContext({ displayName: "DRESS syndrome with facial edema" });
    expect(dress.branches).toContain("dress");
    expect(dress.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for AGEP concern", () => {
    const agep = resolveDermatologicEmergencyContext({ displayName: "Acute generalized exanthematous pustulosis" });
    expect(agep.branches).toContain("agep");
    expect(agep.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for meningococcal-type rash concern", () => {
    const meningo = resolveDermatologicEmergencyContext({ displayName: "Meningococcemia with petechial rash" });
    expect(meningo.branches).toContain("meningococcal_type_rash");
    expect(meningo.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for petechiae/purpura with systemic symptoms", () => {
    const petechiae = resolveDermatologicEmergencyContext({ displayName: "Petechiae with fever and systemic symptoms" });
    expect(petechiae.branches).toContain("petechiae_purpura_systemic");
    expect(petechiae.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for purpura fulminans", () => {
    const pf = resolveDermatologicEmergencyContext({ displayName: "Purpura fulminans" });
    expect(pf.branches).toContain("purpura_fulminans");
    expect(pf.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for disseminated infection concern", () => {
    const disseminated = resolveDermatologicEmergencyContext({ displayName: "Disseminated gonococcal infection" });
    expect(disseminated.branches).toContain("disseminated_infection");
    expect(disseminated.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for severe erythroderma", () => {
    const erythroderma = resolveDermatologicEmergencyContext({ displayName: "Erythroderma" });
    expect(erythroderma.branches).toContain("severe_erythroderma");
    expect(erythroderma.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for necrotizing infection overlap unless documented as follow-up", () => {
    const necrotizing = resolveDermatologicEmergencyContext({ displayName: "Skin necrosis with pain out of proportion to exam" });
    const necrotizingFollowUp = resolveDermatologicEmergencyContext({
      displayName: "Skin necrosis with pain out of proportion, follow-up recheck",
    });
    expect(necrotizing.branches).toContain("necrotizing_overlap");
    expect(necrotizing.dischargeFamilyId).toBeNull();
    expect(necrotizingFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for systemic toxicity concern", () => {
    const systemic = resolveDermatologicEmergencyContext({ displayName: "Toxic appearing with rash" });
    expect(systemic.branches).toContain("systemic_toxicity");
    expect(systemic.dischargeFamilyId).toBeNull();
  });

  it("allows routine discharge only for the 'other' branch without follow-up documentation", () => {
    const other = resolveDermatologicEmergencyContext({ displayName: "Mild localized rash without red flags" });
    expect(other.branches).toContain("other");
    expect(other.dischargeFamilyId).not.toBeNull();
  });

  it("adapts (reorders) chip order without changing chip content", () => {
    const intel = { hpi: ["a", "sjs ten noted"], rosRedFlags: ["b"], mdmPlanSummary: ["c"] };
    const context = resolveDermatologicEmergencyContext({ displayName: "stevens johnson syndrome" });
    const adapted = adaptDermatologicEmergencyIntel(intel, context);
    expect(adapted.hpi?.slice().sort()).toEqual(intel.hpi.slice().sort());
  });

  it("never autonomously orders medications, biopsy, admission, transfer, or a consult", () => {
    const sjs = resolveDermatologicEmergencyContext({ displayName: "Stevens-Johnson syndrome" });
    expect(sjs.redFlagCategories).toContain("sjs_ten");
  });
});

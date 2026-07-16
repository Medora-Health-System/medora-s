import { describe, expect, it } from "vitest";
import {
  adaptSoftTissueInfectionIntel,
  resolveSoftTissueInfectionContext,
} from "./softTissueInfectionClinicalIntelligence";

describe("softTissueInfectionClinicalIntelligence", () => {
  it("resolves nonpurulent cellulitis and allows routine discharge", () => {
    const context = resolveSoftTissueInfectionContext({ displayName: "Nonpurulent cellulitis of the leg" });
    expect(context.branches).toContain("nonpurulent_cellulitis");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves erysipelas branch", () => {
    const context = resolveSoftTissueInfectionContext({ displayName: "Erysipelas of the face" });
    expect(context.branches).toContain("erysipelas");
  });

  it("resolves lymphangitis branch", () => {
    const context = resolveSoftTissueInfectionContext({ displayName: "Cellulitis with red streaking extending toward the trunk" });
    expect(context.branches).toContain("lymphangitis");
  });

  it("withholds routine discharge for necrotizing infection concern unless documented as follow-up", () => {
    const necrotizing = resolveSoftTissueInfectionContext({ displayName: "Pain out of proportion to exam, rapidly progressive" });
    const necrotizingFollowUp = resolveSoftTissueInfectionContext({
      displayName: "Necrotizing soft tissue infection, follow-up recheck",
    });
    expect(necrotizing.branches).toContain("necrotizing_infection_concern");
    expect(necrotizing.dischargeFamilyId).toBeNull();
    expect(necrotizingFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for systemic infection concern unless documented as follow-up", () => {
    const systemic = resolveSoftTissueInfectionContext({ displayName: "Toxic appearing with wound infection" });
    expect(systemic.branches).toContain("systemic_infection_concern");
    expect(systemic.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for diabetic foot infection concern unless documented as follow-up", () => {
    const diabeticFoot = resolveSoftTissueInfectionContext({ displayName: "Diabetic foot infection" });
    expect(diabeticFoot.branches).toContain("diabetic_foot_infection_concern");
    expect(diabeticFoot.dischargeFamilyId).toBeNull();
  });

  it("resolves postoperative cellulitis and immunocompromised branches", () => {
    const postop = resolveSoftTissueInfectionContext({ displayName: "Surgical site infection with erythema" });
    expect(postop.branches).toContain("postoperative_cellulitis");
    const immunocompromised = resolveSoftTissueInfectionContext({ displayName: "Cellulitis, neutropenic patient" });
    expect(immunocompromised.branches).toContain("immunocompromised_infection");
  });

  it("adapts (reorders) chip order without changing chip content", () => {
    const intel = { hpi: ["a", "necrotizing infection concern noted"], rosRedFlags: ["b"], mdmPlanSummary: ["c"] };
    const context = resolveSoftTissueInfectionContext({ displayName: "necrotizing soft tissue infection" });
    const adapted = adaptSoftTissueInfectionIntel(intel, context);
    expect(adapted.hpi?.slice().sort()).toEqual(intel.hpi.slice().sort());
  });
});

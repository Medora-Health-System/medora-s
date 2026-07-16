import { describe, expect, it } from "vitest";
import { adaptDermatologicRashIntel, resolveDermatologicRashContext } from "./dermatologicRashClinicalIntelligence";

describe("dermatologicRashClinicalIntelligence", () => {
  it("resolves an undifferentiated rash and allows routine discharge", () => {
    const context = resolveDermatologicRashContext({ displayName: "Rash of unclear etiology" });
    expect(context.branches).toContain("undifferentiated_rash");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves viral exanthem branch", () => {
    const context = resolveDermatologicRashContext({ displayName: "Viral exanthem, hand foot and mouth pattern" });
    expect(context.branches).toContain("viral_exanthem");
  });

  it("resolves bacterial eruption concern branch", () => {
    const context = resolveDermatologicRashContext({ displayName: "Impetigo of the face" });
    expect(context.branches).toContain("bacterial_eruption_concern");
  });

  it("resolves fungal infection concern branch", () => {
    const context = resolveDermatologicRashContext({ displayName: "Tinea corporis" });
    expect(context.branches).toContain("fungal_infection_concern");
  });

  it("resolves parasitic infestation concern branch", () => {
    const context = resolveDermatologicRashContext({ displayName: "Scabies infestation" });
    expect(context.branches).toContain("parasitic_infestation_concern");
  });

  it("resolves suspicious lesion concern branch", () => {
    const context = resolveDermatologicRashContext({ displayName: "Suspicious skin lesion with irregular border" });
    expect(context.branches).toContain("suspicious_lesion_concern");
  });

  it("withholds routine discharge for a serious rash red flag concern unless documented as follow-up", () => {
    const serious = resolveDermatologicRashContext({ displayName: "Nonblanching rash with fever and neck stiffness" });
    const seriousFollowUp = resolveDermatologicRashContext({
      displayName: "Nonblanching rash with fever, follow-up recheck",
    });
    expect(serious.branches).toContain("serious_rash_red_flag_concern");
    expect(serious.dischargeFamilyId).toBeNull();
    expect(seriousFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for Stevens-Johnson syndrome concern surfaced through the red-flag engine", () => {
    const sjs = resolveDermatologicRashContext({ displayName: "Stevens-Johnson syndrome with skin sloughing" });
    expect(sjs.branches).toContain("serious_rash_red_flag_concern");
    expect(sjs.dischargeFamilyId).toBeNull();
    expect(sjs.redFlagCategories).toContain("sjs_ten");
  });

  it("adapts (reorders) chip order without changing chip content", () => {
    const intel = { hpi: ["a", "serious rash red flag concern noted"], rosRedFlags: ["b"], mdmPlanSummary: ["c"] };
    const context = resolveDermatologicRashContext({ displayName: "nonblanching rash with fever" });
    const adapted = adaptDermatologicRashIntel(intel, context);
    expect(adapted.hpi?.slice().sort()).toEqual(intel.hpi.slice().sort());
  });

  it("falls back to other when no rash-related terms are documented", () => {
    const context = resolveDermatologicRashContext({ displayName: "" });
    expect(context.branches).toContain("other");
  });
});

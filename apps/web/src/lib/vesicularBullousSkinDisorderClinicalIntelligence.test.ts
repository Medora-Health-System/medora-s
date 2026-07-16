import { describe, expect, it } from "vitest";
import {
  adaptVesicularBullousSkinDisorderIntel,
  resolveVesicularBullousSkinDisorderContext,
} from "./vesicularBullousSkinDisorderClinicalIntelligence";

describe("vesicularBullousSkinDisorderClinicalIntelligence", () => {
  it("resolves herpes simplex and allows routine discharge", () => {
    const context = resolveVesicularBullousSkinDisorderContext({ displayName: "Herpes simplex, cold sore" });
    expect(context.branches).toContain("herpes_simplex");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves herpes zoster branch", () => {
    const context = resolveVesicularBullousSkinDisorderContext({ displayName: "Herpes zoster, shingles of the trunk" });
    expect(context.branches).toContain("herpes_zoster");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for ophthalmic zoster concern unless documented as follow-up", () => {
    const ophthalmic = resolveVesicularBullousSkinDisorderContext({ displayName: "Zoster ophthalmicus with Hutchinson sign" });
    const ophthalmicFollowUp = resolveVesicularBullousSkinDisorderContext({
      displayName: "Zoster ophthalmicus, follow-up recheck",
    });
    expect(ophthalmic.branches).toContain("ophthalmic_zoster_concern");
    expect(ophthalmic.dischargeFamilyId).toBeNull();
    expect(ophthalmicFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("resolves varicella and bullous impetigo branches", () => {
    expect(resolveVesicularBullousSkinDisorderContext({ displayName: "Varicella, chickenpox" }).branches).toContain("varicella");
    expect(resolveVesicularBullousSkinDisorderContext({ displayName: "Bullous impetigo" }).branches).toContain(
      "bullous_impetigo"
    );
  });

  it("withholds routine discharge for Stevens-Johnson syndrome/TEN concern unless documented as follow-up", () => {
    const sjs = resolveVesicularBullousSkinDisorderContext({ displayName: "Stevens-Johnson syndrome with skin sloughing" });
    const sjsFollowUp = resolveVesicularBullousSkinDisorderContext({
      displayName: "Stevens-Johnson syndrome, follow-up recheck",
    });
    expect(sjs.branches).toContain("sjs_ten_concern");
    expect(sjs.dischargeFamilyId).toBeNull();
    expect(sjsFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for eczema herpeticum concern unless documented as follow-up", () => {
    const eh = resolveVesicularBullousSkinDisorderContext({
      displayName: "Eczema herpeticum with punched-out erosions on atopic dermatitis",
    });
    expect(eh.branches).toContain("eczema_herpeticum_concern");
    expect(eh.dischargeFamilyId).toBeNull();
  });

  it("never offers a discharge family for herpetic whitlow without follow-up context", () => {
    const whitlow = resolveVesicularBullousSkinDisorderContext({ displayName: "Herpetic whitlow of the fingertip" });
    expect(whitlow.branches).toContain("herpetic_whitlow");
    expect(whitlow.dischargeFamilyId).toBeNull();
  });

  it("resolves autoimmune bullous disorder and blistering medication reaction branches", () => {
    expect(
      resolveVesicularBullousSkinDisorderContext({ displayName: "Bullous pemphigoid" }).branches
    ).toContain("autoimmune_bullous_disorder");
    expect(
      resolveVesicularBullousSkinDisorderContext({ displayName: "Blistering drug reaction" }).branches
    ).toContain("blistering_medication_reaction");
  });

  it("adapts (reorders) chip order without changing chip content", () => {
    const intel = { hpi: ["a", "sjs ten concern noted"], rosRedFlags: ["b"], mdmPlanSummary: ["c"] };
    const context = resolveVesicularBullousSkinDisorderContext({ displayName: "stevens johnson syndrome" });
    const adapted = adaptVesicularBullousSkinDisorderIntel(intel, context);
    expect(adapted.hpi?.slice().sort()).toEqual(intel.hpi.slice().sort());
  });
});

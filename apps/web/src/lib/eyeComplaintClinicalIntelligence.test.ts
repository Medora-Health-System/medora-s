import { describe, expect, it } from "vitest";
import { adaptEyeComplaintIntel, resolveEyeComplaintContext } from "./eyeComplaintClinicalIntelligence";
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const baseIntel = {
  hpi: ["hpi.redEye", "hpi.acuteGlaucoma", "hpi.corneaAbrasion"],
  rosRedFlags: ["rf.visionLoss", "rf.eyePain"],
  mdmPlanSummary: ["plan.ophthalmology", "plan.return"],
} as ProviderDocumentationComplaintIntelligence;

describe("eyeComplaintClinicalIntelligence", () => {
  it("resolves red_eye, eye_pain, and acute_visual_loss branches", () => {
    expect(resolveEyeComplaintContext({ displayName: "Red eye" }).branches).toContain("red_eye");
    expect(resolveEyeComplaintContext({ displayName: "Eye pain" }).branches).toContain("eye_pain");
    expect(resolveEyeComplaintContext({ displayName: "Sudden vision loss in one eye" }).branches).toContain("acute_visual_loss");
  });

  it("resolves corneal_abrasion vs corneal_ulcer distinctly", () => {
    expect(resolveEyeComplaintContext({ displayName: "Corneal abrasion" }).branches).toContain("corneal_abrasion");
    expect(resolveEyeComplaintContext({ displayName: "Corneal ulcer with hypopyon" }).branches).toContain("corneal_ulcer");
    expect(resolveEyeComplaintContext({ displayName: "Corneal ulcer with hypopyon" }).branches).not.toContain("corneal_abrasion");
  });

  it("resolves acute_glaucoma, retinal_detachment, and crao_crvo branches", () => {
    expect(resolveEyeComplaintContext({ displayName: "Acute angle-closure glaucoma" }).branches).toContain("acute_glaucoma");
    expect(resolveEyeComplaintContext({ displayName: "Retinal detachment, curtain over vision" }).branches).toContain(
      "retinal_detachment",
    );
    expect(resolveEyeComplaintContext({ displayName: "Central retinal artery occlusion" }).branches).toContain("crao_crvo");
  });

  it("resolves optic_neuritis, uveitis, and scleritis branches", () => {
    expect(resolveEyeComplaintContext({ displayName: "Optic neuritis" }).branches).toContain("optic_neuritis");
    expect(resolveEyeComplaintContext({ displayName: "Anterior uveitis" }).branches).toContain("uveitis");
    expect(resolveEyeComplaintContext({ displayName: "Scleritis" }).branches).toContain("scleritis");
  });

  it("resolves orbital_cellulitis distinct from preseptal_cellulitis", () => {
    expect(resolveEyeComplaintContext({ displayName: "Orbital cellulitis" }).branches).toContain("orbital_cellulitis");
    const preseptal = resolveEyeComplaintContext({ displayName: "Preseptal cellulitis" });
    expect(preseptal.branches).toContain("preseptal_cellulitis");
    expect(preseptal.branches).not.toContain("orbital_cellulitis");
  });

  it("resolves contact_lens branch", () => {
    expect(resolveEyeComplaintContext({ displayName: "Red eye, contact lens wearer" }).branches).toContain("contact_lens");
  });

  it("withholds a discharge family for acute glaucoma, RD, CRAO/CRVO, orbital cellulitis, and corneal ulcer", () => {
    expect(resolveEyeComplaintContext({ displayName: "Acute angle-closure glaucoma" }).dischargeFamilyId).toBeNull();
    expect(resolveEyeComplaintContext({ displayName: "Retinal detachment" }).dischargeFamilyId).toBeNull();
    expect(resolveEyeComplaintContext({ displayName: "Central retinal artery occlusion" }).dischargeFamilyId).toBeNull();
    expect(resolveEyeComplaintContext({ displayName: "Orbital cellulitis" }).dischargeFamilyId).toBeNull();
    expect(resolveEyeComplaintContext({ displayName: "Corneal ulcer" }).dischargeFamilyId).toBeNull();
  });

  it("withholds a discharge family for open globe and endophthalmitis red flags regardless of branch", () => {
    expect(resolveEyeComplaintContext({ documentedFlags: ["open globe suspected"] }).dischargeFamilyId).toBeNull();
    expect(
      resolveEyeComplaintContext({ documentedFlags: ["severe pain after eye surgery", "hypopyon after injection"] })
        .dischargeFamilyId,
    ).toBeNull();
  });

  it("allows a follow-up discharge family once follow-up context is documented", () => {
    const followUp = resolveEyeComplaintContext({ displayName: "Acute angle-closure glaucoma, follow-up visit" });
    expect(followUp.dischargeFamilyId).toBe("acute_glaucoma_followup");
  });

  it("routes corneal abrasion, uveitis, scleritis, and preseptal cellulitis to advisory follow-up families", () => {
    expect(resolveEyeComplaintContext({ displayName: "Corneal abrasion" }).dischargeFamilyId).toBe("corneal_abrasion_followup");
    expect(resolveEyeComplaintContext({ displayName: "Anterior uveitis" }).dischargeFamilyId).toBe("uveitis_iritis_followup");
    expect(resolveEyeComplaintContext({ displayName: "Scleritis" }).dischargeFamilyId).toBe("scleritis_followup");
    expect(resolveEyeComplaintContext({ displayName: "Preseptal cellulitis" }).dischargeFamilyId).toBe(
      "preseptal_cellulitis_followup",
    );
  });

  it("withholds a discharge family for contact-lens-associated keratitis but allows it for uncomplicated contact lens irritation", () => {
    const keratitis = resolveEyeComplaintContext({
      documentedFlags: ["contact lens keratitis", "overnight contact lens wear"],
    });
    expect(keratitis.dischargeFamilyId).toBeNull();
    const irritation = resolveEyeComplaintContext({ displayName: "Contact lens related eye irritation" });
    expect(irritation.dischargeFamilyId).toBe("contact_lens_followup");
  });

  it("never assigns a discharge family for optic neuritis", () => {
    expect(resolveEyeComplaintContext({ displayName: "Optic neuritis" }).dischargeFamilyId).toBeNull();
  });

  it("adapts documentation order to prioritize acute glaucoma without changing diagnosis ownership", () => {
    const adapted = adaptEyeComplaintIntel(baseIntel, {
      branches: ["acute_glaucoma", "red_eye"],
      redFlagCategories: [],
    });
    expect(adapted.hpi?.[0]?.toLowerCase()).toContain("acuteglaucoma");
  });
});

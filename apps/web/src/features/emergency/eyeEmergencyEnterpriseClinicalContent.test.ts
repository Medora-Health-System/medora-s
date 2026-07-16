import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { resolveEyeComplaintContext } from "@/lib/eyeComplaintClinicalIntelligence";
import { resolveEyeTraumaContext, isIopDocumentationRequired } from "@/lib/eyeTraumaClinicalIntelligence";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { composeEyeEmergencyDischargeGuidance } from "@/features/emergency/eyeEmergencyCompositeDischargeGuidance";

describe("eyeEmergencyEnterpriseClinicalContent — Phase 11", () => {
  it("exposes exactly one Eye Complaint and one Eye Trauma adaptive template", () => {
    const complaint = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "eye_complaint_adult_v1");
    const trauma = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "eye_trauma_adult_v1");
    expect(complaint).toHaveLength(1);
    expect(trauma).toHaveLength(1);
  });

  it("does not create separate visible templates for abrasion, ulcer, glaucoma, retinal detachment, or open globe", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(corneal_abrasion|corneal_ulcer|acute_glaucoma|retinal_detachment|open_globe)_complaint/.test(t.id)
      )
    ).toBe(false);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "eye_complaint_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "eye_trauma_adult_v1")).toBe(true);
  });

  it("discharge routing distinguishes corneal abrasion from corneal ulcer", () => {
    const abrasion = resolveProviderDischargeTemplateForDiagnosis({
      code: "H16.101A",
      displayName: "Corneal abrasion",
    });
    const ulcer = resolveProviderDischargeTemplateForDiagnosis({
      code: "H16.001",
      displayName: "Corneal ulcer",
    });
    expect(abrasion.template.id).toBe("corneal_abrasion_v1");
    expect(ulcer.template.id).toBe("corneal_ulcer_followup_v1");
    expect(abrasion.template.id).not.toBe(ulcer.template.id);
  });

  it("discharge routing distinguishes corneal ulcer from acute angle-closure glaucoma", () => {
    const ulcer = resolveProviderDischargeTemplateForDiagnosis({
      code: "H16.001",
      displayName: "Corneal ulcer",
    });
    const glaucoma = resolveProviderDischargeTemplateForDiagnosis({
      code: "H40.211",
      displayName: "Acute angle-closure glaucoma",
    });
    expect(ulcer.template.id).toBe("corneal_ulcer_followup_v1");
    expect(glaucoma.template.id).toBe("acute_glaucoma_followup_v1");
    expect(glaucoma.template.id).not.toBe(ulcer.template.id);
  });

  it("routes atraumatic red eye / vision change branches distinctly and withholds discharge family for vision-threatening acute presentations", () => {
    const abrasion = resolveEyeComplaintContext({ code: "H16.1", displayName: "Corneal abrasion" });
    const acuteGlaucoma = resolveEyeComplaintContext({ code: "H40.2", displayName: "Acute angle-closure glaucoma" });
    const acuteGlaucomaFollowUp = resolveEyeComplaintContext({
      code: "H40.2",
      displayName: "Acute angle-closure glaucoma, follow-up recheck",
    });
    expect(abrasion.branches).toContain("corneal_abrasion");
    expect(abrasion.dischargeFamilyId).toBe("corneal_abrasion_followup");
    expect(acuteGlaucoma.branches).toContain("acute_glaucoma");
    expect(acuteGlaucoma.dischargeFamilyId).toBeNull();
    expect(acuteGlaucomaFollowUp.dischargeFamilyId).toBe("acute_glaucoma_followup");
  });

  it("IOP documentation is contraindicated (not required) on open globe and required otherwise", () => {
    const openGlobe = resolveEyeTraumaContext({ code: "S05.20XA", displayName: "Open globe injury" });
    const abrasion = resolveEyeTraumaContext({ code: "S05.00XA", displayName: "Traumatic corneal abrasion" });
    expect(openGlobe.branches).toContain("open_globe");
    expect(isIopDocumentationRequired(openGlobe.branches)).toBe(false);
    expect(openGlobe.dischargeFamilyId).toBeNull();
    expect(isIopDocumentationRequired(abrasion.branches)).toBe(true);
  });

  it("never resolves an automatic discharge family for open globe, retrobulbar hemorrhage, or orbital compartment syndrome", () => {
    const openGlobe = resolveEyeTraumaContext({ code: "S05.20XA", displayName: "Open globe injury" });
    const retrobulbar = resolveEyeTraumaContext({ displayName: "Retrobulbar hemorrhage" });
    const compartment = resolveEyeTraumaContext({ displayName: "Orbital compartment syndrome, tense proptotic orbit" });
    expect(openGlobe.dischargeFamilyId).toBeNull();
    expect(retrobulbar.dischargeFamilyId).toBeNull();
    expect(compartment.dischargeFamilyId).toBeNull();
  });

  it("composite corneal foreign body + corneal abrasion contributes both templates without duplicate return-precaution lines", () => {
    const result = composeEyeEmergencyDischargeGuidance([
      { code: "H16.101A", displayName: "Corneal abrasion", isPrimary: true },
      { displayName: "Foreign body in cornea" },
    ]);
    const templateIds = result.provenance.map((p) => p.templateId);
    expect(templateIds).toEqual(expect.arrayContaining(["corneal_abrasion_v1", "corneal_foreign_body_v1"]));
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase());
    expect(new Set(lines).size).toBe(lines.filter(Boolean).length);
  });
});

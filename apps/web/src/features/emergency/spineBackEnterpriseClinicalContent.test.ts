import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import { composeSpineBackDischargeGuidance } from "./spineBackCompositeDischargeGuidance";
import { asiaIsncsciFoundationStatus } from "@/lib/spineAsiaIsncsciFoundation";

describe("spineBackEnterpriseClinicalContent — Phase 9", () => {
  it("exposes exactly one Back / Neck Pain and one Spinal Trauma / SCI adaptive template", () => {
    const back = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "spine_back_pain_adult_complaint_v1");
    const trauma = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "spinal_trauma_adult_complaint_v1");
    expect(back).toHaveLength(1);
    expect(trauma).toHaveLength(1);
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /cauda_equina_complaint|cervical_strain_complaint|central_cord_complaint|sciatica_complaint/.test(t.id),
      ),
    ).toBe(false);
  });

  it("routes radiculopathy/sciatica away from generic back_pain_v1", () => {
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "M54.3", displayName: "Sciatica" }).template.id).toBe(
      "lumbar_radiculopathy_sciatica_v1",
    );
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "M54.16", displayName: "Radiculopathy, lumbar region" }).template.id).toBe(
      "lumbar_radiculopathy_sciatica_v1",
    );
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "M54.5", displayName: "Low back pain" }).template.id).not.toBe(
      "lumbar_radiculopathy_sciatica_v1",
    );
  });

  it("routes cauda equina to post red-flag family, not routine mechanical back pain", () => {
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "G83.4", displayName: "Cauda equina syndrome" }).template.id).toBe(
      "post_caudal_red_flag_evaluation_v1",
    );
  });

  it("keeps traumatic cervical strain with existing neck-strain trauma ownership", () => {
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "S16.1XXA", displayName: "Strain of muscle at neck level" }).template.id).toBe(
      "trauma_msk_neck_strain_v1",
    );
  });

  it("composes fracture + radiculopathy without duplicating generic back-pain paragraphs", () => {
    const composed = composeSpineBackDischargeGuidance(
      [
        { code: "S32.010A", displayName: "Wedge compression fracture of first lumbar vertebra", isPrimary: true },
        { code: "M54.16", displayName: "Radiculopathy, lumbar region" },
      ],
      { locale: "en" },
    );
    const text = composed.returnPrecautions.toLowerCase();
    expect(composed.provenance.some((p) => p.templateId.includes("compression") || p.templateId.includes("fracture") || p.templateId.includes("radiculopathy"))).toBe(true);
    expect((text.match(/mechanical back pain/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("labels ASIA/ISNCSCI as foundation-only without AIS auto-grade", () => {
    const status = asiaIsncsciFoundationStatus();
    expect(status.certificationStatus).toBe("FOUNDATION_NOT_CERTIFIED");
    expect(status.aisGrade).toBeNull();
  });
});

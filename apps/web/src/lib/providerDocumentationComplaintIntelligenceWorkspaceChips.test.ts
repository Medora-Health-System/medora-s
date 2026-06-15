import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import {
  COMPLAINT_INTEL_IMPRESSION_CHIP_BINDINGS,
  COMPLAINT_INTEL_MDM_CHIP_BINDINGS,
  complaintIntelligenceChipBindingsForTemplate,
  complaintIntelligenceMdmChipBindingsForTemplate,
} from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import { DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

describe("providerDocumentationComplaintIntelligenceWorkspaceChips — MEDUI.ED.MDM.1", () => {
  it("defines gold-standard MDM and impression chip bindings", () => {
    expect(COMPLAINT_INTEL_MDM_CHIP_BINDINGS.map((binding) => binding.intelField)).toEqual([
      "mdmWorkingAssessment",
      "mdmDifferentialSynthesis",
      "mdmDataReviewed",
      "mdmRiskStratification",
      "mdmClinicalRationale",
      "mdmPlanSummary",
    ]);
    expect(COMPLAINT_INTEL_IMPRESSION_CHIP_BINDINGS.map((binding) => binding.intelField)).toEqual([
      "clinicalImpression",
    ]);
  });

  it("maps risk stratification intel chips to clinical rationale workspace field", () => {
    const riskBinding = COMPLAINT_INTEL_MDM_CHIP_BINDINGS.find((binding) => binding.intelField === "mdmRiskStratification");
    expect(riskBinding?.workspaceField).toBe("mdmClinicalRationale");
  });

  it("exposes all gold-standard MDM bindings for ear pain template", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "ear_pain_otitis_complaint_v1") ?? null;
    expect(template?.complaintIntelligence).toEqual(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL);

    const mdmBindings = complaintIntelligenceMdmChipBindingsForTemplate(template);
    expect(mdmBindings.map((binding) => binding.intelField)).toEqual([
      "mdmWorkingAssessment",
      "mdmDifferentialSynthesis",
      "mdmDataReviewed",
      "mdmRiskStratification",
      "mdmClinicalRationale",
      "clinicalImpression",
      "mdmPlanSummary",
    ]);
    expect(complaintIntelligenceChipBindingsForTemplate(template).length).toBe(7);
  });

  it("exposes all gold-standard bindings for ME.2U dehydration template", () => {
    const template =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "dehydration_viral_illness_complaint_v1") ?? null;
    expect(template?.complaintIntelligence).toEqual(DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL);
    expect(complaintIntelligenceMdmChipBindingsForTemplate(template).length).toBe(7);
    expect(complaintIntelligenceChipBindingsForTemplate(template).length).toBe(7);
  });

  it("has workspace title keys in en and fr locales", () => {
    for (const binding of [...COMPLAINT_INTEL_MDM_CHIP_BINDINGS, ...COMPLAINT_INTEL_IMPRESSION_CHIP_BINDINGS]) {
      const key = binding.titleKey.replace("providerDocumentationWorkspace.", "");
      expect(enMessages.providerDocumentationWorkspace[key as keyof typeof enMessages.providerDocumentationWorkspace]).toBeTruthy();
      expect(frMessages.providerDocumentationWorkspace[key as keyof typeof frMessages.providerDocumentationWorkspace]).toBeTruthy();
    }
  });
});

import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES, emptyProviderDocumentationWorkspaceState } from "./providerDocumentationModel";
import {
  CHEST_PAIN_COMPLAINT_INTEL,
} from "./providerDocumentationComplaintIntelligence";
import {
  COMPLAINT_INTEL_MDM_WORKSPACE_GOLD_STANDARD_BINDINGS,
  complaintIntelligenceMdmChipBindingsForTemplate,
  discoverComplaintIntelMdmWorkspaceCoverage,
  discoverTemplatesWithComplaintIntelGoldStandardMdmField,
  toggleComplaintIntelWorkspaceChip,
} from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { buildMdmTemplateDropdownOptions } from "./providerDocumentationMdmTemplateCatalog";
import { filterMdmTemplateOptionsForTemplate } from "./providerDocumentationComplaintStickyNoteGovernance";
import { collectTrackCViolations } from "./providerDocumentationComplaintIntelligenceTrackC";
import { EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import { SORE_THROAT_COMPLAINT_V1_INTEL } from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";
import enMessages from "@/i18n/messages/en";

const ME_2T_GOLD_STANDARD_TEMPLATE_IDS = [
  "ear_pain_otitis_complaint_v1",
  "sinus_symptoms_complaint_v1",
  "sore_throat_complaint_v1",
  "sore_throat_infectious_complaint_v1",
] as const;

function templateById(id: string) {
  return PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id) ?? null;
}

function resolveFragment(fragmentKey: string): string {
  const parts = fragmentKey.split(".");
  let cursor: unknown = enMessages;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") return fragmentKey;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : fragmentKey;
}

describe("providerDocumentationMdmWorkspaceGoldStandard — MEDUI.ED.MDM.1", () => {
  it("defines seven-section gold-standard MDM workspace order", () => {
    expect(COMPLAINT_INTEL_MDM_WORKSPACE_GOLD_STANDARD_BINDINGS.map((binding) => binding.intelField)).toEqual([
      "mdmWorkingAssessment",
      "mdmDifferentialSynthesis",
      "mdmDataReviewed",
      "mdmRiskStratification",
      "mdmClinicalRationale",
      "clinicalImpression",
      "mdmPlanSummary",
    ]);
  });

  it("discovers complaint bundles with risk stratification, impression, and plan intel", () => {
    const riskTemplates = discoverTemplatesWithComplaintIntelGoldStandardMdmField("mdmRiskStratification");
    const impressionTemplates = discoverTemplatesWithComplaintIntelGoldStandardMdmField("clinicalImpression");
    const planTemplates = discoverTemplatesWithComplaintIntelGoldStandardMdmField("mdmPlanSummary");

    for (const templateId of ME_2T_GOLD_STANDARD_TEMPLATE_IDS) {
      expect(riskTemplates).toContain(templateId);
      expect(impressionTemplates).toContain(templateId);
      expect(planTemplates).toContain(templateId);
    }
    expect(riskTemplates).toContain("dehydration_viral_illness_complaint_v1");
  });

  it("renders all seven MDM sections for ME.2T gold-standard templates", () => {
    for (const templateId of ME_2T_GOLD_STANDARD_TEMPLATE_IDS) {
      const template = templateById(templateId);
      const bindings = complaintIntelligenceMdmChipBindingsForTemplate(template);
      expect(bindings.map((binding) => binding.intelField)).toEqual([
        "mdmWorkingAssessment",
        "mdmDifferentialSynthesis",
        "mdmDataReviewed",
        "mdmRiskStratification",
        "mdmClinicalRationale",
        "clinicalImpression",
        "mdmPlanSummary",
      ]);
    }
  });

  it("renders legacy complaint MDM sections without losing existing chips", () => {
    const template = templateById("chest_pain");
    expect(template?.complaintIntelligence).toEqual(CHEST_PAIN_COMPLAINT_INTEL);

    const bindings = complaintIntelligenceMdmChipBindingsForTemplate(template);
    const intelFields = bindings.map((binding) => binding.intelField);
    expect(intelFields).toContain("mdmWorkingAssessment");
    expect(intelFields).toContain("mdmDifferentialSynthesis");
    expect(intelFields).toContain("mdmDataReviewed");
    expect(intelFields).toContain("mdmClinicalRationale");
    expect(intelFields).toContain("mdmPlanSummary");
    expect(intelFields).not.toContain("mdmRiskStratification");
    expect(intelFields).not.toContain("clinicalImpression");
  });

  it("supports click-to-insert for complaint-intel MDM chips", () => {
    const template = templateById("ear_pain_otitis_complaint_v1");
    const bindings = complaintIntelligenceMdmChipBindingsForTemplate(template);
    const workingAssessment = bindings.find((binding) => binding.intelField === "mdmWorkingAssessment");
    expect(workingAssessment).toBeTruthy();

    const fragmentKey = EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmWorkingAssessment?.[0];
    expect(fragmentKey).toBeTruthy();

    const state = emptyProviderDocumentationWorkspaceState();
    const inserted = toggleComplaintIntelWorkspaceChip({
      state,
      binding: workingAssessment!,
      fragmentKey: fragmentKey!,
      resolveFragment,
    });
    const fragment = resolveFragment(fragmentKey!);
    expect(inserted.mdmWorkingAssessment).toBe(fragment);

    const toggledOff = toggleComplaintIntelWorkspaceChip({
      state: { ...state, ...inserted },
      binding: workingAssessment!,
      fragmentKey: fragmentKey!,
      resolveFragment,
    });
    expect(toggledOff.mdmWorkingAssessment).toBe("");
  });

  it("maps risk stratification chips to the clinical rationale workspace field", () => {
    const template = templateById("sore_throat_complaint_v1");
    const riskBinding = complaintIntelligenceMdmChipBindingsForTemplate(template).find(
      (binding) => binding.intelField === "mdmRiskStratification"
    );
    expect(riskBinding?.workspaceField).toBe("mdmClinicalRationale");

    const fragmentKey = SORE_THROAT_COMPLAINT_V1_INTEL.mdmRiskStratification?.[0];
    expect(fragmentKey).toBeTruthy();

    const state = emptyProviderDocumentationWorkspaceState();
    const patch = toggleComplaintIntelWorkspaceChip({
      state,
      binding: riskBinding!,
      fragmentKey: fragmentKey!,
      resolveFragment,
    });
    expect(patch.mdmClinicalRationale).toBe(resolveFragment(fragmentKey!));
  });

  it("preserves governance filtering for MDM dropdown options", () => {
    for (const templateId of ME_2T_GOLD_STANDARD_TEMPLATE_IDS) {
      const template = templateById(templateId);
      const options = buildMdmTemplateDropdownOptions(template);
      const filtered = filterMdmTemplateOptionsForTemplate(templateId, options);
      expect(filtered.length).toBeGreaterThan(0);

      const intelFragment = EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis?.[0];
      if (templateId === "ear_pain_otitis_complaint_v1" && intelFragment) {
        expect(filtered.some((option) => option.fragmentKey === intelFragment)).toBe(true);
      }
    }
  });

  it("keeps ME.2T bundles Track C compliant", () => {
    const bundles = [
      EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL,
      SORE_THROAT_COMPLAINT_V1_INTEL,
    ];
    for (const bundle of bundles) {
      expect(collectTrackCViolations(bundle)).toEqual([]);
    }
  });

  it("exposes workspace bindings for every discovered gold-standard MDM field", () => {
    for (const entry of discoverComplaintIntelMdmWorkspaceCoverage()) {
      if (entry.mdmRiskStratification > 0) {
        expect(entry.workspaceBindings.some((binding) => binding.intelField === "mdmRiskStratification")).toBe(true);
      }
      if (entry.clinicalImpression > 0) {
        expect(entry.workspaceBindings.some((binding) => binding.intelField === "clinicalImpression")).toBe(true);
      }
      if (entry.mdmPlanSummary > 0) {
        expect(entry.workspaceBindings.some((binding) => binding.intelField === "mdmPlanSummary")).toBe(true);
      }
    }
  });
});

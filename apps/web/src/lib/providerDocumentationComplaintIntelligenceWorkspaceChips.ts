/**
 * MEDUI.ED.MDM.1 — Complaint-intelligence chip bindings for provider workspace rendering.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
  type ProviderDocumentationTemplateDefinition,
  type ProviderDocumentationTemplateStringField,
  type ProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";

export type ComplaintIntelligenceChipIntelField = Extract<
  keyof ProviderDocumentationComplaintIntelligence,
  | "mdmWorkingAssessment"
  | "mdmDifferentialSynthesis"
  | "mdmDataReviewed"
  | "mdmRiskStratification"
  | "mdmClinicalRationale"
  | "mdmPlanSummary"
  | "clinicalImpression"
>;

export type ComplaintIntelligenceWorkspaceChipBinding = {
  intelField: ComplaintIntelligenceChipIntelField;
  workspaceField: ProviderDocumentationTemplateStringField;
  titleKey: string;
};

const MDM_WORKING_ASSESSMENT_BINDING: ComplaintIntelligenceWorkspaceChipBinding = {
  intelField: "mdmWorkingAssessment",
  workspaceField: "mdmWorkingAssessment",
  titleKey: "providerDocumentationWorkspace.complaintIntelSectionMdmAssessment",
};

const MDM_DIFFERENTIAL_BINDING: ComplaintIntelligenceWorkspaceChipBinding = {
  intelField: "mdmDifferentialSynthesis",
  workspaceField: "mdmDifferentialSynthesis",
  titleKey: "providerDocumentationWorkspace.complaintIntelSectionDifferential",
};

const MDM_DATA_REVIEWED_BINDING: ComplaintIntelligenceWorkspaceChipBinding = {
  intelField: "mdmDataReviewed",
  workspaceField: "mdmDataReviewed",
  titleKey: "providerDocumentationWorkspace.complaintIntelSectionMdmData",
};

const MDM_RISK_STRATIFICATION_BINDING: ComplaintIntelligenceWorkspaceChipBinding = {
  intelField: "mdmRiskStratification",
  workspaceField: "mdmClinicalRationale",
  titleKey: "providerDocumentationWorkspace.complaintIntelSectionMdmRiskStratification",
};

const MDM_MEDICAL_REASONING_BINDING: ComplaintIntelligenceWorkspaceChipBinding = {
  intelField: "mdmClinicalRationale",
  workspaceField: "mdmClinicalRationale",
  titleKey: "providerDocumentationWorkspace.complaintIntelSectionMdmRationale",
};

const MDM_IMPRESSION_BINDING: ComplaintIntelligenceWorkspaceChipBinding = {
  intelField: "clinicalImpression",
  workspaceField: "clinicalImpression",
  titleKey: "providerDocumentationWorkspace.complaintIntelSectionClinicalImpression",
};

const MDM_PLAN_BINDING: ComplaintIntelligenceWorkspaceChipBinding = {
  intelField: "mdmPlanSummary",
  workspaceField: "mdmPlanSummary",
  titleKey: "providerDocumentationWorkspace.complaintIntelSectionMdmPlan",
};

/** Gold-standard MDM chip groups (excludes impression; use workspace gold-standard order for full stack). */
export const COMPLAINT_INTEL_MDM_CHIP_BINDINGS: ComplaintIntelligenceWorkspaceChipBinding[] = [
  MDM_WORKING_ASSESSMENT_BINDING,
  MDM_DIFFERENTIAL_BINDING,
  MDM_DATA_REVIEWED_BINDING,
  MDM_RISK_STRATIFICATION_BINDING,
  MDM_MEDICAL_REASONING_BINDING,
  MDM_PLAN_BINDING,
];

export const COMPLAINT_INTEL_IMPRESSION_CHIP_BINDINGS: ComplaintIntelligenceWorkspaceChipBinding[] = [
  MDM_IMPRESSION_BINDING,
];

/** Seven-section MDM workspace order: Working Assessment → Plan (impression before plan). */
export const COMPLAINT_INTEL_MDM_WORKSPACE_GOLD_STANDARD_BINDINGS: ComplaintIntelligenceWorkspaceChipBinding[] = [
  MDM_WORKING_ASSESSMENT_BINDING,
  MDM_DIFFERENTIAL_BINDING,
  MDM_DATA_REVIEWED_BINDING,
  MDM_RISK_STRATIFICATION_BINDING,
  MDM_MEDICAL_REASONING_BINDING,
  MDM_IMPRESSION_BINDING,
  MDM_PLAN_BINDING,
];

export type ComplaintIntelGoldStandardMdmField =
  | "mdmRiskStratification"
  | "clinicalImpression"
  | "mdmPlanSummary";

export type ComplaintIntelMdmWorkspaceDiscovery = {
  templateId: string;
  hasComplaintIntelligence: boolean;
  mdmWorkingAssessment: number;
  mdmDifferentialSynthesis: number;
  mdmDataReviewed: number;
  mdmRiskStratification: number;
  mdmClinicalRationale: number;
  clinicalImpression: number;
  mdmPlanSummary: number;
  workspaceBindings: ComplaintIntelligenceWorkspaceChipBinding[];
};

function bindingsWithIntelForTemplate(
  template: ProviderDocumentationTemplateDefinition | null,
  bindings: ComplaintIntelligenceWorkspaceChipBinding[]
): ComplaintIntelligenceWorkspaceChipBinding[] {
  if (!template?.complaintIntelligence) return [];
  const intel = template.complaintIntelligence;
  return bindings.filter((binding) => (intel[binding.intelField]?.length ?? 0) > 0);
}

export function complaintIntelligenceChipBindingsForTemplate(
  template: ProviderDocumentationTemplateDefinition | null
): ComplaintIntelligenceWorkspaceChipBinding[] {
  return bindingsWithIntelForTemplate(template, COMPLAINT_INTEL_MDM_WORKSPACE_GOLD_STANDARD_BINDINGS);
}

export function complaintIntelligenceMdmChipBindingsForTemplate(
  template: ProviderDocumentationTemplateDefinition | null
): ComplaintIntelligenceWorkspaceChipBinding[] {
  return bindingsWithIntelForTemplate(template, COMPLAINT_INTEL_MDM_WORKSPACE_GOLD_STANDARD_BINDINGS);
}

export function complaintIntelligenceImpressionChipBindingsForTemplate(
  template: ProviderDocumentationTemplateDefinition | null
): ComplaintIntelligenceWorkspaceChipBinding[] {
  return bindingsWithIntelForTemplate(template, COMPLAINT_INTEL_IMPRESSION_CHIP_BINDINGS);
}

export function discoverComplaintIntelMdmWorkspaceCoverage(): ComplaintIntelMdmWorkspaceDiscovery[] {
  return PROVIDER_DOCUMENTATION_TEMPLATES.filter((template) => template.complaintIntelligence).map((template) => {
    const intel = template.complaintIntelligence!;
    return {
      templateId: template.id,
      hasComplaintIntelligence: true,
      mdmWorkingAssessment: intel.mdmWorkingAssessment?.length ?? 0,
      mdmDifferentialSynthesis: intel.mdmDifferentialSynthesis?.length ?? 0,
      mdmDataReviewed: intel.mdmDataReviewed?.length ?? 0,
      mdmRiskStratification: intel.mdmRiskStratification?.length ?? 0,
      mdmClinicalRationale: intel.mdmClinicalRationale?.length ?? 0,
      clinicalImpression: intel.clinicalImpression?.length ?? 0,
      mdmPlanSummary: intel.mdmPlanSummary?.length ?? 0,
      workspaceBindings: complaintIntelligenceMdmChipBindingsForTemplate(template),
    };
  });
}

export function discoverTemplatesWithComplaintIntelGoldStandardMdmField(
  field: ComplaintIntelGoldStandardMdmField
): string[] {
  return discoverComplaintIntelMdmWorkspaceCoverage()
    .filter((entry) => {
      if (field === "mdmRiskStratification") return entry.mdmRiskStratification > 0;
      if (field === "clinicalImpression") return entry.clinicalImpression > 0;
      return entry.mdmPlanSummary > 0;
    })
    .map((entry) => entry.templateId);
}

export function toggleComplaintIntelWorkspaceChip({
  state,
  binding,
  fragmentKey,
  resolveFragment,
}: {
  state: ProviderDocumentationWorkspaceState;
  binding: ComplaintIntelligenceWorkspaceChipBinding;
  fragmentKey: string;
  resolveFragment: (fragmentKey: string) => string;
}): Partial<ProviderDocumentationWorkspaceState> {
  const field = binding.workspaceField;
  const current = String(state[field] ?? "");
  const next = toggleDocumentationFragment(current, resolveFragment(fragmentKey));
  return { [field]: next };
}

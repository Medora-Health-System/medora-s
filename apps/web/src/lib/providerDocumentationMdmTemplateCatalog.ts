import {
  isAmbulatoryHiddenMdmPresentationField,
  resolveAmbulatoryHighValueMdmTargetField,
  resolveMdmHighValueFragmentKey,
  shouldHideAmbulatoryRoutineMedEvalMdmChromeFields,
  type D4c7aProviderDocumentationEncounterMode,
} from "@medora/shared";
import type {
  ProviderDocumentationEncounterMode,
  ProviderDocumentationTemplateDefinition,
  ProviderDocumentationTemplateStringField,
  ProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";
import { toggleDocumentationFragment } from "./providerDocumentationModel";
import { isDocumentationChipSelected } from "./providerDocumentationChipSelection";
import { filterMdmTemplateOptionsForTemplate } from "./providerDocumentationComplaintStickyNoteGovernance";

export type MdmTemplateOptionGroup = "highValue" | "existing";

export type MdmTemplateOption = {
  id: string;
  group: MdmTemplateOptionGroup;
  /** i18n key for dropdown label (high-value) or fragment key (existing). */
  labelKey: string;
  field: ProviderDocumentationTemplateStringField;
  fragmentKey: string;
  highValue?: boolean;
};

export const MDM_CHIP_GROUPS: Array<{
  field: ProviderDocumentationTemplateStringField;
  chips: Array<{ labelKey: string; fragmentKey: string }>;
}> = [
  {
    field: "mdmWorkingAssessment",
    chips: ["waUndifferentiated", "waInfectious", "waCardiopulmonary", "waNeurologic", "waAbdominal", "waTrauma", "waMedIntox"].map(
      (key) => ({ labelKey: `erMseMdmChips.${key}`, fragmentKey: `erMseMdmChips.${key}` })
    ),
  },
  {
    field: "mdmPlanSummary",
    chips: ["planLabs", "planImaging", "planEcg", "planMeds", "planReassess", "planSdM"].map((key) => ({
      labelKey: `erMseMdmChips.${key}`,
      fragmentKey: `erMseMdmChips.${key}`,
    })),
  },
  {
    field: "mdmAdmitObserveDischarge",
    chips: ["dispDcCriteria", "dispObs", "dispAdmit", "dispTransfer", "dispReturnPrecautions"].map((key) => ({
      labelKey: `erMseMdmChips.${key}`,
      fragmentKey: `erMseMdmChips.${key}`,
    })),
  },
];

const MDM_TEMPLATE_FIELD_KEYS: ProviderDocumentationTemplateStringField[] = [
  "mdmWorkingAssessment",
  "mdmDataReviewed",
  "mdmPlanSummary",
  "mdmImmediateActionsRationale",
  "mdmConsultsDiscussed",
  "mdmAdmitObserveDischarge",
];

const MDM_COMPLAINT_INTEL_FIELDS: Array<{
  intelField: keyof import("./providerDocumentationComplaintIntelligence").ProviderDocumentationComplaintIntelligence;
  workspaceField: ProviderDocumentationTemplateStringField;
}> = [
  { intelField: "mdmWorkingAssessment", workspaceField: "mdmWorkingAssessment" },
  { intelField: "mdmDifferentialSynthesis", workspaceField: "mdmDifferentialSynthesis" },
  { intelField: "mdmDataReviewed", workspaceField: "mdmDataReviewed" },
  { intelField: "mdmRiskStratification", workspaceField: "mdmClinicalRationale" },
  { intelField: "mdmClinicalRationale", workspaceField: "mdmClinicalRationale" },
  { intelField: "clinicalImpression", workspaceField: "clinicalImpression" },
  { intelField: "mdmPlanSummary", workspaceField: "mdmPlanSummary" },
  { intelField: "mdmImmediateActionsRationale", workspaceField: "mdmImmediateActionsRationale" },
  { intelField: "mdmAdmitObserveDischarge", workspaceField: "mdmAdmitObserveDischarge" },
];

export const HIGH_VALUE_MDM_TEMPLATES: Array<{
  id: string;
  labelKey: string;
  fragmentKey: string;
  field: ProviderDocumentationTemplateStringField;
}> = [
  {
    id: "hv-standard-mdm",
    labelKey: "providerDocumentationWorkspace.mdmTemplateStandardMdm",
    fragmentKey: "providerDocumentationMdmHighValue.standardMdm",
    field: "mdmClinicalRationale",
  },
  {
    id: "hv-patient-concern",
    labelKey: "providerDocumentationWorkspace.mdmTemplatePatientConcern",
    fragmentKey: "providerDocumentationMdmHighValue.patientConcern",
    field: "mdmWorkingAssessment",
  },
  {
    id: "hv-ekg-normal",
    labelKey: "providerDocumentationWorkspace.mdmTemplateEkgNormal",
    fragmentKey: "providerDocumentationMdmHighValue.ekgNormal",
    field: "mdmDataReviewed",
  },
  {
    id: "hv-diagnostic-studies-review",
    labelKey: "providerDocumentationWorkspace.mdmTemplateDiagnosticStudiesReview",
    fragmentKey: "providerDocumentationMdmHighValue.diagnosticStudiesReview",
    field: "mdmClinicalRationale",
  },
  {
    id: "hv-smoking-cessation",
    labelKey: "providerDocumentationWorkspace.mdmTemplateSmokingCessation",
    fragmentKey: "providerDocumentationMdmHighValue.smokingCessation",
    field: "mdmPlanSummary",
  },
  {
    id: "hv-pmp-reviewed",
    labelKey: "providerDocumentationWorkspace.mdmTemplatePmpReviewed",
    fragmentKey: "providerDocumentationMdmHighValue.pmpReviewed",
    field: "mdmDataReviewed",
  },
];

export function buildMdmTemplateDropdownOptions(
  template: ProviderDocumentationTemplateDefinition | null,
  encounterMode: ProviderDocumentationEncounterMode | D4c7aProviderDocumentationEncounterMode = "ED"
): MdmTemplateOption[] {
  const highValue: MdmTemplateOption[] = HIGH_VALUE_MDM_TEMPLATES.map((item) => {
    const field = resolveAmbulatoryHighValueMdmTargetField({
      templateId: item.id,
      defaultField: item.field,
      encounterMode,
    }) as ProviderDocumentationTemplateStringField;
    const fragmentKey = resolveMdmHighValueFragmentKey({
      fragmentKey: item.fragmentKey,
      encounterMode,
    });
    return {
      id: item.id,
      group: "highValue" as const,
      labelKey: item.labelKey,
      field,
      fragmentKey,
      highValue: true,
    };
  });

  const hideAmbulatoryMdmChrome = shouldHideAmbulatoryRoutineMedEvalMdmChromeFields({
    encounterMode,
  });

  const existing: MdmTemplateOption[] = [];
  const seen = new Set<string>();

  const add = (field: ProviderDocumentationTemplateStringField, fragmentKey: string) => {
    if (hideAmbulatoryMdmChrome && isAmbulatoryHiddenMdmPresentationField(field)) return;
    const dedupeKey = `${field}::${fragmentKey}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    existing.push({
      id: dedupeKey,
      group: "existing",
      labelKey: fragmentKey,
      field,
      fragmentKey,
    });
  };

  if (template?.guidance?.mdmClinicalRationale?.length) {
    for (const fragmentKey of template.guidance.mdmClinicalRationale) {
      add("mdmClinicalRationale", fragmentKey);
    }
  }
  if (template?.guidance?.mdmDifferentialSynthesis?.length) {
    for (const fragmentKey of template.guidance.mdmDifferentialSynthesis) {
      add("mdmDifferentialSynthesis", fragmentKey);
    }
  }

  for (const field of MDM_TEMPLATE_FIELD_KEYS) {
    for (const fragmentKey of template?.fields[field] ?? []) {
      add(field, fragmentKey);
    }
  }

  for (const { intelField, workspaceField } of MDM_COMPLAINT_INTEL_FIELDS) {
    const fragments = template?.complaintIntelligence?.[intelField];
    if (!Array.isArray(fragments)) continue;
    for (const fragmentKey of fragments) {
      add(workspaceField, fragmentKey);
    }
  }

  for (const group of MDM_CHIP_GROUPS) {
    for (const chip of group.chips) {
      add(group.field, chip.fragmentKey);
    }
  }

  return filterMdmTemplateOptionsForTemplate(template?.id ?? null, [...highValue, ...existing]);
}

export function applyMdmTemplatePendingSelections({
  value,
  options,
  pendingIds,
  resolveFragment,
}: {
  value: ProviderDocumentationWorkspaceState;
  options: MdmTemplateOption[];
  pendingIds: ReadonlySet<string>;
  resolveFragment: (fragmentKey: string) => string;
}): Partial<ProviderDocumentationWorkspaceState> {
  let workingValue = { ...value };
  const patch: Partial<ProviderDocumentationWorkspaceState> = {};

  for (const option of options) {
    const field = option.field;
    const fragment = resolveFragment(option.fragmentKey);
    const current = String(workingValue[field] ?? "");
    const isApplied = isDocumentationChipSelected(current, fragment);
    const isPendingChecked = pendingIds.has(option.id);

    if (isPendingChecked && !isApplied) {
      const next = toggleDocumentationFragment(current, fragment);
      workingValue = { ...workingValue, [field]: next };
      patch[field] = next;
    } else if (!isPendingChecked && isApplied) {
      const next = toggleDocumentationFragment(current, fragment);
      workingValue = { ...workingValue, [field]: next };
      patch[field] = next;
    }
  }

  return patch;
}

export function resolveAppliedMdmTemplateOptionIds({
  options,
  value,
  resolveFragment,
}: {
  options: MdmTemplateOption[];
  value: ProviderDocumentationWorkspaceState;
  resolveFragment: (fragmentKey: string) => string;
}): Set<string> {
  const applied = new Set<string>();
  for (const option of options) {
    const fieldValue = value[option.field];
    if (typeof fieldValue !== "string") continue;
    if (isDocumentationChipSelected(fieldValue, resolveFragment(option.fragmentKey))) {
      applied.add(option.id);
    }
  }
  return applied;
}

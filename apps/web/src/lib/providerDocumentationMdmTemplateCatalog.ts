import type {
  ProviderDocumentationTemplateDefinition,
  ProviderDocumentationTemplateStringField,
} from "./providerDocumentationModel";

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

const MDM_COMPLAINT_INTEL_FIELDS = [
  "mdmWorkingAssessment",
  "mdmDifferentialSynthesis",
  "mdmDataReviewed",
  "mdmClinicalRationale",
  "mdmPlanSummary",
  "mdmImmediateActionsRationale",
  "mdmAdmitObserveDischarge",
] as const;

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
  template: ProviderDocumentationTemplateDefinition | null
): MdmTemplateOption[] {
  const highValue: MdmTemplateOption[] = HIGH_VALUE_MDM_TEMPLATES.map((item) => ({
    id: item.id,
    group: "highValue",
    labelKey: item.labelKey,
    field: item.field,
    fragmentKey: item.fragmentKey,
    highValue: true,
  }));

  const existing: MdmTemplateOption[] = [];
  const seen = new Set<string>();

  const add = (field: ProviderDocumentationTemplateStringField, fragmentKey: string) => {
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

  for (const field of MDM_COMPLAINT_INTEL_FIELDS) {
    for (const fragmentKey of template?.complaintIntelligence?.[field] ?? []) {
      add(field, fragmentKey);
    }
  }

  for (const group of MDM_CHIP_GROUPS) {
    for (const chip of group.chips) {
      add(group.field, chip.fragmentKey);
    }
  }

  return [...highValue, ...existing];
}

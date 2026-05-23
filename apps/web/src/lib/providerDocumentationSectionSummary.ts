import type { ProviderDocumentationExamSectionId, ProviderDocumentationWorkspaceState } from "./providerDocumentationModel";

export type ProviderDocumentationAccordionSectionId =
  | "presentation"
  | "hpi"
  | "ros"
  | "physicalExam"
  | "mdm"
  | "impressionPlan"
  | "actions";

export const PROVIDER_DOCUMENTATION_ACCORDION_SECTION_IDS: ProviderDocumentationAccordionSectionId[] = [
  "presentation",
  "hpi",
  "ros",
  "physicalExam",
  "mdm",
  "impressionPlan",
  "actions",
];

export type ProviderDocumentationDictationFocusSectionId =
  | "hpi"
  | "ros"
  | "physicalExam"
  | "mdm"
  | "impression"
  | "plan";

export const DICTATION_FOCUS_TO_ACCORDION: Record<
  ProviderDocumentationDictationFocusSectionId,
  ProviderDocumentationAccordionSectionId
> = {
  hpi: "hpi",
  ros: "ros",
  physicalExam: "physicalExam",
  mdm: "mdm",
  impression: "impressionPlan",
  plan: "impressionPlan",
};

export function countNonEmptyText(...values: Array<string | undefined | null>): number {
  return values.filter((value) => typeof value === "string" && value.trim().length > 0).length;
}

export function summarizeDocumentationText(text: string, maxLength = 72): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}…`;
}

export function joinSummaryParts(parts: string[], maxLength = 72): string {
  return summarizeDocumentationText(parts.map((part) => part.trim()).filter(Boolean).join("; "), maxLength);
}

const EXAM_SECTION_SHORT_LABELS: Record<ProviderDocumentationExamSectionId, string> = {
  general: "General",
  heent: "HEENT",
  cardiovascular: "Cardiovascular",
  respiratory: "Respiratory",
  abdomen: "Abdomen",
  neuroPsych: "Neuro",
  musculoskeletal: "MSK",
  skin: "Skin",
  reassessment: "Reassessment",
};

export function providerDocumentationAccordionSummaries(state: ProviderDocumentationWorkspaceState): Record<
  ProviderDocumentationAccordionSectionId,
  string
> {
  const examSystems = (Object.entries(state.physicalExam) as Array<[ProviderDocumentationExamSectionId, string]>)
    .filter(([, text]) => text.trim())
    .map(([sectionId]) => EXAM_SECTION_SHORT_LABELS[sectionId]);

  const mdmParts = [
    state.mdmWorkingAssessment,
    state.mdmDifferentialSynthesis,
    state.mdmDataReviewed,
    state.mdmClinicalRationale,
    state.mdmPlanSummary,
  ].filter((part) => part.trim());

  const planParts = [state.clinicalImpression, state.treatmentPlan, state.followUpDisposition, state.providerAddendum].filter(
    (part) => part.trim()
  );

  return {
    presentation: summarizeDocumentationText(state.chiefComplaint || state.reasonForVisit),
    hpi: joinSummaryParts([state.chiefComplaint, state.hpi].filter(Boolean)),
    ros: joinSummaryParts([
      state.rosFocusedImpression,
      state.rosImportantPositives,
      state.rosImportantNegatives,
      state.rosRedFlags,
    ]),
    physicalExam: examSystems.length ? examSystems.join(", ") : "",
    mdm: mdmParts.length
      ? joinSummaryParts([mdmParts[0] ?? "", state.mdmRiskLevel ? `Risk ${state.mdmRiskLevel}` : ""])
      : "",
    impressionPlan: joinSummaryParts(planParts),
    actions: "",
  };
}

export function providerDocumentationAccordionSelectedCounts(state: ProviderDocumentationWorkspaceState): Record<
  ProviderDocumentationAccordionSectionId,
  number
> {
  return {
    presentation: countNonEmptyText(state.chiefComplaint, state.reasonForVisit),
    hpi: countNonEmptyText(state.hpi),
    ros: countNonEmptyText(
      state.rosFocusedImpression,
      state.rosImportantPositives,
      state.rosImportantNegatives,
      state.rosRedFlags
    ),
    physicalExam: countNonEmptyText(...Object.values(state.physicalExam)),
    mdm: countNonEmptyText(
      state.mdmWorkingAssessment,
      state.mdmDifferentialSynthesis,
      state.mdmDataReviewed,
      state.mdmClinicalRationale,
      state.mdmPlanSummary,
      state.mdmImmediateActionsRationale,
      state.mdmConsultsDiscussed,
      state.mdmAdmitObserveDischarge,
      state.mdmRiskLevel
    ),
    impressionPlan: countNonEmptyText(
      state.clinicalImpression,
      state.treatmentPlan,
      state.followUpDisposition,
      state.providerAddendum
    ),
    actions: 0,
  };
}

export function defaultExpandedAccordionSections(input: {
  missingSectionIds: string[];
}): ProviderDocumentationAccordionSectionId[] {
  const expanded: ProviderDocumentationAccordionSectionId[] = [];
  if (input.missingSectionIds.includes("chiefComplaintHpi")) {
    expanded.push("presentation", "hpi");
  }
  if (input.missingSectionIds.includes("ros")) expanded.push("ros");
  if (input.missingSectionIds.includes("physicalExam")) expanded.push("physicalExam");
  if (input.missingSectionIds.includes("mdm")) expanded.push("mdm");
  if (input.missingSectionIds.includes("impression") || input.missingSectionIds.includes("plan")) {
    expanded.push("impressionPlan");
  }
  if (!expanded.length) expanded.push("hpi");
  return expanded;
}

export function accordionSectionsToExpandForDictation(
  sectionId: ProviderDocumentationDictationFocusSectionId,
  targetId?: string | null
): ProviderDocumentationAccordionSectionId[] {
  const primary = DICTATION_FOCUS_TO_ACCORDION[sectionId];
  const sections: ProviderDocumentationAccordionSectionId[] = [primary];
  if (sectionId === "hpi" && targetId === "provider-documentation-chief-complaint") {
    sections.unshift("presentation");
  }
  return sections;
}

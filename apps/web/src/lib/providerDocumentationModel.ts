export type ProviderDocumentationEncounterMode = "ED" | "OBSERVATION";

export type ProviderDocumentationDocumentType =
  | "INITIAL_PROVIDER_NOTE"
  | "OBSERVATION_PROVIDER_PROGRESS_NOTE";

export const PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE =
  "PROVIDER_DOCUMENTATION_WORKSPACE" as const;

export const PROVIDER_DOCUMENTATION_NAMESPACE_KEY = "erProviderMseV1" as const;

export type ProviderDocumentationMetadata = {
  encounterMode: ProviderDocumentationEncounterMode;
  documentType: ProviderDocumentationDocumentType;
  savedAt: string;
  savedBy: string;
  source: typeof PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE;
};

export type ProviderDocumentationExamSectionId =
  | "general"
  | "heent"
  | "cardiovascular"
  | "respiratory"
  | "abdomen"
  | "neuroPsych"
  | "musculoskeletal"
  | "skin";

export type ProviderDocumentationRiskLevel = "" | "Low" | "Moderate" | "High";

export type ProviderDocumentationWorkspaceState = {
  reasonForVisit: string;
  chiefComplaint: string;
  hpi: string;
  rosFocusedImpression: string;
  rosImportantPositives: string;
  rosImportantNegatives: string;
  rosRedFlags: string;
  physicalExam: Record<ProviderDocumentationExamSectionId, string>;
  mdmWorkingAssessment: string;
  mdmDifferentialSynthesis: string;
  mdmDataReviewed: string;
  mdmRiskLevel: ProviderDocumentationRiskLevel;
  mdmClinicalRationale: string;
  mdmPlanSummary: string;
  mdmImmediateActionsRationale: string;
  mdmConsultsDiscussed: string;
  mdmAdmitObserveDischarge: string;
  clinicalImpression: string;
  treatmentPlan: string;
  followUpDisposition: string;
  providerAddendum: string;
};

export type ProviderDocumentationSavePayload = {
  nursingAssessment: Record<string, unknown>;
  visitReason: string | null;
  clinicianImpression: string | null;
  treatmentPlan: string | null;
};

export const PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS: ProviderDocumentationExamSectionId[] = [
  "general",
  "heent",
  "cardiovascular",
  "respiratory",
  "abdomen",
  "neuroPsych",
  "musculoskeletal",
  "skin",
];

export const PROVIDER_DOCUMENTATION_EXAM_FIELD_TO_LEGACY_KEY: Record<
  ProviderDocumentationExamSectionId,
  string
> = {
  general: "examGeneralAppearance",
  heent: "examHeent",
  cardiovascular: "examCardiac",
  respiratory: "examRespiratory",
  abdomen: "examAbdomen",
  neuroPsych: "examNeuroMental",
  musculoskeletal: "examMusculoskeletal",
  skin: "examSkin",
};

export function documentTypeForEncounterMode(
  encounterMode: ProviderDocumentationEncounterMode
): ProviderDocumentationDocumentType {
  return encounterMode === "ED"
    ? "INITIAL_PROVIDER_NOTE"
    : "OBSERVATION_PROVIDER_PROGRESS_NOTE";
}

export function providerDocumentationTitleKey(
  encounterMode: ProviderDocumentationEncounterMode
): string {
  return encounterMode === "ED"
    ? "providerDocumentationWorkspace.titleEd"
    : "providerDocumentationWorkspace.titleObservation";
}

export function providerDocumentationTimelineLabel(
  encounterMode: ProviderDocumentationEncounterMode
): string {
  return encounterMode === "ED"
    ? "ED provider documentation saved"
    : "Observation provider progress note saved";
}

export function emptyProviderDocumentationWorkspaceState(): ProviderDocumentationWorkspaceState {
  return {
    reasonForVisit: "",
    chiefComplaint: "",
    hpi: "",
    rosFocusedImpression: "",
    rosImportantPositives: "",
    rosImportantNegatives: "",
    rosRedFlags: "",
    physicalExam: {
      general: "",
      heent: "",
      cardiovascular: "",
      respiratory: "",
      abdomen: "",
      neuroPsych: "",
      musculoskeletal: "",
      skin: "",
    },
    mdmWorkingAssessment: "",
    mdmDifferentialSynthesis: "",
    mdmDataReviewed: "",
    mdmRiskLevel: "",
    mdmClinicalRationale: "",
    mdmPlanSummary: "",
    mdmImmediateActionsRationale: "",
    mdmConsultsDiscussed: "",
    mdmAdmitObserveDischarge: "",
    clinicalImpression: "",
    treatmentPlan: "",
    followUpDisposition: "",
    providerAddendum: "",
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeFragment(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function appendDocumentationFragment(current: string, fragment: string): string {
  const clean = normalizeFragment(fragment);
  if (!clean) return current;
  const currentTrimmed = current.trim();
  if (!currentTrimmed) return clean;
  const parts = currentTrimmed
    .split(/\s*;\s*/u)
    .map((p) => normalizeFragment(p))
    .filter(Boolean);
  const alreadyPresent = parts.some((p) => p.toLocaleLowerCase() === clean.toLocaleLowerCase());
  if (alreadyPresent) return current;
  return `${currentTrimmed}; ${clean}`;
}

export function hydrateProviderDocumentationWorkspaceState(input: {
  encounter?: {
    visitReason?: string | null;
    chiefComplaint?: string | null;
    clinicianImpression?: string | null;
    providerNote?: string | null;
    treatmentPlan?: string | null;
    nursingAssessment?: unknown;
  } | null;
}): ProviderDocumentationWorkspaceState {
  const state = emptyProviderDocumentationWorkspaceState();
  const encounter = input.encounter;
  const nursing = asObject(encounter?.nursingAssessment);
  const stored = asObject(nursing?.[PROVIDER_DOCUMENTATION_NAMESPACE_KEY]);
  const legacyPhysicianEval = asObject(nursing?.physicianEvalV1);

  state.reasonForVisit = str(encounter?.visitReason);
  state.chiefComplaint =
    str(stored?.chiefConcern) || str(encounter?.chiefComplaint) || str(encounter?.visitReason);
  state.hpi = str(stored?.hpiNarrative) || str(legacyPhysicianEval?.hpi);
  state.rosFocusedImpression = str(stored?.focusedImpression);
  state.rosImportantPositives = str(stored?.importantPositives);
  state.rosImportantNegatives = str(stored?.importantNegatives);
  state.rosRedFlags = str(stored?.redFlagsText);
  state.mdmWorkingAssessment = str(stored?.mdmWorkingAssessment);
  state.mdmDifferentialSynthesis =
    str(stored?.differentialAssessmentText) || str(legacyPhysicianEval?.mdm);
  state.mdmDataReviewed = str(stored?.mdmDataReviewed);
  state.mdmRiskLevel = riskLevelFromUnknown(stored?.mdmRiskLevel);
  state.mdmClinicalRationale = str(stored?.mdmClinicalRationale);
  state.mdmPlanSummary = str(stored?.mdmPlanSummary);
  state.mdmImmediateActionsRationale = str(stored?.mdmImmediateActionsRationale);
  state.mdmConsultsDiscussed = str(stored?.mdmConsultsDiscussed);
  state.mdmAdmitObserveDischarge = str(stored?.mdmAdmitObserveDischarge);
  state.clinicalImpression =
    str(stored?.clinicalImpression) ||
    str(encounter?.clinicianImpression) ||
    str(encounter?.providerNote);
  state.treatmentPlan = str(stored?.treatmentPlan) || str(encounter?.treatmentPlan);
  state.followUpDisposition = str(stored?.followUpDisposition);
  state.providerAddendum = str(stored?.mdmProviderAddendum) || str(stored?.providerAddendum);

  const legacyExam = str(legacyPhysicianEval?.physicalExam);
  for (const sectionId of PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS) {
    const legacyKey = PROVIDER_DOCUMENTATION_EXAM_FIELD_TO_LEGACY_KEY[sectionId];
    state.physicalExam[sectionId] = str(stored?.[legacyKey]);
  }
  if (legacyExam && PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.every((id) => !state.physicalExam[id])) {
    state.physicalExam.general = legacyExam;
  }

  return state;
}

function riskLevelFromUnknown(value: unknown): ProviderDocumentationRiskLevel {
  if (value === "Low" || value === "Moderate" || value === "High") return value;
  return "";
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function joinNonEmpty(values: string[], separator = "\n\n"): string {
  return values.map((v) => v.trim()).filter(Boolean).join(separator);
}

export function providerDocumentationStateHasContent(
  state: ProviderDocumentationWorkspaceState
): boolean {
  return Boolean(
    state.reasonForVisit.trim() ||
      state.chiefComplaint.trim() ||
      state.hpi.trim() ||
      state.rosFocusedImpression.trim() ||
      state.rosImportantPositives.trim() ||
      state.rosImportantNegatives.trim() ||
      state.rosRedFlags.trim() ||
      PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.some((id) => state.physicalExam[id].trim()) ||
      state.mdmWorkingAssessment.trim() ||
      state.mdmDifferentialSynthesis.trim() ||
      state.mdmDataReviewed.trim() ||
      state.mdmRiskLevel ||
      state.mdmClinicalRationale.trim() ||
      state.mdmPlanSummary.trim() ||
      state.mdmImmediateActionsRationale.trim() ||
      state.mdmConsultsDiscussed.trim() ||
      state.mdmAdmitObserveDischarge.trim() ||
      state.clinicalImpression.trim() ||
      state.treatmentPlan.trim() ||
      state.followUpDisposition.trim() ||
      state.providerAddendum.trim()
  );
}

export function buildProviderDocumentationMetadata(input: {
  encounterMode: ProviderDocumentationEncounterMode;
  savedAt: string;
  savedBy: string;
}): ProviderDocumentationMetadata {
  return {
    encounterMode: input.encounterMode,
    documentType: documentTypeForEncounterMode(input.encounterMode),
    savedAt: input.savedAt,
    savedBy: input.savedBy,
    source: PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE,
  };
}

export function buildProviderDocumentationSavePayload(input: {
  previousNursingAssessment: unknown;
  state: ProviderDocumentationWorkspaceState;
  metadata: ProviderDocumentationMetadata;
}): ProviderDocumentationSavePayload {
  const previous = asObject(input.previousNursingAssessment) ?? {};
  const nursingAssessment: Record<string, unknown> = { ...previous };
  const s = input.state;
  const stored: Record<string, unknown> = {
    chiefConcern: s.chiefComplaint.trim(),
    hpiNarrative: s.hpi.trim(),
    onsetTimingContext: "",
    associatedSymptoms: "",
    severityKeyConcern: "",
    focusedImpression: s.rosFocusedImpression.trim(),
    importantPositives: s.rosImportantPositives.trim(),
    importantNegatives: s.rosImportantNegatives.trim(),
    redFlagsText: s.rosRedFlags.trim(),
    differentialAssessmentText: s.mdmDifferentialSynthesis.trim(),
    examGeneralAppearance: s.physicalExam.general.trim(),
    examNeuroMental: s.physicalExam.neuroPsych.trim(),
    examHeent: s.physicalExam.heent.trim(),
    examCardiac: s.physicalExam.cardiovascular.trim(),
    examRespiratory: s.physicalExam.respiratory.trim(),
    examAbdomen: s.physicalExam.abdomen.trim(),
    examMusculoskeletal: s.physicalExam.musculoskeletal.trim(),
    examSkin: s.physicalExam.skin.trim(),
    examPsychBehavior: "",
    examReassessmentExtra: "",
    mdmWorkingAssessment: s.mdmWorkingAssessment.trim(),
    mdmPlanSummary: s.mdmPlanSummary.trim(),
    mdmImmediateActionsRationale: s.mdmImmediateActionsRationale.trim(),
    mdmConsultsDiscussed: s.mdmConsultsDiscussed.trim(),
    mdmAdmitObserveDischarge: s.mdmAdmitObserveDischarge.trim(),
    mdmProviderAddendum: s.providerAddendum.trim(),
    mdmDataReviewed: s.mdmDataReviewed.trim(),
    mdmRiskLevel: s.mdmRiskLevel,
    mdmClinicalRationale: s.mdmClinicalRationale.trim(),
    clinicalImpression: s.clinicalImpression.trim(),
    treatmentPlan: s.treatmentPlan.trim(),
    followUpDisposition: s.followUpDisposition.trim(),
    signature: {
      savedAt: input.metadata.savedAt,
      savedByDisplayName: input.metadata.savedBy,
    },
    workspaceMetadata: input.metadata,
  };

  if (providerDocumentationStateHasContent(s)) {
    nursingAssessment[PROVIDER_DOCUMENTATION_NAMESPACE_KEY] = stored;
  } else {
    delete nursingAssessment[PROVIDER_DOCUMENTATION_NAMESPACE_KEY];
  }

  const physicianEvalV1: Record<string, string> = {};
  if (s.hpi.trim()) physicianEvalV1.hpi = s.hpi.trim();
  const ros = joinNonEmpty([
    s.rosFocusedImpression,
    s.rosImportantPositives,
    s.rosImportantNegatives,
    s.rosRedFlags,
  ]);
  if (ros) physicianEvalV1.ros = ros;
  const physicalExam = PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.map((id) => s.physicalExam[id])
    .map((v) => v.trim())
    .filter(Boolean)
    .join("\n");
  if (physicalExam) physicianEvalV1.physicalExam = physicalExam;
  const mdm = joinNonEmpty([
    s.mdmWorkingAssessment,
    s.mdmDifferentialSynthesis,
    s.mdmDataReviewed,
    s.mdmRiskLevel,
    s.mdmClinicalRationale,
    s.mdmPlanSummary,
    s.mdmImmediateActionsRationale,
    s.mdmConsultsDiscussed,
    s.mdmAdmitObserveDischarge,
  ]);
  if (mdm) physicianEvalV1.mdm = mdm;
  if (Object.keys(physicianEvalV1).length > 0) nursingAssessment.physicianEvalV1 = physicianEvalV1;
  else delete nursingAssessment.physicianEvalV1;

  return {
    nursingAssessment,
    visitReason: trimmedOrNull(s.reasonForVisit || s.chiefComplaint),
    clinicianImpression: trimmedOrNull(s.clinicalImpression),
    treatmentPlan: trimmedOrNull(s.treatmentPlan),
  };
}

export type ProviderDocumentationPreviewSection = {
  id: "hpi" | "ros" | "physicalExam" | "mdm" | "impression" | "plan";
  titleKey: string;
  lines: string[];
};

export function buildProviderDocumentationPreviewSections(
  state: ProviderDocumentationWorkspaceState
): ProviderDocumentationPreviewSection[] {
  const sections: ProviderDocumentationPreviewSection[] = [];
  const hpi = [state.chiefComplaint, state.hpi].map((v) => v.trim()).filter(Boolean);
  if (hpi.length) sections.push({ id: "hpi", titleKey: "providerDocumentationWorkspace.previewHpi", lines: hpi });

  const ros = [
    state.rosFocusedImpression,
    state.rosImportantPositives,
    state.rosImportantNegatives,
    state.rosRedFlags,
  ]
    .map((v) => v.trim())
    .filter(Boolean);
  if (ros.length) sections.push({ id: "ros", titleKey: "providerDocumentationWorkspace.previewRos", lines: ros });

  const exam = PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.map((id) => state.physicalExam[id].trim()).filter(Boolean);
  if (exam.length) {
    sections.push({ id: "physicalExam", titleKey: "providerDocumentationWorkspace.previewExam", lines: exam });
  }

  const mdm = [
    state.mdmWorkingAssessment,
    state.mdmDifferentialSynthesis,
    state.mdmDataReviewed,
    state.mdmRiskLevel,
    state.mdmClinicalRationale,
    state.mdmPlanSummary,
    state.mdmImmediateActionsRationale,
    state.mdmConsultsDiscussed,
    state.mdmAdmitObserveDischarge,
  ]
    .map((v) => v.trim())
    .filter(Boolean);
  if (mdm.length) sections.push({ id: "mdm", titleKey: "providerDocumentationWorkspace.previewMdm", lines: mdm });

  if (state.clinicalImpression.trim()) {
    sections.push({
      id: "impression",
      titleKey: "providerDocumentationWorkspace.previewImpression",
      lines: [state.clinicalImpression.trim()],
    });
  }

  const plan = [state.treatmentPlan, state.followUpDisposition, state.providerAddendum]
    .map((v) => v.trim())
    .filter(Boolean);
  if (plan.length) sections.push({ id: "plan", titleKey: "providerDocumentationWorkspace.previewPlan", lines: plan });

  return sections;
}


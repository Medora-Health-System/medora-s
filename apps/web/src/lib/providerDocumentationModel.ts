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

export type ProviderDocumentationTemplateId =
  | "chest_pain"
  | "abdominal_pain"
  | "headache"
  | "back_pain"
  | "uri_respiratory"
  | "trauma_musculoskeletal"
  | "observation_reassessment";

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

type TemplateStringField = Exclude<keyof ProviderDocumentationWorkspaceState, "physicalExam" | "mdmRiskLevel">;

export type ProviderDocumentationTemplateDefinition = {
  id: ProviderDocumentationTemplateId;
  labelKey: string;
  helperKey: string;
  fields: Partial<Record<TemplateStringField, string[]>>;
  physicalExam: Partial<Record<ProviderDocumentationExamSectionId, string[]>>;
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

export const PROVIDER_DOCUMENTATION_TEMPLATES: ProviderDocumentationTemplateDefinition[] = [
  {
    id: "chest_pain",
    labelKey: "providerDocumentationWorkspace.templateChestPain",
    helperKey: "providerDocumentationWorkspace.templateChestPainHelp",
    fields: {
      hpi: [
        "erMseHpiChips.locChestPain",
        "erMseHpiChips.timStartedToday",
        "erMseHpiChips.qualPressureLike",
      ],
      rosImportantPositives: ["erMseRosChips.posChestPain", "erMseRosChips.posSob"],
      rosImportantNegatives: ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSyncope"],
      rosRedFlags: ["erMseRosChips.rfSyncope", "erMseRosChips.rfHypotensionConcern"],
      mdmWorkingAssessment: ["erMseMdmChips.waCardiopulmonary"],
      mdmPlanSummary: ["erMseMdmChips.planLabs", "erMseMdmChips.planEcg", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispAdmit"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      cardiovascular: ["erMseExamChips.cardioRrr", "erMseExamChips.cardioNoMurmur"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs"],
    },
  },
  {
    id: "abdominal_pain",
    labelKey: "providerDocumentationWorkspace.templateAbdominalPain",
    helperKey: "providerDocumentationWorkspace.templateAbdominalPainHelp",
    fields: {
      hpi: [
        "erMseHpiChips.locAbdominalPain",
        "erMseHpiChips.timStartedToday",
        "erMseHpiChips.timWorsening",
      ],
      rosImportantPositives: ["erMseRosChips.posAbdominalPain", "erMseRosChips.posVomiting"],
      rosImportantNegatives: ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSyncope"],
      rosRedFlags: ["erMseRosChips.rfSeverePain", "erMseRosChips.rfHypotensionConcern"],
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmPlanSummary: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdTendernessPresent", "erMseExamChips.abdGuarding"],
    },
  },
  {
    id: "headache",
    labelKey: "providerDocumentationWorkspace.templateHeadache",
    helperKey: "providerDocumentationWorkspace.templateHeadacheHelp",
    fields: {
      hpi: ["erMseHpiChips.locHeadache", "erMseHpiChips.timStartedToday", "erMseHpiChips.timSuddenOnset"],
      rosImportantPositives: ["erMseRosChips.posHeadache", "erMseRosChips.posDizziness"],
      rosImportantNegatives: ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSyncope"],
      rosRedFlags: ["erMseRosChips.rfAlteredMs", "erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain"],
      mdmWorkingAssessment: ["erMseMdmChips.waNeurologic"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planImaging", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      heent: ["erMseExamChips.heentPerrla"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroSpeechClear"],
    },
  },
  {
    id: "back_pain",
    labelKey: "providerDocumentationWorkspace.templateBackPain",
    helperKey: "providerDocumentationWorkspace.templateBackPainHelp",
    fields: {
      hpi: ["erMseHpiChips.locBackPain", "erMseHpiChips.timStartedToday", "erMseHpiChips.qualAching"],
      rosImportantPositives: ["erMseRosChips.posWeakness"],
      rosImportantNegatives: ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesWeakness"],
      rosRedFlags: ["erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain"],
      mdmWorkingAssessment: ["erMseMdmChips.waTrauma"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      neuroPsych: ["erMseExamChips.neuroFollowsCommands"],
      musculoskeletal: ["erMseExamChips.mskRomNormal", "erMseExamChips.mskTendernessPresent"],
    },
  },
  {
    id: "uri_respiratory",
    labelKey: "providerDocumentationWorkspace.templateUriRespiratory",
    helperKey: "providerDocumentationWorkspace.templateUriRespiratoryHelp",
    fields: {
      hpi: ["erMseHpiChips.timStartedToday", "erMseHpiChips.timGradualOnset", "erMseHpiChips.assocSob"],
      rosImportantPositives: ["erMseRosChips.posFever", "erMseRosChips.posSob"],
      rosImportantNegatives: ["erMseRosChips.negDeniesChestPain", "erMseRosChips.negDeniesSyncope"],
      rosRedFlags: ["erMseRosChips.rfRespDistress", "erMseRosChips.rfHypotensionConcern"],
      mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waCardiopulmonary"],
      mdmPlanSummary: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging", "erMseMdmChips.planReassess"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actOxygen"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      heent: ["erMseExamChips.heentOropharynxClear"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs", "erMseExamChips.respWheezing"],
    },
  },
  {
    id: "trauma_musculoskeletal",
    labelKey: "providerDocumentationWorkspace.templateTraumaMsk",
    helperKey: "providerDocumentationWorkspace.templateTraumaMskHelp",
    fields: {
      hpi: ["erMseHpiChips.locLimbPain", "erMseHpiChips.timSuddenOnset", "erMseHpiChips.qualAching"],
      rosImportantPositives: ["erMseRosChips.posWeakness"],
      rosRedFlags: ["erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain", "erMseRosChips.rfBleeding"],
      mdmWorkingAssessment: ["erMseMdmChips.waTrauma"],
      mdmPlanSummary: ["erMseMdmChips.planImaging", "erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actPain", "erMseMdmChips.actSafety"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      musculoskeletal: [
        "erMseExamChips.mskRomNormal",
        "erMseExamChips.mskTendernessPresent",
        "erMseExamChips.mskSwellingPresent",
        "erMseExamChips.mskDeformityNoted",
      ],
      skin: ["erMseExamChips.skinLacerationPresent"],
      neuroPsych: ["erMseExamChips.neuroFocalDeficitNoted"],
    },
  },
  {
    id: "observation_reassessment",
    labelKey: "providerDocumentationWorkspace.templateObservationReassessment",
    helperKey: "providerDocumentationWorkspace.templateObservationReassessmentHelp",
    fields: {
      hpi: [
        "providerDocumentationWorkspace.obsSymptomsImproving",
        "providerDocumentationWorkspace.obsSymptomsUnchanged",
        "providerDocumentationWorkspace.obsSymptomsWorsening",
        "providerDocumentationWorkspace.obsVitalsStable",
      ],
      rosFocusedImpression: [
        "providerDocumentationWorkspace.obsAwaitingLab",
        "providerDocumentationWorkspace.obsAwaitingImaging",
      ],
      mdmWorkingAssessment: ["erMseMdmChips.waUndifferentiated"],
      mdmPlanSummary: [
        "providerDocumentationWorkspace.obsContinuedMonitoring",
        "erMseMdmChips.planReassess",
      ],
      mdmAdmitObserveDischarge: [
        "providerDocumentationWorkspace.obsDischargeReadiness",
        "providerDocumentationWorkspace.obsTransferConsidered",
      ],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      respiratory: ["erMseExamChips.respNoDistress"],
      cardiovascular: ["erMseExamChips.cardioPeripheralPulsesPresent"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented"],
    },
  },
];

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

export function providerDocumentationTemplateById(
  templateId: ProviderDocumentationTemplateId
): ProviderDocumentationTemplateDefinition {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId);
  if (!template) {
    throw new Error(`Unknown provider documentation template: ${templateId}`);
  }
  return template;
}

export function applyProviderDocumentationTemplate(input: {
  state: ProviderDocumentationWorkspaceState;
  templateId: ProviderDocumentationTemplateId;
  resolveFragment: (key: string) => string;
}): ProviderDocumentationWorkspaceState {
  const template = providerDocumentationTemplateById(input.templateId);
  const next: ProviderDocumentationWorkspaceState = {
    ...input.state,
    physicalExam: { ...input.state.physicalExam },
  };

  for (const [field, fragmentKeys] of Object.entries(template.fields) as Array<
    [TemplateStringField, string[] | undefined]
  >) {
    if (!fragmentKeys) continue;
    let current = next[field];
    for (const key of fragmentKeys) {
      current = appendDocumentationFragment(current, input.resolveFragment(key));
    }
    next[field] = current;
  }

  for (const [sectionId, fragmentKeys] of Object.entries(template.physicalExam) as Array<
    [ProviderDocumentationExamSectionId, string[] | undefined]
  >) {
    if (!fragmentKeys) continue;
    let current = next.physicalExam[sectionId];
    for (const key of fragmentKeys) {
      current = appendDocumentationFragment(current, input.resolveFragment(key));
    }
    next.physicalExam[sectionId] = current;
  }

  return next;
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

export type ProviderDocumentationDisplayLocale = "en" | "fr";

export type ProviderDocumentationDisplaySection = {
  id: ProviderDocumentationPreviewSection["id"];
  label: string;
  text: string;
};

export type ProviderDocumentationDisplayModel = {
  encounterMode: ProviderDocumentationEncounterMode;
  documentType: ProviderDocumentationDocumentType;
  title: string;
  savedAt: string | null;
  savedBy: string | null;
  sections: ProviderDocumentationDisplaySection[];
};

const PROVIDER_DOCUMENTATION_DISPLAY_LABELS: Record<
  ProviderDocumentationDisplayLocale,
  {
    titleEd: string;
    titleObservation: string;
    hpi: string;
    ros: string;
    physicalExam: string;
    mdm: string;
    impression: string;
    plan: string;
  }
> = {
  en: {
    titleEd: "ED provider documentation",
    titleObservation: "Observation provider progress note",
    hpi: "HPI",
    ros: "ROS",
    physicalExam: "Physical Exam",
    mdm: "MDM",
    impression: "Impression",
    plan: "Plan",
  },
  fr: {
    titleEd: "Documentation médecin urgences",
    titleObservation: "Note d'évolution médecin observation",
    hpi: "HPI",
    ros: "Revue ciblée",
    physicalExam: "Examen physique",
    mdm: "Décision médicale",
    impression: "Impression",
    plan: "Plan",
  },
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

function providerDocumentationDisplayTitle(
  encounterMode: ProviderDocumentationEncounterMode,
  locale: ProviderDocumentationDisplayLocale
): string {
  const labels = PROVIDER_DOCUMENTATION_DISPLAY_LABELS[locale];
  return encounterMode === "OBSERVATION" ? labels.titleObservation : labels.titleEd;
}

export function readProviderDocumentationWorkspaceMetadata(
  nursingAssessment: unknown
): ProviderDocumentationMetadata | null {
  const root = asObject(nursingAssessment);
  const stored = asObject(root?.[PROVIDER_DOCUMENTATION_NAMESPACE_KEY]);
  const meta = asObject(stored?.workspaceMetadata);
  if (meta?.source !== PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE) return null;
  const encounterMode = meta.encounterMode === "OBSERVATION" ? "OBSERVATION" : meta.encounterMode === "ED" ? "ED" : null;
  const documentType =
    meta.documentType === "OBSERVATION_PROVIDER_PROGRESS_NOTE" || meta.documentType === "INITIAL_PROVIDER_NOTE"
      ? meta.documentType
      : null;
  const savedAt = typeof meta.savedAt === "string" ? meta.savedAt : null;
  const savedBy = typeof meta.savedBy === "string" ? meta.savedBy : null;
  if (!encounterMode || !documentType || !savedAt || !savedBy) return null;
  return {
    encounterMode,
    documentType,
    savedAt,
    savedBy,
    source: PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE,
  };
}

export function hasProviderDocumentationWorkspaceNote(nursingAssessment: unknown): boolean {
  return readProviderDocumentationWorkspaceMetadata(nursingAssessment) !== null;
}

export function buildProviderDocumentationDisplayModel(input: {
  nursingAssessment: unknown;
  locale: ProviderDocumentationDisplayLocale;
  fallbackEncounterMode?: ProviderDocumentationEncounterMode;
}): ProviderDocumentationDisplayModel | null {
  const metadata = readProviderDocumentationWorkspaceMetadata(input.nursingAssessment);
  if (!metadata) return null;
  const state = hydrateProviderDocumentationWorkspaceState({
    encounter: { nursingAssessment: input.nursingAssessment },
  });
  const preview = buildProviderDocumentationPreviewSections(state);
  const labels = PROVIDER_DOCUMENTATION_DISPLAY_LABELS[input.locale];
  const labelById: Record<ProviderDocumentationPreviewSection["id"], string> = {
    hpi: labels.hpi,
    ros: labels.ros,
    physicalExam: labels.physicalExam,
    mdm: labels.mdm,
    impression: labels.impression,
    plan: labels.plan,
  };
  const sections = preview
    .map((section): ProviderDocumentationDisplaySection => ({
      id: section.id,
      label: labelById[section.id],
      text: section.lines.map((line) => line.trim()).filter(Boolean).join("\n"),
    }))
    .filter((section) => section.text.trim().length > 0);
  if (sections.length === 0) return null;
  return {
    encounterMode: metadata.encounterMode ?? input.fallbackEncounterMode ?? "ED",
    documentType: metadata.documentType,
    title: providerDocumentationDisplayTitle(metadata.encounterMode, input.locale),
    savedAt: metadata.savedAt,
    savedBy: metadata.savedBy,
    sections,
  };
}


import type {
  ProviderDocumentationExamSectionId,
  ProviderDocumentationTemplateGuidance,
  ProviderDocumentationTemplateStringField,
} from "./providerDocumentationModel";

type FieldMap = Partial<Record<ProviderDocumentationTemplateStringField, string[]>>;
type ExamMap = Partial<Record<ProviderDocumentationExamSectionId, string[]>>;

/** Shared trauma HPI fragments — mechanism, LOC, anticoagulant context. */
export const TRAUMA_HPI_MECHANISM: string[] = [
  "erMseHpiChipsTrauma.mechanismReviewed",
  "erMseHpiChipsTrauma.lossOfConsciousnessReviewed",
  "erMseHpiChipsTrauma.anticoagulantReviewed",
  "erMseHpiChipsTrauma.intoxicationReviewed",
];

export const TRAUMA_ROS_RED_FLAGS: string[] = [
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfSeverePain",
  "erMseRosChips.rfBleeding",
  "erMseRosChips.rfAlteredMs",
  "erMseHpiChipsTrauma.rfCspineConcern",
];

export const TRAUMA_EXAM_NEURO_MSK: ExamMap = {
  general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
  heent: ["erMseExamChips.heentHeadAtraumatic"],
  neuroPsych: [
    "erMseExamChips.neuroAlertOriented",
    "erMseExamChips.neuroFollowsCommands",
    "providerDocumentationWorkspace.stickerExamNvIntact",
  ],
  musculoskeletal: [
    "erMseExamChips.mskTendernessPresent",
    "erMseExamChips.mskSwellingPresent",
    "providerDocumentationWorkspace.stickerExamLimitedRom",
    "providerDocumentationWorkspace.stickerExamNvIntact",
    "providerDocumentationWorkspace.stickerExamCapRefillIntact",
  ],
  skin: ["erMseExamChips.skinLacerationPresent"],
  reassessment: ["providerDocumentationSmartSentences.traumaReassessmentAfterAnalgesia"],
};

export const TRAUMA_MDM_BASE: FieldMap = {
  mdmWorkingAssessment: ["erMseMdmChips.waTrauma"],
  mdmDataReviewed: ["erMseMdmChips.planImaging", "erMseMdmGuidance.externalRecordsReviewed"],
  mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess", "erMseMdmGuidance.tetanusConsidered"],
  mdmImmediateActionsRationale: ["erMseMdmChips.actPain", "erMseMdmChips.actSafety"],
  mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions", "erMseMdmGuidance.transferConsidered"],
};

export const TRAUMA_GUIDANCE: ProviderDocumentationTemplateGuidance = {
  mdmClinicalRationale: [
    "erMseMdmGuidance.acuteInjuryDocumented",
    "erMseMdmGuidance.threatToLifeExcluded",
    "erMseMdmGuidance.imagingIndicationDiscussed",
  ],
  mdmDifferentialSynthesis: [
    "erMseMdmGuidance.traumaDifferentialReviewed",
    "erMseMdmGuidance.neurovascularStatusAddressed",
  ],
  reassessment: [
    "providerDocumentationSmartSentences.traumaReassessmentAfterAnalgesia",
    "providerDocumentationSmartSentences.noFocalNeuroDeficitRepeatExam",
  ],
  followUpDisposition: [
    "providerDocumentationSmartSentences.returnPrecautionsWorseningPain",
    "providerDocumentationSmartSentences.tetanusCounselingIfApplicable",
  ],
};

/** Shared pediatric HPI / ROS patterns. */
export const PEDIATRIC_HPI_BASE: string[] = [
  "erMseHpiChipsPediatric.caregiverHistorian",
  "erMseHpiChipsPediatric.hydrationStatusReviewed",
  "erMseHpiChips.timStartedToday",
];

export const PEDIATRIC_EXAM_GENERAL: ExamMap = {
  general: [
    "erMseExamChips.genAlert",
    "erMseHpiChipsPediatric.nonToxicAppearingExam",
    "erMseHpiChipsPediatric.hydrationAssessedExam",
  ],
  heent: ["erMseExamChips.heentOropharynxClear"],
  respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs"],
};

export const PEDIATRIC_MDM_BASE: FieldMap = {
  mdmWorkingAssessment: ["erMseMdmChips.waInfectious"],
  mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmGuidance.independentHistorianPediatric"],
  mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess", "erMseMdmGuidance.pediatricDosingConsidered"],
  mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
};

export const PEDIATRIC_GUIDANCE: ProviderDocumentationTemplateGuidance = {
  mdmClinicalRationale: [
    "erMseMdmGuidance.acuteIllnessPediatric",
    "erMseMdmGuidance.dehydrationRiskAddressed",
    "erMseMdmGuidance.vaccinationStatusReviewedIfRelevant",
  ],
  mdmDifferentialSynthesis: ["erMseMdmGuidance.pediatricDifferentialReviewed"],
  reassessment: ["providerDocumentationSmartSentences.pediatricNonToxicAppearing"],
  followUpDisposition: [
    "providerDocumentationSmartSentences.pediatricReturnPrecautions",
    "providerDocumentationSmartSentences.caregiverCounselingDocumented",
  ],
};

/** Shared adult medical MDM patterns. */
export const ADULT_MDM_CARDIOPULMONARY: FieldMap = {
  mdmWorkingAssessment: ["erMseMdmChips.waCardiopulmonary"],
  mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planEcg", "erMseMdmGuidance.externalRecordsReviewed"],
  mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess", "erMseMdmChips.planSdM"],
  mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispAdmit", "erMseMdmChips.dispReturnPrecautions"],
};

export const ADULT_GUIDANCE_ACS: ProviderDocumentationTemplateGuidance = {
  mdmClinicalRationale: [
    "erMseMdmGuidance.acuteIllnessDocumented",
    "erMseMdmGuidance.acsExclusionConsidered",
    "erMseMdmGuidance.threatToLifeAddressed",
  ],
  mdmDifferentialSynthesis: ["erMseMdmGuidance.cardiopulmonaryDifferentialReviewed"],
  reassessment: [
    "providerDocumentationSmartSentences.reassessedAfterAnalgesia",
    "providerDocumentationSmartSentences.sharedDecisionMakingImaging",
  ],
  followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsWorseningPain"],
};

export const ADULT_GUIDANCE_NEURO: ProviderDocumentationTemplateGuidance = {
  mdmClinicalRationale: [
    "erMseMdmGuidance.acuteIllnessDocumented",
    "erMseMdmGuidance.strokeExclusionConsidered",
    "erMseMdmGuidance.threatToLifeAddressed",
  ],
  mdmDifferentialSynthesis: ["erMseMdmGuidance.neurologicDifferentialReviewed"],
  reassessment: ["providerDocumentationSmartSentences.noFocalNeuroDeficitRepeatExam"],
  followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsNeuro"],
};

export function mergeFields(...maps: FieldMap[]): FieldMap {
  const out: FieldMap = {};
  for (const map of maps) {
    for (const [key, values] of Object.entries(map) as Array<[ProviderDocumentationTemplateStringField, string[]]>) {
      out[key] = [...(out[key] ?? []), ...(values ?? [])];
    }
  }
  return out;
}

export function mergeExam(...maps: ExamMap[]): ExamMap {
  const out: ExamMap = {};
  for (const map of maps) {
    for (const [key, values] of Object.entries(map) as Array<[ProviderDocumentationExamSectionId, string[]]>) {
      out[key] = [...(out[key] ?? []), ...(values ?? [])];
    }
  }
  return out;
}

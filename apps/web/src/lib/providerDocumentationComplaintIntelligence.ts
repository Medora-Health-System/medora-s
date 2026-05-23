/**
 * Phase 19N.3 — Complaint-specific documentation intelligence (Batch 1).
 *
 * Authoritative references (audit summary):
 * - CMS 2023 E/M Guidelines — MDM problems/data/risk documentation; provider-selected elements only.
 * - ACEP ED documentation guidance — risk stratification, reassessment, disposition documentation.
 * - ACC/AHA 2022 chest pain / AMI data elements; ACEP NSTE-ACS policy (HEART score).
 * - SAEM M4 approaches: chest pain, dyspnea, abdominal pain; ECBC acute dyspnea summary.
 * - StatPearls / NSW ECAT abdominal red flags; medico-legal serial exam + return precaution documentation.
 *
 * All fragments are click-to-insert only; never auto-inserted on template apply.
 */
import type {
  ProviderDocumentationExamSectionId,
  ProviderDocumentationTemplateStringField,
} from "./providerDocumentationModel";

export type ProviderDocumentationComplaintIntelligence = {
  hpi?: string[];
  rosImportantPositives?: string[];
  rosImportantNegatives?: string[];
  rosRedFlags?: string[];
  physicalExam?: Partial<Record<ProviderDocumentationExamSectionId, string[]>>;
  mdmWorkingAssessment?: string[];
  mdmDifferentialSynthesis?: string[];
  mdmDataReviewed?: string[];
  mdmClinicalRationale?: string[];
  mdmPlanSummary?: string[];
  mdmImmediateActionsRationale?: string[];
  mdmAdmitObserveDischarge?: string[];
  reassessment?: string[];
  followUpDisposition?: string[];
};

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const cp = (key: string) => `providerDocumentationComplaintIntel.chestPain.${key}`;
const sob = (key: string) => `providerDocumentationComplaintIntel.sob.${key}`;
const abd = (key: string) => `providerDocumentationComplaintIntel.abdominal.${key}`;

/** Chest pain — ACS / cardiopulmonary risk stratification (ACEP HEART / ACC-AHA). */
export const CHEST_PAIN_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    cp("hpiExertional"),
    cp("hpiPleuritic"),
    cp("hpiPressureLike"),
    cp("hpiSharp"),
    cp("hpiRadiationLeftArm"),
    cp("hpiRadiationJaw"),
    cp("hpiAssocDiaphoresis"),
    cp("hpiAssocSob"),
    cp("hpiAssocNausea"),
    cp("hpiAssocDizziness"),
    cp("hpiSuddenOnset"),
    cp("hpiGradualOnset"),
    cp("hpiReproduciblePalpation"),
    cp("hpiPositional"),
    cp("hpiWorseInspiration"),
    cp("hpiCocaineUse"),
    cp("hpiSmokingHistory"),
    cp("hpiCardiacHistory"),
    cp("hpiPriorMi"),
    cp("hpiRecentTravel"),
    cp("hpiUnilateralLegSwellingHistory"),
  ],
  rosImportantPositives: [
    cp("rosSob"),
    cp("rosDiaphoresis"),
    cp("rosNausea"),
    cp("rosVomiting"),
    cp("rosDizziness"),
    cp("rosPalpitations"),
    cp("rosSyncope"),
    cp("rosWeakness"),
  ],
  rosImportantNegatives: [
    cp("rosDeniesFever"),
    cp("rosDeniesTrauma"),
    cp("rosDeniesHemoptysis"),
    cp("rosDeniesUnilateralLegSwelling"),
    cp("rosDeniesRecentSurgery"),
    cp("rosDeniesCalfPain"),
  ],
  rosRedFlags: [cp("rfRecurrentPain"), cp("rfHypotensionConcern")],
  physicalExam: {
    cardiovascular: [
      cp("examCardioRrr"),
      cp("examCardioTachycardic"),
      cp("examMurmurAppreciated"),
      cp("examPeripheralPulsesPresent"),
    ],
    respiratory: [
      cp("examNoRespDistress"),
      cp("examClearBreathSounds"),
      cp("examWheezing"),
      cp("examCrackles"),
    ],
    general: [cp("examUncomfortableAppearing"), cp("examDiaphoretic"), cp("examAnxiousAppearing")],
    musculoskeletal: [cp("examChestWallTendernessReproduced")],
  },
  mdmWorkingAssessment: [cp("mdmAcsConsidered"), cp("mdmPeRiskEvaluated")],
  mdmDifferentialSynthesis: [
    cp("diffAcs"),
    cp("diffStemiNstemi"),
    cp("diffPe"),
    cp("diffAorticDissection"),
    cp("diffPneumothorax"),
    cp("diffPneumonia"),
    cp("diffPericarditis"),
    cp("diffGerd"),
    cp("diffMusculoskeletal"),
    cp("diffAnxietyPanic"),
  ],
  mdmDataReviewed: [
    cp("mdmTroponinReviewed"),
    cp("mdmRepeatTroponinPlanned"),
    cp("mdmCxrReviewed"),
    cp("mdmExternalRecordsReviewed"),
  ],
  mdmClinicalRationale: [
    cp("mdmHeartScoreConsidered"),
    cp("mdmEcgReviewed"),
    cp("mdmLifeThreateningCausesEvaluated"),
  ],
  mdmPlanSummary: [cp("mdmSharedDecisionMakingDocumented")],
  mdmImmediateActionsRationale: [cp("mdmAspirinConsidered")],
  mdmAdmitObserveDischarge: [cp("mdmAdmissionConsidered"), cp("mdmObservationConsidered")],
  reassessment: [
    cp("reassessChestPainImproved"),
    cp("reassessRepeatExamUnchanged"),
    cp("reassessHemodynamicallyStable"),
    cp("reassessSerialReassessmentPerformed"),
  ],
  followUpDisposition: [
    cp("dispReturnPrecautionsDiscussed"),
    cp("dispReturnWorseningChestPain"),
    cp("dispReturnWorseningSob"),
    cp("dispCardiologyFollowUp"),
    cp("dispPcpFollowUp"),
  ],
});

/** Shortness of breath (adult) — cardiopulmonary / obstructive / PE framework. */
export const SOB_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    sob("hpiSuddenOnsetDyspnea"),
    sob("hpiGradualOnsetDyspnea"),
    sob("hpiExertionalDyspnea"),
    sob("hpiOrthopnea"),
    sob("hpiWheezing"),
    sob("hpiProductiveCough"),
    sob("hpiChestTightness"),
    sob("hpiPleuriticSymptoms"),
    sob("hpiFeverSymptoms"),
    sob("hpiRecentIllness"),
    sob("hpiSmoker"),
    sob("hpiCopdHistory"),
    sob("hpiAsthmaHistory"),
    sob("hpiChfHistory"),
    sob("hpiOxygenDependent"),
    sob("hpiIncreasedWorkOfBreathing"),
  ],
  rosImportantPositives: [
    sob("rosCough"),
    sob("rosChestPain"),
    sob("rosFever"),
    sob("rosWheezing"),
    sob("rosDizziness"),
    sob("rosFatigue"),
  ],
  rosImportantNegatives: [
    sob("rosDeniesHemoptysis"),
    sob("rosDeniesUnilateralLegSwelling"),
    sob("rosDeniesRecentSurgery"),
    sob("rosDeniesChestTrauma"),
  ],
  rosRedFlags: [sob("rfRespiratoryDistress"), sob("rfAlteredMentalStatus")],
  physicalExam: {
    respiratory: [
      sob("examNoRespDistress"),
      sob("examIncreasedWorkOfBreathing"),
      sob("examWheezing"),
      sob("examCrackles"),
      sob("examDiminishedBreathSounds"),
    ],
    cardiovascular: [sob("examTachycardic"), sob("examPeripheralEdema")],
    general: [sob("examSpeakingFullSentences"), sob("examHypoxicAppearance"), sob("examAnxiousAppearing")],
  },
  mdmWorkingAssessment: [sob("mdmPeConsidered"), sob("mdmSepsisConsidered")],
  mdmDifferentialSynthesis: [
    sob("diffAsthmaExacerbation"),
    sob("diffCopdExacerbation"),
    sob("diffChfExacerbation"),
    sob("diffPneumonia"),
    sob("diffPe"),
    sob("diffPneumothorax"),
    sob("diffViralSyndrome"),
    sob("diffAcsEquivalent"),
    sob("diffAnxietyReaction"),
  ],
  mdmDataReviewed: [
    sob("mdmCxrReviewed"),
    sob("mdmEcgReviewed"),
    sob("mdmTroponinReviewed"),
    sob("mdmBnpReviewed"),
  ],
  mdmClinicalRationale: [
    sob("mdmOxygenRequirementEvaluated"),
    sob("mdmRespiratoryReassessmentPerformed"),
  ],
  mdmPlanSummary: [sob("mdmNebulizerTherapyAdministered")],
  mdmImmediateActionsRationale: [sob("mdmSupplementalOxygen")],
  mdmAdmitObserveDischarge: [sob("mdmAdmissionConsidered")],
  reassessment: [
    sob("reassessAfterBronchodilator"),
    sob("reassessSpo2AfterTreatment"),
    sob("reassessAfterDiuresisIfChf"),
  ],
  followUpDisposition: [
    sob("dispReturnWorseningBreathing"),
    sob("dispInhalerInstructionsReviewed"),
    sob("dispOutpatientFollowUpAdvised"),
    sob("dispAdmissionDiscussed"),
  ],
});

/** Abdominal pain — surgical / OB-GYN red flags (SAEM / StatPearls / ECAT). */
export const ABDOMINAL_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    abd("hpiDiffusePain"),
    abd("hpiRlqPain"),
    abd("hpiRuqPain"),
    abd("hpiEpigastricPain"),
    abd("hpiFlankPain"),
    abd("hpiSuddenOnset"),
    abd("hpiGradualOnset"),
    abd("hpiNausea"),
    abd("hpiVomiting"),
    abd("hpiDiarrhea"),
    abd("hpiConstipation"),
    abd("hpiUrinarySymptoms"),
    abd("hpiFeverSymptoms"),
    abd("hpiPriorAbdominalSurgery"),
    abd("hpiPregnancyConcern"),
    abd("hpiGiBleedConcern"),
  ],
  rosImportantPositives: [
    abd("rosNausea"),
    abd("rosVomiting"),
    abd("rosDiarrhea"),
    abd("rosConstipation"),
    abd("rosDysuria"),
    abd("rosHematuria"),
    abd("rosFever"),
    abd("rosFlankPain"),
  ],
  rosImportantNegatives: [
    abd("rosDeniesGiBleeding"),
    abd("rosDeniesChestPain"),
    abd("rosDeniesSyncope"),
    abd("rosDeniesPregnancyConcern"),
    abd("rosDeniesTesticularPain"),
  ],
  rosRedFlags: [
    abd("rfRigidAbdomenConcern"),
    abd("rfSyncope"),
    abd("rfGiBleedingConcern"),
  ],
  physicalExam: {
    abdomen: [
      abd("examSoftNonTender"),
      abd("examRlqTenderness"),
      abd("examRuqTenderness"),
      abd("examGuarding"),
      abd("examReboundTenderness"),
      abd("examCvaTenderness"),
    ],
    general: [abd("examUncomfortableAppearing"), abd("examDehydratedAppearance")],
  },
  mdmWorkingAssessment: [
    abd("mdmSurgicalPathologyConsidered"),
    abd("mdmAppendicitisConsidered"),
  ],
  mdmDifferentialSynthesis: [
    abd("diffAppendicitis"),
    abd("diffCholecystitis"),
    abd("diffPancreatitis"),
    abd("diffBowelObstruction"),
    abd("diffGastroenteritis"),
    abd("diffKidneyStone"),
    abd("diffPyelonephritis"),
    abd("diffEctopicPregnancy"),
    abd("diffGiBleed"),
    abd("diffDiverticulitis"),
  ],
  mdmDataReviewed: [
    abd("mdmCtAbdomenPelvisReviewed"),
    abd("mdmUltrasoundReviewed"),
    abd("mdmLabsReviewed"),
    abd("mdmBetaHcgIfIndicated"),
  ],
  mdmClinicalRationale: [
    abd("mdmSerialAbdominalExamsPerformed"),
    abd("mdmEctopicExcludedClinicallyLab"),
    abd("mdmIvFluidsAdministered"),
  ],
  mdmPlanSummary: [abd("mdmSurgeryConsultIfIndicated")],
  mdmImmediateActionsRationale: [abd("mdmIvFluidsAnalgesiaPlan")],
  mdmAdmitObserveDischarge: [abd("mdmAdmissionConsidered"), abd("mdmObservationConsidered")],
  reassessment: [
    abd("reassessSerialAbdominalExam"),
    abd("reassessAfterAnalgesia"),
  ],
  followUpDisposition: [
    abd("dispReturnPrecautionsReviewed"),
    abd("dispWorseningPainPrecautions"),
    abd("dispSurgicalFollowUp"),
    abd("dispPcpGiFollowUp"),
  ],
});

export const COMPLAINT_INTEL_BY_TEMPLATE_ID: Partial<
  Record<string, ProviderDocumentationComplaintIntelligence>
> = {
  chest_pain: CHEST_PAIN_COMPLAINT_INTEL,
  sob: SOB_COMPLAINT_INTEL,
  abdominal_pain: ABDOMINAL_COMPLAINT_INTEL,
};

export const BATCH1_COMPLAINT_TEMPLATE_IDS = ["chest_pain", "sob", "abdominal_pain"] as const;

export function flattenComplaintIntelligenceKeys(bundle: ProviderDocumentationComplaintIntelligence): string[] {
  return [
    ...(bundle.hpi ?? []),
    ...(bundle.rosImportantPositives ?? []),
    ...(bundle.rosImportantNegatives ?? []),
    ...(bundle.rosRedFlags ?? []),
    ...Object.values(bundle.physicalExam ?? {}).flat(),
    ...(bundle.mdmWorkingAssessment ?? []),
    ...(bundle.mdmDifferentialSynthesis ?? []),
    ...(bundle.mdmDataReviewed ?? []),
    ...(bundle.mdmClinicalRationale ?? []),
    ...(bundle.mdmPlanSummary ?? []),
    ...(bundle.mdmImmediateActionsRationale ?? []),
    ...(bundle.mdmAdmitObserveDischarge ?? []),
    ...(bundle.reassessment ?? []),
    ...(bundle.followUpDisposition ?? []),
  ];
}

export function complaintIntelligenceFieldKeys(): ProviderDocumentationTemplateStringField[] {
  return [
    "hpi",
    "rosImportantPositives",
    "rosImportantNegatives",
    "rosRedFlags",
    "mdmWorkingAssessment",
    "mdmDifferentialSynthesis",
    "mdmDataReviewed",
    "mdmClinicalRationale",
    "mdmPlanSummary",
    "mdmImmediateActionsRationale",
    "mdmAdmitObserveDischarge",
    "followUpDisposition",
  ];
}

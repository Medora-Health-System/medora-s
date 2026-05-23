/**
 * Phase 19N.3 / 19N.4 — Complaint-specific documentation intelligence.
 *
 * Authoritative references (audit summary):
 * - CMS 2023 E/M Guidelines — MDM problems/data/risk documentation; provider-selected elements only.
 * - ACEP ED documentation guidance — risk stratification, reassessment, disposition documentation.
 * - Batch 1: ACC/AHA chest pain; SAEM M4 chest pain / dyspnea / abdominal pain.
 * - Batch 2: AHA/ASA acute ischemic stroke early management (last known well, time-sensitive workflow);
 *   ACEP headache policy (thunderclap, meningismus, red flags); ACEP syncope policy (ECG, orthostatics, serious causes).
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
const stroke = (key: string) => `providerDocumentationComplaintIntel.stroke.${key}`;
const headache = (key: string) => `providerDocumentationComplaintIntel.headache.${key}`;
const dizz = (key: string) => `providerDocumentationComplaintIntel.dizzinessSyncope.${key}`;

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

/** Acute neuro symptoms / stroke concern — AHA/ASA time-sensitive workflow elements. */
export const STROKE_SYMPTOMS_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    stroke("hpiSuddenOnset"),
    stroke("hpiFacialDroop"),
    stroke("hpiArmWeakness"),
    stroke("hpiSpeechDifficulty"),
    stroke("hpiVisionChange"),
    stroke("hpiNumbnessTingling"),
    stroke("hpiLastKnownWellReviewed"),
    stroke("hpiSymptomOnsetTimeDocumented"),
    stroke("hpiSymptomProgression"),
    stroke("hpiHeadacheWithNeuroSymptoms"),
    stroke("hpiSeizureActivityReviewed"),
    stroke("hpiAnticoagulantUse"),
    stroke("hpiPriorTiaStroke"),
    stroke("hpiAtrialFibrillation"),
    stroke("hpiHypertensionHistory"),
    stroke("hpiDiabetesHistory"),
    stroke("hpiRecentTrauma"),
    stroke("hpiCocaineUse"),
  ],
  rosImportantPositives: [
    stroke("rosWeakness"),
    stroke("rosSpeechDifficulty"),
    stroke("rosVisionChange"),
    stroke("rosHeadache"),
    stroke("rosDizziness"),
    stroke("rosNumbness"),
    stroke("rosConfusion"),
  ],
  rosImportantNegatives: [
    stroke("rosDeniesChestPain"),
    stroke("rosDeniesFever"),
    stroke("rosDeniesTrauma"),
    stroke("rosDeniesNeckPain"),
  ],
  rosRedFlags: [
    stroke("rfNeuroDeficit"),
    stroke("rfAlteredMentalStatus"),
    stroke("rfSuddenSevereHeadache"),
  ],
  physicalExam: {
    neuroPsych: [
      stroke("examAlertOriented"),
      stroke("examSpeechClear"),
      stroke("examFocalDeficitNoted"),
      stroke("examFollowsCommands"),
      stroke("examAlteredMentalStatus"),
    ],
    cardiovascular: [
      stroke("examCardioRrr"),
      stroke("examCardioTachycardic"),
      stroke("examIrregularRhythmNoted"),
    ],
    general: [stroke("examAlert"), stroke("examUncomfortableAppearing")],
  },
  mdmWorkingAssessment: [
    stroke("mdmStrokeSyndromeConsidered"),
    stroke("mdmHemorrhagicStrokeConsidered"),
  ],
  mdmDifferentialSynthesis: [
    stroke("diffIschemicStroke"),
    stroke("diffHemorrhagicStroke"),
    stroke("diffTia"),
    stroke("diffMigraineWithAura"),
    stroke("diffSeizurePostIctal"),
    stroke("diffHypoglycemia"),
    stroke("diffIntracranialMass"),
    stroke("diffMeningitisEncephalitis"),
    stroke("diffConversionReaction"),
  ],
  mdmDataReviewed: [
    stroke("mdmCtHeadReviewed"),
    stroke("mdmCtaReviewed"),
    stroke("mdmGlucoseReviewed"),
    stroke("mdmNihssDocumentedIfUsed"),
    stroke("mdmEcgReviewed"),
    stroke("mdmExternalRecordsReviewed"),
  ],
  mdmClinicalRationale: [
    stroke("mdmLastKnownWellDocumented"),
    stroke("mdmStrokeActivationConsidered"),
    stroke("mdmTimeSensitiveWorkflowReviewed"),
    stroke("mdmThrombolysisEligibilityConsidered"),
  ],
  mdmPlanSummary: [
    stroke("mdmNeurologyConsult"),
    stroke("mdmTransferStrokeCenterConsidered"),
    stroke("mdmSerialNeuroExamsPlanned"),
  ],
  mdmImmediateActionsRationale: [
    stroke("mdmNpoIfStrokeSuspected"),
    stroke("mdmBloodPressureManagementConsidered"),
  ],
  mdmAdmitObserveDischarge: [
    stroke("mdmAdmissionConsidered"),
    stroke("mdmTransferConsidered"),
    stroke("mdmObservationConsidered"),
  ],
  reassessment: [
    stroke("reassessRepeatNeuroExam"),
    stroke("reassessSymptomsImproved"),
    stroke("reassessSymptomsUnchanged"),
    stroke("reassessSymptomsWorsened"),
    stroke("reassessHemodynamicallyStable"),
  ],
  followUpDisposition: [
    stroke("dispReturnPrecautionsDiscussed"),
    stroke("dispReturnRecurrentNeuroSymptoms"),
    stroke("dispReturnWorseningWeakness"),
    stroke("dispNeurologyFollowUp"),
    stroke("dispStrokeEducationReviewed"),
  ],
});

/** Headache — ACEP red flags / secondary headache workup framework. */
export const HEADACHE_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    headache("hpiSuddenSevereOnset"),
    headache("hpiThunderclapConcern"),
    headache("hpiGradualOnset"),
    headache("hpiPositional"),
    headache("hpiWorseWithValsalva"),
    headache("hpiPhotophobia"),
    headache("hpiPhonophobia"),
    headache("hpiNauseaVomiting"),
    headache("hpiVisualAura"),
    headache("hpiNeckStiffnessConcern"),
    headache("hpiFeverSymptoms"),
    headache("hpiTraumaReviewed"),
    headache("hpiRecentLpReviewed"),
    headache("hpiPregnancyConcern"),
    headache("hpiImmunocompromised"),
    headache("hpiAnticoagulantUse"),
    headache("hpiPriorMigraineHistory"),
    headache("hpiWorstHeadacheOfLife"),
    headache("hpiExertionalOnset"),
  ],
  rosImportantPositives: [
    headache("rosHeadache"),
    headache("rosNausea"),
    headache("rosVomiting"),
    headache("rosPhotophobia"),
    headache("rosFever"),
    headache("rosNeckPain"),
    headache("rosVisualChanges"),
    headache("rosDizziness"),
  ],
  rosImportantNegatives: [
    headache("rosDeniesFever"),
    headache("rosDeniesSyncope"),
    headache("rosDeniesNeckStiffness"),
    headache("rosDeniesTrauma"),
    headache("rosDeniesNeuroDeficit"),
  ],
  rosRedFlags: [
    headache("rfAlteredMentalStatus"),
    headache("rfNeuroDeficit"),
    headache("rfSeverePain"),
    headache("rfThunderclapPattern"),
  ],
  physicalExam: {
    heent: [headache("examPerrla"), headache("examOropharynxClear")],
    neuroPsych: [
      headache("examAlertOriented"),
      headache("examNeckStiffnessNoted"),
      headache("examFocalDeficitNoted"),
      headache("examSpeechClear"),
    ],
    general: [headache("examUncomfortableAppearing"), headache("examPhotophobicAppearing")],
  },
  mdmWorkingAssessment: [
    headache("mdmSecondaryHeadacheConsidered"),
    headache("mdmSahConsidered"),
  ],
  mdmDifferentialSynthesis: [
    headache("diffMigraine"),
    headache("diffTensionHeadache"),
    headache("diffSubarachnoidHemorrhage"),
    headache("diffMeningitis"),
    headache("diffEncephalitis"),
    headache("diffBrainTumor"),
    headache("diffHypertensiveEmergency"),
    headache("diffTemporalArteritis"),
    headache("diffIdiopathicIntracranialHypertension"),
    headache("diffSinusitis"),
    headache("diffMedicationOveruse"),
  ],
  mdmDataReviewed: [
    headache("mdmCtHeadReviewed"),
    headache("mdmLpConsidered"),
    headache("mdmLabsReviewed"),
    headache("mdmEsrCrpIfIndicated"),
  ],
  mdmClinicalRationale: [
    headache("mdmRedFlagsEvaluated"),
    headache("mdmInfectiousWorkupConsidered"),
    headache("mdmAnalgesiaResponseReviewed"),
  ],
  mdmPlanSummary: [
    headache("mdmAntiMigraineTherapyIfIndicated"),
    headache("mdmSerialNeuroExamsPlanned"),
  ],
  mdmImmediateActionsRationale: [headache("mdmIvFluidsAnalgesiaPlan")],
  mdmAdmitObserveDischarge: [
    headache("mdmAdmissionConsidered"),
    headache("mdmObservationConsidered"),
  ],
  reassessment: [
    headache("reassessPainImprovedAfterTreatment"),
    headache("reassessRepeatNeuroExam"),
    headache("reassessSerialExamUnchanged"),
  ],
  followUpDisposition: [
    headache("dispReturnThunderclapPrecautions"),
    headache("dispReturnWorseningHeadache"),
    headache("dispReturnNeuroSymptoms"),
    headache("dispNeurologyFollowUp"),
    headache("dispPcpFollowUp"),
  ],
});

/** Dizziness / syncope — ACEP serious-cause evaluation framework. */
export const DIZZINESS_SYNCOPE_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    dizz("hpiTrueVertigo"),
    dizz("hpiPresyncope"),
    dizz("hpiSyncopeEvent"),
    dizz("hpiOrthostaticSymptoms"),
    dizz("hpiExertionalSyncope"),
    dizz("hpiProdromeReviewed"),
    dizz("hpiPalpitationsBeforeEvent"),
    dizz("hpiChestPainBeforeEvent"),
    dizz("hpiSeizureLikeActivityReviewed"),
    dizz("hpiVolumeDepletion"),
    dizz("hpiMedicationReview"),
    dizz("hpiCardiacHistory"),
    dizz("hpiPriorSyncope"),
    dizz("hpiAlcoholUse"),
    dizz("hpiPregnancyConcern"),
    dizz("hpiPostEventConfusion"),
    dizz("hpiInjuryFromFallReviewed"),
  ],
  rosImportantPositives: [
    dizz("rosDizziness"),
    dizz("rosPalpitations"),
    dizz("rosChestPain"),
    dizz("rosWeakness"),
    dizz("rosNausea"),
    dizz("rosShortnessOfBreath"),
  ],
  rosImportantNegatives: [
    dizz("rosDeniesNeuroDeficit"),
    dizz("rosDeniesChestPainAtRest"),
    dizz("rosDeniesFever"),
    dizz("rosDeniesHeadache"),
  ],
  rosRedFlags: [
    dizz("rfSyncope"),
    dizz("rfNeuroDeficit"),
    dizz("rfHypotensionConcern"),
    dizz("rfAnticoagulantBleedingConcern"),
  ],
  physicalExam: {
    cardiovascular: [
      dizz("examCardioRrr"),
      dizz("examCardioTachycardic"),
      dizz("examMurmurAppreciated"),
      dizz("examPeripheralPulsesPresent"),
      dizz("examOrthostaticVitalsReviewed"),
    ],
    neuroPsych: [
      dizz("examAlertOriented"),
      dizz("examSpeechClear"),
      dizz("examFollowsCommands"),
      dizz("examGaitAssessed"),
    ],
    general: [dizz("examAlert"), dizz("examDiaphoretic")],
  },
  mdmWorkingAssessment: [
    dizz("mdmCardiacCauseConsidered"),
    dizz("mdmNeurologicCauseConsidered"),
  ],
  mdmDifferentialSynthesis: [
    dizz("diffVasovagal"),
    dizz("diffOrthostaticHypotension"),
    dizz("diffCardiacArrhythmia"),
    dizz("diffStructuralHeartDisease"),
    dizz("diffPulmonaryEmbolism"),
    dizz("diffAcs"),
    dizz("diffCerebrovascular"),
    dizz("diffSeizure"),
    dizz("diffHemorrhage"),
    dizz("diffMetabolic"),
    dizz("diffVertebrobasilar"),
  ],
  mdmDataReviewed: [
    dizz("mdmEcgReviewed"),
    dizz("mdmOrthostaticVitalsPerformed"),
    dizz("mdmTroponinIfIndicated"),
    dizz("mdmGlucoseReviewed"),
    dizz("mdmHemoglobinIfIndicated"),
    dizz("mdmCtHeadIfIndicated"),
  ],
  mdmClinicalRationale: [
    dizz("mdmSanFranciscoSyncopeConsidered"),
    dizz("mdmSeriousCauseEvaluationDocumented"),
    dizz("mdmVolumeStatusAssessed"),
  ],
  mdmPlanSummary: [
    dizz("mdmIvFluidsIfIndicated"),
    dizz("mdmEchocardiogramConsidered"),
    dizz("mdmTelemetryConsidered"),
  ],
  mdmImmediateActionsRationale: [
    dizz("mdmFallPrecautions"),
    dizz("mdmCardiacMonitoringIfIndicated"),
  ],
  mdmAdmitObserveDischarge: [
    dizz("mdmAdmissionConsidered"),
    dizz("mdmObservationConsidered"),
    dizz("mdmDischargeAfterNegativeWorkup"),
  ],
  reassessment: [
    dizz("reassessSymptomsResolvedAfterFluids"),
    dizz("reassessRepeatOrthostatics"),
    dizz("reassessRepeatNeuroExam"),
    dizz("reassessHemodynamicallyStable"),
  ],
  followUpDisposition: [
    dizz("dispNoDrivingUntilCleared"),
    dizz("dispReturnRecurrentSyncope"),
    dizz("dispReturnChestPainPalpitations"),
    dizz("dispCardiologyFollowUp"),
    dizz("dispPcpFollowUp"),
  ],
});

export const COMPLAINT_INTEL_BY_TEMPLATE_ID: Partial<
  Record<string, ProviderDocumentationComplaintIntelligence>
> = {
  chest_pain: CHEST_PAIN_COMPLAINT_INTEL,
  sob: SOB_COMPLAINT_INTEL,
  abdominal_pain: ABDOMINAL_COMPLAINT_INTEL,
  stroke_symptoms: STROKE_SYMPTOMS_COMPLAINT_INTEL,
  headache: HEADACHE_COMPLAINT_INTEL,
  dizziness_syncope: DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
};

export const BATCH1_COMPLAINT_TEMPLATE_IDS = ["chest_pain", "sob", "abdominal_pain"] as const;
export const BATCH2_COMPLAINT_TEMPLATE_IDS = ["stroke_symptoms", "headache", "dizziness_syncope"] as const;
export const COMPLAINT_INTEL_TEMPLATE_IDS = [
  ...BATCH1_COMPLAINT_TEMPLATE_IDS,
  ...BATCH2_COMPLAINT_TEMPLATE_IDS,
] as const;

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

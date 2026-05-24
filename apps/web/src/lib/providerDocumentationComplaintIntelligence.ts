/**
 * Phase 19N.3 / 19N.4 / 19N.5 — Complaint-specific documentation intelligence.
 *
 * Authoritative references (audit summary):
 * - CMS 2023 E/M Guidelines — MDM problems/data/risk documentation; provider-selected elements only.
 * - ACEP ED documentation guidance — risk stratification, reassessment, disposition documentation.
 * - Batch 1: ACC/AHA chest pain; SAEM M4 chest pain / dyspnea / abdominal pain.
 * - Batch 2: AHA/ASA acute ischemic stroke early management (last known well, time-sensitive workflow);
 *   ACEP headache policy (thunderclap, meningismus, red flags); ACEP syncope policy (ECG, orthostatics, serious causes).
 * - Batch 3: ACEP psychiatric emergency evaluation (suicide/homicide risk, safety, medical clearance);
 *   SAEM weakness differential approach; ED renal colic / flank pain workup standards.
 * - Batch 4: CDC/IDSA respiratory infection guidance; ED pneumonia/URI documentation; GINA/NHLBI asthma concepts;
 *   sepsis/red-flag fever documentation standards.
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
const psych = (key: string) => `providerDocumentationComplaintIntel.psychiatricBehavioral.${key}`;
const weak = (key: string) => `providerDocumentationComplaintIntel.weakness.${key}`;
const flank = (key: string) => `providerDocumentationComplaintIntel.flankPain.${key}`;
const uri = (key: string) => `providerDocumentationComplaintIntel.uriRespiratory.${key}`;
const feb = (key: string) => `providerDocumentationComplaintIntel.fever.${key}`;
const coughIntel = (key: string) => `providerDocumentationComplaintIntel.cough.${key}`;
const asthma = (key: string) => `providerDocumentationComplaintIntel.asthmaWheezing.${key}`;

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
    stroke("hpiLastKnownWellReviewed"),
    stroke("hpiSuddenOnset"),
    stroke("hpiSpeechDifficulty"),
    stroke("hpiFacialDroop"),
    stroke("hpiUnilateralWeakness"),
    stroke("hpiUnilateralNumbness"),
    stroke("hpiGaitInstability"),
    stroke("hpiVisionChange"),
    stroke("hpiConfusion"),
    stroke("hpiHeadacheWithNeuroSymptoms"),
    stroke("hpiSymptomsImproving"),
    stroke("hpiSymptomsPersistent"),
    stroke("hpiSymptomOnsetWitnessed"),
    stroke("hpiSymptomOnsetTimeDocumented"),
    stroke("hpiAnticoagulantUse"),
    stroke("hpiPriorTiaStroke"),
    stroke("hpiNihssConsidered"),
    stroke("hpiStrokeAlertActivated"),
    stroke("hpiTransferHigherNeuroCareConsidered"),
    stroke("hpiSeizureActivityReviewed"),
    stroke("hpiAtrialFibrillation"),
    stroke("hpiHypertensionHistory"),
    stroke("hpiDiabetesHistory"),
    stroke("hpiRecentTrauma"),
  ],
  rosImportantPositives: [
    stroke("rosWeakness"),
    stroke("rosNumbness"),
    stroke("rosSpeechDifficulty"),
    stroke("rosVisionLoss"),
    stroke("rosFacialDroop"),
    stroke("rosHeadache"),
    stroke("rosConfusion"),
    stroke("rosDizziness"),
    stroke("rosGaitDifficulty"),
  ],
  rosImportantNegatives: [
    stroke("rosDeniesChestPain"),
    stroke("rosDeniesFever"),
    stroke("rosDeniesSeizure"),
    stroke("rosDeniesTrauma"),
    stroke("rosDeniesSyncope"),
    stroke("rosDeniesNeckStiffness"),
  ],
  rosRedFlags: [
    stroke("rfRapidNeurologicDecline"),
    stroke("rfAlteredMentalStatus"),
    stroke("rfPersistentFocalDeficit"),
    stroke("rfAirwayCompromiseConcern"),
    stroke("rfIntracranialHemorrhageConcern"),
  ],
  physicalExam: {
    neuroPsych: [
      stroke("examFacialAsymmetryPresent"),
      stroke("examSpeechSlurringNoted"),
      stroke("examUnilateralWeaknessNoted"),
      stroke("examSensationDeficitPresent"),
      stroke("examPronatorDriftPresent"),
      stroke("examGaitInstabilityNoted"),
      stroke("examNihssPerformed"),
      stroke("examAlertOriented"),
      stroke("examCranialNervesIntact"),
      stroke("examStrengthSymmetric"),
      stroke("examNoFocalDeficitOnReassessment"),
      stroke("examFollowsCommands"),
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
    stroke("diffTia"),
    stroke("diffIntracranialHemorrhage"),
    stroke("diffSeizurePostIctal"),
    stroke("diffComplexMigraine"),
    stroke("diffMetabolicEncephalopathy"),
    stroke("diffBellPalsy"),
    stroke("diffVertigo"),
    stroke("diffMassLesion"),
    stroke("diffMedicationIntoxication"),
  ],
  mdmDataReviewed: [
    stroke("mdmCtHeadReviewed"),
    stroke("mdmCtaHeadNeckReviewed"),
    stroke("mdmGlucoseReviewed"),
    stroke("mdmNihssDocumentedIfUsed"),
    stroke("mdmEcgReviewed"),
    stroke("mdmExternalRecordsReviewed"),
  ],
  mdmClinicalRationale: [
    stroke("mdmLastKnownWellDocumented"),
    stroke("mdmStrokeAlertActivated"),
    stroke("mdmTimeSensitiveWorkflowReviewed"),
    stroke("mdmThrombolyticEligibilityConsidered"),
    stroke("mdmRiskBenefitDiscussionDocumented"),
    stroke("mdmAnticoagulationStatusReviewed"),
  ],
  mdmPlanSummary: [
    stroke("mdmNeurologyConsulted"),
    stroke("mdmTransferStrokeCenterConsidered"),
    stroke("mdmSerialNeuroReassessmentsPerformed"),
    stroke("mdmAdmissionNeuroMonitoring"),
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
    stroke("reassessNeurologicStatusUnchanged"),
    stroke("reassessSymptomsImproved"),
    stroke("reassessHemodynamicallyStable"),
  ],
  followUpDisposition: [
    stroke("dispAdmissionStrokeEvaluation"),
    stroke("dispTransferHigherNeuroCare"),
    stroke("dispDischargeReassuringEvaluation"),
    stroke("dispStrictReturnPrecautions"),
    stroke("dispStrokeEducationReviewed"),
  ],
});

/** Headache — ACEP red flags / secondary headache workup framework. */
export const HEADACHE_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    headache("hpiThunderclapConcern"),
    headache("hpiSuddenSevereOnset"),
    headache("hpiGradualOnset"),
    headache("hpiPriorMigraineHistory"),
    headache("hpiPhotophobia"),
    headache("hpiPhonophobia"),
    headache("hpiNeckPain"),
    headache("hpiNeckStiffnessConcern"),
    headache("hpiFeverSymptoms"),
    headache("hpiVisualChanges"),
    headache("hpiWorstHeadacheOfLife"),
    headache("hpiTraumaReviewed"),
    headache("hpiAnticoagulantUse"),
    headache("hpiNauseaVomiting"),
    headache("hpiSimilarPriorHeadaches"),
    headache("hpiHeadacheImproving"),
    headache("hpiHeadachePersistent"),
    headache("hpiPositional"),
    headache("hpiWorseWithValsalva"),
    headache("hpiExertionalOnset"),
    headache("hpiRecentLpReviewed"),
    headache("hpiPregnancyConcern"),
    headache("hpiImmunocompromised"),
  ],
  rosImportantPositives: [
    headache("rosHeadache"),
    headache("rosPhotophobia"),
    headache("rosVomiting"),
    headache("rosVisualChanges"),
    headache("rosDizziness"),
    headache("rosNeckPain"),
    headache("rosFever"),
  ],
  rosImportantNegatives: [
    headache("rosDeniesFocalWeakness"),
    headache("rosDeniesSeizure"),
    headache("rosDeniesSyncope"),
    headache("rosDeniesTrauma"),
    headache("rosDeniesConfusion"),
  ],
  rosRedFlags: [
    headache("rfMeningitisConcern"),
    headache("rfSahConcern"),
    headache("rfAlteredMentalStatus"),
    headache("rfNeuroDeficit"),
    headache("rfPapilledemaConcern"),
  ],
  physicalExam: {
    heent: [headache("examPerrla"), headache("examNeckSupple"), headache("examMeningealSignsAbsent")],
    neuroPsych: [
      headache("examAlertOriented"),
      headache("examCranialNervesIntact"),
      headache("examPhotophobiaPresent"),
      headache("examNoFocalNeuroDeficit"),
      headache("examNormalGait"),
      headache("examNeckStiffnessNoted"),
      headache("examFocalDeficitNoted"),
    ],
    general: [headache("examUncomfortableAppearing")],
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
    headache("diffIntracranialHemorrhage"),
    headache("diffMassLesion"),
    headache("diffTemporalArteritis"),
    headache("diffHypertensiveEmergency"),
    headache("diffSinusitis"),
    headache("diffPostTraumaticHeadache"),
  ],
  mdmDataReviewed: [
    headache("mdmCtHeadReviewed"),
    headache("mdmLpConsidered"),
    headache("mdmLabsReviewed"),
    headache("mdmEsrCrpIfIndicated"),
  ],
  mdmClinicalRationale: [
    headache("mdmRedFlagsEvaluated"),
    headache("mdmMeningitisConsidered"),
    headache("mdmNeurologicExamReassessed"),
  ],
  mdmPlanSummary: [
    headache("mdmMigraineTreatmentInitiated"),
    headache("mdmSerialReassessmentPerformed"),
    headache("mdmReturnPrecautionsDiscussed"),
  ],
  mdmImmediateActionsRationale: [headache("mdmIvFluidsAnalgesiaPlan")],
  mdmAdmitObserveDischarge: [
    headache("mdmAdmissionConsidered"),
    headache("mdmObservationConsidered"),
  ],
  reassessment: [
    headache("reassessPainImprovedAfterTreatment"),
    headache("reassessRepeatNeuroExam"),
    headache("reassessToleratingPo"),
    headache("reassessAmbulatoryWithoutDifficulty"),
  ],
  followUpDisposition: [
    headache("dispDischargeAfterImprovement"),
    headache("dispObservationConsidered"),
    headache("dispAdmissionConsidered"),
    headache("dispNeurologyConsultConsidered"),
    headache("dispReturnThunderclapPrecautions"),
    headache("dispReturnWorseningHeadache"),
  ],
});

/** Dizziness / syncope — ACEP serious-cause evaluation framework. */
export const DIZZINESS_SYNCOPE_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    dizz("hpiTrueVertigo"),
    dizz("hpiLightheadedness"),
    dizz("hpiSyncopeEvent"),
    dizz("hpiPresyncope"),
    dizz("hpiExertionalSyncope"),
    dizz("hpiPalpitationsBeforeEvent"),
    dizz("hpiOrthostaticSymptoms"),
    dizz("hpiFallAssociated"),
    dizz("hpiHeadInjuryReviewed"),
    dizz("hpiSuddenOnset"),
    dizz("hpiPositional"),
    dizz("hpiPersistentDizziness"),
    dizz("hpiIntermittentEpisodes"),
    dizz("hpiCardiacHistory"),
    dizz("hpiNeurologicSymptomsReviewed"),
    dizz("hpiProdromeReviewed"),
    dizz("hpiChestPainBeforeEvent"),
    dizz("hpiSeizureLikeActivityReviewed"),
    dizz("hpiMedicationReview"),
    dizz("hpiPriorSyncope"),
    dizz("hpiVolumeDepletion"),
    dizz("hpiPostEventConfusion"),
    dizz("hpiInjuryFromFallReviewed"),
  ],
  rosImportantPositives: [
    dizz("rosDizziness"),
    dizz("rosSyncope"),
    dizz("rosPalpitations"),
    dizz("rosWeakness"),
    dizz("rosNausea"),
    dizz("rosGaitInstability"),
  ],
  rosImportantNegatives: [
    dizz("rosDeniesChestPain"),
    dizz("rosDeniesShortnessOfBreath"),
    dizz("rosDeniesSeizure"),
    dizz("rosDeniesFocalWeakness"),
    dizz("rosDeniesFever"),
  ],
  rosRedFlags: [
    dizz("rfCardiogenicSyncopeConcern"),
    dizz("rfArrhythmiaConcern"),
    dizz("rfStrokeConcern"),
    dizz("rfPersistentNeuroDeficit"),
    dizz("rfUnstableGait"),
  ],
  physicalExam: {
    cardiovascular: [
      dizz("examNormalCardiacRhythm"),
      dizz("examCardioTachycardic"),
      dizz("examMurmurAppreciated"),
      dizz("examOrthostaticVitalsReviewed"),
      dizz("examPeripheralPulsesPresent"),
    ],
    neuroPsych: [
      dizz("examSteadyGait"),
      dizz("examUnsteadyGait"),
      dizz("examNormalCerebellarTesting"),
      dizz("examNystagmusPresent"),
      dizz("examAlertOriented"),
      dizz("examNoFocalNeuroDeficit"),
      dizz("examFollowsCommands"),
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
    dizz("diffAcsEquivalent"),
    dizz("diffPosteriorStroke"),
    dizz("diffBppv"),
    dizz("diffVestibularNeuritis"),
    dizz("diffDehydration"),
    dizz("diffAnemia"),
    dizz("diffMedicationEffect"),
  ],
  mdmDataReviewed: [
    dizz("mdmEcgReviewed"),
    dizz("mdmOrthostaticVitalsPerformed"),
    dizz("mdmTelemetryConsidered"),
    dizz("mdmTroponinIfIndicated"),
    dizz("mdmGlucoseReviewed"),
    dizz("mdmHemoglobinIfIndicated"),
    dizz("mdmCtHeadIfIndicated"),
  ],
  mdmClinicalRationale: [
    dizz("mdmPosteriorStrokeConsidered"),
    dizz("mdmSeriousCauseEvaluationDocumented"),
    dizz("mdmVolumeStatusAssessed"),
    dizz("mdmFallRiskDiscussed"),
    dizz("mdmSharedDecisionMakingDocumented"),
  ],
  mdmPlanSummary: [
    dizz("mdmCardiacMonitoringInitiated"),
    dizz("mdmIvFluidsIfIndicated"),
    dizz("mdmSerialReassessmentPerformed"),
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
    dizz("reassessAmbulatoryReassessment"),
    dizz("reassessDizzinessImproved"),
    dizz("reassessRepeatNeuroExamStable"),
    dizz("reassessHemodynamicallyStable"),
    dizz("reassessRepeatOrthostatics"),
  ],
  followUpDisposition: [
    dizz("dispSafeDischargeAfterReassessment"),
    dizz("dispAdmissionTelemetryMonitoring"),
    dizz("dispTransferConsidered"),
    dizz("dispReturnPrecautionsDiscussed"),
    dizz("dispNoDrivingUntilCleared"),
  ],
});

/** Psychiatric / behavioral — ACEP psychiatric emergency / safety documentation framework. */
export const PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    psych("hpiSuicidalIdeationReported"),
    psych("hpiHomicidalIdeationReported"),
    psych("hpiHallucinationsReported"),
    psych("hpiParanoiaReported"),
    psych("hpiAgitationReported"),
    psych("hpiAnxietySymptomsReported"),
    psych("hpiDepressiveSymptomsReported"),
    psych("hpiSubstanceUseReviewed"),
    psych("hpiMedicationNonadherenceReviewed"),
    psych("hpiRecentStressorReported"),
    psych("hpiPriorPsychiatricHistoryReviewed"),
    psych("hpiPriorSuicideAttemptReviewed"),
    psych("hpiAccessToWeaponsReviewed"),
    psych("hpiInvoluntaryHoldCriteriaConsidered"),
    psych("hpiCollateralInformationReviewed"),
  ],
  rosImportantPositives: [
    psych("rosAnxiety"),
    psych("rosDepression"),
    psych("rosHallucinations"),
    psych("rosSuicidalThoughts"),
    psych("rosHomicidalThoughts"),
    psych("rosInsomnia"),
    psych("rosSubstanceUse"),
  ],
  rosImportantNegatives: [
    psych("rosDeniesSuicidalIdeation"),
    psych("rosDeniesHomicidalIdeation"),
    psych("rosDeniesHallucinations"),
    psych("rosDeniesIngestion"),
    psych("rosDeniesTrauma"),
  ],
  rosRedFlags: [
    psych("rfActiveSuicidalIdeation"),
    psych("rfHomicidalIdeation"),
    psych("rfCommandHallucinations"),
    psych("rfSevereAgitation"),
    psych("rfIntoxicationConcern"),
    psych("rfOverdoseIngestionConcern"),
    psych("rfUnableToContractForSafety"),
    psych("rfUnsafeDischargeEnvironment"),
  ],
  physicalExam: {
    general: [psych("examNoAcuteMedicalDistress")],
    neuroPsych: [
      psych("examAlertOriented"),
      psych("examCooperative"),
      psych("examAgitated"),
      psych("examTearful"),
      psych("examAnxious"),
      psych("examDepressedAffect"),
      psych("examPressuredSpeech"),
      psych("examDisorganizedThoughtProcess"),
      psych("examHallucinationsNoted"),
      psych("examNoFocalNeuroDeficit"),
    ],
  },
  mdmWorkingAssessment: [
    psych("mdmSuicideRiskAssessed"),
    psych("mdmHomicidalRiskAssessed"),
  ],
  mdmDifferentialSynthesis: [
    psych("diffSuicidalIdeation"),
    psych("diffHomicidalIdeation"),
    psych("diffPsychosis"),
    psych("diffMajorDepression"),
    psych("diffAnxietyPanicReaction"),
    psych("diffSubstanceIntoxication"),
    psych("diffSubstanceWithdrawal"),
    psych("diffMedicationEffect"),
    psych("diffDeliriumMedicalCause"),
    psych("diffBehavioralCrisis"),
  ],
  mdmDataReviewed: [
    psych("mdmCollateralInformationReviewed"),
    psych("mdmMedicalClearanceEvaluationPerformed"),
    psych("mdmIntoxicationWithdrawalConsidered"),
  ],
  mdmClinicalRationale: [
    psych("mdmSafetyPlanConsidered"),
    psych("mdmInvoluntaryHoldConsidered"),
    psych("mdmObservationRequiredForSafety"),
  ],
  mdmPlanSummary: [
    psych("mdmPsychiatricConsultationRequested"),
    psych("mdmTransferAdmissionPsychStabilizationConsidered"),
    psych("mdmPatientPlacedOnSafetyPrecautions"),
  ],
  mdmImmediateActionsRationale: [psych("mdmSafetyPrecautionsInitiatedIfIndicated")],
  mdmAdmitObserveDischarge: [
    psych("mdmPsychiatricAdmissionConsidered"),
    psych("mdmPsychiatricTransferConsidered"),
    psych("mdmObservationConsidered"),
  ],
  reassessment: [
    psych("reassessBehaviorReassessed"),
    psych("reassessPatientCalmOnReassessment"),
    psych("reassessSafetyStatusReassessed"),
    psych("reassessAgitationImproved"),
    psych("reassessContinuesToRequireObservation"),
  ],
  followUpDisposition: [
    psych("dispPsychiatricAdmissionConsidered"),
    psych("dispPsychiatricTransferConsidered"),
    psych("dispDischargedWithSafetyPlan"),
    psych("dispCrisisResourcesProvided"),
    psych("dispReturnPrecautionsDiscussed"),
    psych("dispPatientNotSafeForDischarge"),
    psych("dispInvoluntaryHoldDispositionDocumented"),
  ],
});

/** Weakness — broad ED weakness differential (SAEM / neurologic-medical clearance framework). */
export const WEAKNESS_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    weak("hpiGeneralizedWeakness"),
    weak("hpiFocalWeakness"),
    weak("hpiAcuteOnset"),
    weak("hpiGradualOnset"),
    weak("hpiAssociatedDizziness"),
    weak("hpiAssociatedFatigue"),
    weak("hpiAssociatedFever"),
    weak("hpiPoorOralIntake"),
    weak("hpiRecentIllness"),
    weak("hpiMedicationChangeReviewed"),
    weak("hpiNeurologicSymptomsReviewed"),
    weak("hpiFallRiskReviewed"),
    weak("hpiBaselineFunctionalStatusReviewed"),
    weak("hpiCaregiverHistorianUsedIfApplicable"),
  ],
  rosImportantPositives: [
    weak("rosWeakness"),
    weak("rosFatigue"),
    weak("rosDizziness"),
    weak("rosFever"),
    weak("rosDecreasedAppetite"),
    weak("rosGaitDifficulty"),
  ],
  rosImportantNegatives: [
    weak("rosDeniesFocalNeuroDeficit"),
    weak("rosDeniesChestPain"),
    weak("rosDeniesShortnessOfBreath"),
    weak("rosDeniesSyncope"),
    weak("rosDeniesFever"),
    weak("rosDeniesTrauma"),
  ],
  rosRedFlags: [
    weak("rfFocalWeakness"),
    weak("rfAlteredMentalStatus"),
    weak("rfInabilityToAmbulate"),
    weak("rfSepsisConcern"),
    weak("rfStrokeConcern"),
    weak("rfSevereDehydrationConcern"),
  ],
  physicalExam: {
    general: [weak("examAlertOriented"), weak("examNoAcuteDistress"), weak("examNoRespiratoryDistress")],
    heent: [weak("examDryMucousMembranes")],
    cardiovascular: [weak("examTachycardic")],
    neuroPsych: [
      weak("examNoFocalNeuroDeficit"),
      weak("examFocalWeaknessNoted"),
      weak("examStrengthSymmetric"),
      weak("examGaitSteady"),
      weak("examGaitUnstable"),
    ],
  },
  mdmWorkingAssessment: [weak("mdmBroadWeaknessDifferentialConsidered")],
  mdmDifferentialSynthesis: [
    weak("diffDehydration"),
    weak("diffElectrolyteAbnormality"),
    weak("diffInfectionSepsis"),
    weak("diffAnemia"),
    weak("diffStrokeTia"),
    weak("diffAcsEquivalent"),
    weak("diffMedicationAdverseEffect"),
    weak("diffDeconditioning"),
    weak("diffHypoHyperglycemia"),
    weak("diffRenalDysfunction"),
  ],
  mdmDataReviewed: [
    weak("mdmLabsReviewed"),
    weak("mdmElectrolytesReviewed"),
    weak("mdmEcgReviewed"),
    weak("mdmGlucoseReviewedIfObtained"),
  ],
  mdmClinicalRationale: [
    weak("mdmInfectionEvaluationPerformed"),
    weak("mdmNeurologicExamReassessed"),
    weak("mdmSafeDischargeAbilityAssessed"),
  ],
  mdmPlanSummary: [
    weak("mdmIvFluidsAdministeredIfIndicated"),
    weak("mdmAmbulationTrialPerformed"),
    weak("mdmSerialReassessmentPerformed"),
  ],
  mdmImmediateActionsRationale: [weak("mdmFallPrecautionsIfIndicated")],
  mdmAdmitObserveDischarge: [
    weak("mdmAdmissionConsidered"),
    weak("mdmObservationConsidered"),
  ],
  reassessment: [
    weak("reassessWeaknessImprovedAfterTreatment"),
    weak("reassessAmbulatoryReassessmentPerformed"),
    weak("reassessRepeatNeuroExamUnchanged"),
    weak("reassessVitalSignsStable"),
  ],
  followUpDisposition: [
    weak("dispDischargedAfterImprovement"),
    weak("dispAdmissionForWeaknessEvaluation"),
    weak("dispObservationConsidered"),
    weak("dispReturnPrecautionsDiscussed"),
    weak("dispFollowUpRecommended"),
  ],
});

/** Flank pain / renal colic — ED urologic emergency workup framework. */
export const FLANK_PAIN_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    flank("hpiFlankPain"),
    flank("hpiColickyPain"),
    flank("hpiRadiatingToGroin"),
    flank("hpiSuddenOnset"),
    flank("hpiNauseaVomiting"),
    flank("hpiHematuriaReported"),
    flank("hpiDysuriaReported"),
    flank("hpiFeverReviewed"),
    flank("hpiPriorKidneyStoneHistory"),
    flank("hpiPregnancyConcernReviewed"),
    flank("hpiUrinaryRetentionReviewed"),
    flank("hpiSolitaryKidneyHistoryReviewed"),
  ],
  rosImportantPositives: [
    flank("rosFlankPain"),
    flank("rosHematuria"),
    flank("rosDysuria"),
    flank("rosNausea"),
    flank("rosVomiting"),
    flank("rosFever"),
    flank("rosUrinaryFrequency"),
  ],
  rosImportantNegatives: [
    flank("rosDeniesFever"),
    flank("rosDeniesDysuria"),
    flank("rosDeniesTesticularPain"),
    flank("rosDeniesAbdominalPain"),
    flank("rosDeniesPregnancyConcern"),
    flank("rosDeniesUrinaryRetention"),
  ],
  rosRedFlags: [
    flank("rfFeverWithFlankPain"),
    flank("rfSolitaryKidneyConcern"),
    flank("rfUncontrolledPain"),
    flank("rfPersistentVomiting"),
    flank("rfAcuteKidneyInjuryConcern"),
    flank("rfObstructingStoneConcern"),
    flank("rfInfectedStoneConcern"),
  ],
  physicalExam: {
    general: [flank("examUncomfortableAppearing"), flank("examDehydratedAppearance")],
    abdomen: [
      flank("examCvaTendernessPresent"),
      flank("examAbdomenSoft"),
      flank("examAbdomenNonTender"),
      flank("examSuprapubicTenderness"),
      flank("examNoPeritonealSigns"),
      flank("examTesticularExamConsideredIfIndicated"),
    ],
  },
  mdmWorkingAssessment: [
    flank("mdmRenalColicConsidered"),
    flank("mdmInfectedStoneConsidered"),
  ],
  mdmDifferentialSynthesis: [
    flank("diffRenalColic"),
    flank("diffUreterolithiasis"),
    flank("diffPyelonephritis"),
    flank("diffUti"),
    flank("diffObstructingInfectedStone"),
    flank("diffMusculoskeletalPain"),
    flank("diffAppendicitis"),
    flank("diffOvarianTesticularPathology"),
    flank("diffAbdominalAorticAneurysm"),
    flank("diffRenalInsufficiency"),
  ],
  mdmDataReviewed: [
    flank("mdmUrinalysisReviewed"),
    flank("mdmRenalFunctionReviewed"),
    flank("mdmCtRenalStoneProtocolReviewed"),
    flank("mdmUltrasoundReviewedIfObtained"),
  ],
  mdmClinicalRationale: [
    flank("mdmPainControlProvided"),
    flank("mdmAntiemeticTherapyProvided"),
    flank("mdmOutpatientUrologyFollowUpDiscussed"),
  ],
  mdmPlanSummary: [
    flank("mdmUrologyConsultationConsidered"),
    flank("mdmSerialReassessmentPerformed"),
  ],
  mdmImmediateActionsRationale: [flank("mdmIvFluidsIfIndicated")],
  mdmAdmitObserveDischarge: [
    flank("mdmAdmissionConsidered"),
    flank("mdmObservationConsidered"),
  ],
  reassessment: [
    flank("reassessPainImprovedAfterTreatment"),
    flank("reassessNauseaImprovedAfterTreatment"),
    flank("reassessToleratingOralIntake"),
    flank("reassessRepeatFlankExamUnchanged"),
    flank("reassessVitalSignsStable"),
  ],
  followUpDisposition: [
    flank("dispDischargedWithUrologyFollowUp"),
    flank("dispAdmissionInfectedObstructingStoneConsidered"),
    flank("dispReturnForFeverVomitingUncontrolledPain"),
    flank("dispReturnPrecautionsDiscussed"),
    flank("dispUrineStrainerInstructionsDiscussedIfApplicable"),
  ],
});

/** URI / respiratory symptoms — viral URI / upper respiratory infection documentation framework. */
export const URI_RESPIRATORY_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    uri("hpiNasalCongestion"),
    uri("hpiRhinorrhea"),
    uri("hpiSoreThroat"),
    uri("hpiCough"),
    uri("hpiSinusPressure"),
    uri("hpiEarPain"),
    uri("hpiFeverSymptoms"),
    uri("hpiSickContacts"),
    uri("hpiRecentTravel"),
    uri("hpiSymptomDurationReviewed"),
    uri("hpiCovidFluExposureReviewed"),
    uri("hpiImmunocompromisedStatusReviewed"),
  ],
  rosImportantPositives: [
    uri("rosCongestion"),
    uri("rosSoreThroat"),
    uri("rosCough"),
    uri("rosFever"),
    uri("rosMyalgias"),
    uri("rosEarPain"),
  ],
  rosImportantNegatives: [
    uri("rosDeniesShortnessOfBreath"),
    uri("rosDeniesChestPain"),
    uri("rosDeniesNeckStiffness"),
    uri("rosDeniesInabilityToToleratePo"),
    uri("rosDeniesSevereHeadache"),
  ],
  rosRedFlags: [
    uri("rfRespiratoryDistress"),
    uri("rfHypoxia"),
    uri("rfImmunocompromisedPatient"),
    uri("rfPersistentFever"),
    uri("rfDehydrationConcern"),
    uri("rfAirwaySwellingConcern"),
  ],
  physicalExam: {
    general: [uri("examWellAppearing")],
    heent: [
      uri("examNasalCongestionPresent"),
      uri("examPharyngealErythema"),
      uri("examTonsillarExudate"),
      uri("examTympanicMembraneAbnormality"),
      uri("examCervicalLymphadenopathy"),
      uri("examNoMeningismus"),
    ],
    respiratory: [uri("examNoRespiratoryDistress"), uri("examClearBreathSounds")],
  },
  mdmWorkingAssessment: [uri("mdmViralSyndromeConsidered"), uri("mdmPneumoniaConsidered")],
  mdmDifferentialSynthesis: [
    uri("diffViralUri"),
    uri("diffCovid19"),
    uri("diffInfluenza"),
    uri("diffRsvLikeIllness"),
    uri("diffStrepPharyngitis"),
    uri("diffOtitisMedia"),
    uri("diffSinusitis"),
    uri("diffPneumonia"),
    uri("diffAllergicRhinitis"),
  ],
  mdmDataReviewed: [uri("mdmCovidFluStrepTestingConsidered")],
  mdmClinicalRationale: [
    uri("mdmAntibioticStewardshipDiscussed"),
    uri("mdmHydrationStatusAssessed"),
    uri("mdmReturnPrecautionsDiscussed"),
  ],
  mdmPlanSummary: [uri("mdmSymptomaticTreatmentRecommended")],
  mdmImmediateActionsRationale: [uri("mdmOxygenIfIndicated")],
  mdmAdmitObserveDischarge: [uri("mdmAdmissionConsideredIfRedFlags")],
  reassessment: [
    uri("reassessRemainsWellAppearing"),
    uri("reassessToleratingOralIntake"),
    uri("reassessRespiratoryStatusStable"),
    uri("reassessFeverImprovedAfterTreatment"),
  ],
  followUpDisposition: [
    uri("dispDischargeSupportiveCare"),
    uri("dispReturnForRespiratoryDistress"),
    uri("dispReturnForDehydration"),
    uri("dispPcpFollowUpRecommended"),
  ],
});

/** Fever — ED fever source / sepsis red-flag documentation framework. */
export const FEVER_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    feb("hpiFeverDurationReviewed"),
    feb("hpiMaximumTemperatureReviewed"),
    feb("hpiAntipyreticUseReviewed"),
    feb("hpiSickContactsReviewed"),
    feb("hpiRecentTravelReviewed"),
    feb("hpiImmunocompromisedStatusReviewed"),
    feb("hpiVaccinationStatusReviewedIfPediatric"),
    feb("hpiUrinarySymptomsReviewed"),
    feb("hpiRespiratorySymptomsReviewed"),
    feb("hpiAbdominalSymptomsReviewed"),
    feb("hpiRashReviewed"),
    feb("hpiHeadacheNeckStiffnessReviewed"),
  ],
  rosImportantPositives: [
    feb("rosFever"),
    feb("rosChills"),
    feb("rosMyalgias"),
    feb("rosCough"),
    feb("rosDysuria"),
    feb("rosVomiting"),
    feb("rosDiarrhea"),
    feb("rosRash"),
  ],
  rosImportantNegatives: [
    feb("rosDeniesNeckStiffness"),
    feb("rosDeniesShortnessOfBreath"),
    feb("rosDeniesChestPain"),
    feb("rosDeniesSevereHeadache"),
    feb("rosDeniesAbdominalPain"),
    feb("rosDeniesUrinarySymptoms"),
  ],
  rosRedFlags: [
    feb("rfSepsisConcern"),
    feb("rfAlteredMentalStatus"),
    feb("rfHypotension"),
    feb("rfPersistentTachycardia"),
    feb("rfImmunocompromised"),
    feb("rfMeningitisConcern"),
    feb("rfDehydrationConcern"),
  ],
  physicalExam: {
    general: [
      feb("examFebrileAppearance"),
      feb("examNonToxicAppearing"),
      feb("examToxicAppearing"),
      feb("examDryMucousMembranes"),
      feb("examPerfusionAssessed"),
    ],
    heent: [feb("examNoMeningismus"), feb("examNoRash")],
    respiratory: [feb("examLungsClear")],
    abdomen: [feb("examAbdomenSoft")],
  },
  mdmWorkingAssessment: [feb("mdmFeverSourceEvaluated"), feb("mdmSepsisConsidered")],
  mdmDifferentialSynthesis: [
    feb("diffViralSyndrome"),
    feb("diffInfluenza"),
    feb("diffCovid19"),
    feb("diffPneumonia"),
    feb("diffUtiPyelonephritis"),
    feb("diffSepsis"),
    feb("diffMeningitis"),
    feb("diffCellulitis"),
    feb("diffGastroenteritis"),
    feb("diffIntraAbdominalInfection"),
  ],
  mdmDataReviewed: [
    feb("mdmLabsReviewed"),
    feb("mdmUrinalysisReviewed"),
    feb("mdmChestXrayReviewed"),
    feb("mdmViralTestingReviewed"),
  ],
  mdmClinicalRationale: [
    feb("mdmIvFluidsAdministeredIfIndicated"),
    feb("mdmAntibioticsConsidered"),
    feb("mdmSerialVitalSignsReviewed"),
  ],
  mdmPlanSummary: [feb("mdmAdmissionConsidered")],
  mdmImmediateActionsRationale: [feb("mdmAntipyreticProvidedIfIndicated")],
  mdmAdmitObserveDischarge: [feb("mdmObservationConsidered")],
  reassessment: [
    feb("reassessFeverImprovedAfterAntipyretic"),
    feb("reassessVitalsImprovedOnReassessment"),
    feb("reassessRemainsNonToxicAppearing"),
    feb("reassessToleratingOralIntake"),
  ],
  followUpDisposition: [
    feb("dispDischargeReassuringEvaluation"),
    feb("dispAdmissionPersistentAbnormalVitals"),
    feb("dispReturnWorseningFever"),
    feb("dispFollowUpRecommended"),
  ],
});

/** Cough — ED cough / bronchitis / pneumonia workup documentation framework. */
export const COUGH_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    coughIntel("hpiCoughDurationReviewed"),
    coughIntel("hpiProductiveCough"),
    coughIntel("hpiDryCough"),
    coughIntel("hpiHemoptysisReviewed"),
    coughIntel("hpiChestPainReviewed"),
    coughIntel("hpiShortnessOfBreathReviewed"),
    coughIntel("hpiFeverReviewed"),
    coughIntel("hpiWheezingReviewed"),
    coughIntel("hpiSmokingHistoryReviewed"),
    coughIntel("hpiAsthmaCopdHistoryReviewed"),
    coughIntel("hpiSickContactsReviewed"),
  ],
  rosImportantPositives: [
    coughIntel("rosCough"),
    coughIntel("rosFever"),
    coughIntel("rosWheezing"),
    coughIntel("rosShortnessOfBreath"),
    coughIntel("rosChestTightness"),
    coughIntel("rosMyalgias"),
  ],
  rosImportantNegatives: [
    coughIntel("rosDeniesHemoptysis"),
    coughIntel("rosDeniesChestPain"),
    coughIntel("rosDeniesSevereShortnessOfBreath"),
    coughIntel("rosDeniesLegSwelling"),
    coughIntel("rosDeniesSyncope"),
  ],
  rosRedFlags: [
    coughIntel("rfHypoxia"),
    coughIntel("rfHemoptysis"),
    coughIntel("rfRespiratoryDistress"),
    coughIntel("rfPneumoniaConcern"),
    coughIntel("rfPeConcern"),
    coughIntel("rfChfConcern"),
  ],
  physicalExam: {
    general: [coughIntel("examSpeakingFullSentences")],
    respiratory: [
      coughIntel("examNoRespiratoryDistress"),
      coughIntel("examClearBreathSounds"),
      coughIntel("examWheezing"),
      coughIntel("examRhonchi"),
      coughIntel("examCrackles"),
      coughIntel("examDiminishedBreathSounds"),
      coughIntel("examOxygenSaturationReviewed"),
    ],
  },
  mdmWorkingAssessment: [
    coughIntel("mdmPneumoniaConsidered"),
    coughIntel("mdmPeConsideredBasedOnRiskFactors"),
  ],
  mdmDifferentialSynthesis: [
    coughIntel("diffViralBronchitis"),
    coughIntel("diffPneumonia"),
    coughIntel("diffAsthmaExacerbation"),
    coughIntel("diffCopdExacerbation"),
    coughIntel("diffCovid19"),
    coughIntel("diffInfluenza"),
    coughIntel("diffChf"),
    coughIntel("diffPulmonaryEmbolism"),
    coughIntel("diffGerdPostnasalDrip"),
  ],
  mdmDataReviewed: [
    coughIntel("mdmChestXrayConsideredReviewed"),
    coughIntel("mdmViralTestingConsideredReviewed"),
  ],
  mdmClinicalRationale: [
    coughIntel("mdmBronchodilatorTherapyConsidered"),
    coughIntel("mdmAntibioticsConsideredIfBacterialConcern"),
    coughIntel("mdmOxygenRequirementAssessed"),
    coughIntel("mdmDischargeSafetyAssessed"),
  ],
  mdmPlanSummary: [coughIntel("mdmSerialReassessmentPerformed")],
  mdmImmediateActionsRationale: [coughIntel("mdmOxygenIfIndicated")],
  mdmAdmitObserveDischarge: [
    coughIntel("mdmAdmissionConsidered"),
    coughIntel("mdmObservationConsidered"),
  ],
  reassessment: [
    coughIntel("reassessCoughRespiratorySymptomsStable"),
    coughIntel("reassessBreathingImprovedAfterTreatment"),
    coughIntel("reassessOxygenSaturationStable"),
    coughIntel("reassessNoIncreasedWorkOfBreathing"),
  ],
  followUpDisposition: [
    coughIntel("dispSupportiveCareDiscussed"),
    coughIntel("dispReturnWorseningShortnessOfBreath"),
    coughIntel("dispReturnChestPainOrHemoptysis"),
    coughIntel("dispPcpFollowUpRecommended"),
  ],
});

/** Asthma / wheezing — GINA/NHLBI exacerbation documentation framework. */
export const ASTHMA_WHEEZING_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    asthma("hpiWheezing"),
    asthma("hpiChestTightness"),
    asthma("hpiShortnessOfBreath"),
    asthma("hpiCough"),
    asthma("hpiTriggerExposureReviewed"),
    asthma("hpiRescueInhalerUseReviewed"),
    asthma("hpiPriorHospitalizationReviewed"),
    asthma("hpiPriorIntubationReviewed"),
    asthma("hpiSteroidUseReviewed"),
    asthma("hpiMedicationAccessReviewed"),
    asthma("hpiUriTriggerSuspected"),
  ],
  rosImportantPositives: [
    asthma("rosWheezing"),
    asthma("rosShortnessOfBreath"),
    asthma("rosChestTightness"),
    asthma("rosCough"),
  ],
  rosImportantNegatives: [
    asthma("rosDeniesChestPain"),
    asthma("rosDeniesFever"),
    asthma("rosDeniesHemoptysis"),
    asthma("rosDeniesSyncope"),
  ],
  rosRedFlags: [
    asthma("rfSevereRespiratoryDistress"),
    asthma("rfHypoxia"),
    asthma("rfSilentChestConcern"),
    asthma("rfPriorIntubation"),
    asthma("rfPoorBronchodilatorResponse"),
    asthma("rfExhaustionConcern"),
  ],
  physicalExam: {
    general: [asthma("examSpeakingFullSentences")],
    respiratory: [
      asthma("examWheezingPresent"),
      asthma("examDiminishedBreathSounds"),
      asthma("examIncreasedWorkOfBreathing"),
      asthma("examAccessoryMuscleUse"),
      asthma("examNoRespiratoryDistress"),
      asthma("examImprovedAerationAfterTreatment"),
      asthma("examOxygenSaturationReviewed"),
    ],
  },
  mdmWorkingAssessment: [asthma("mdmAsthmaExacerbationConsidered")],
  mdmDifferentialSynthesis: [
    asthma("diffAsthmaExacerbation"),
    asthma("diffCopdExacerbation"),
    asthma("diffPneumonia"),
    asthma("diffViralBronchospasm"),
    asthma("diffAllergicReaction"),
    asthma("diffForeignBodyAspiration"),
    asthma("diffChf"),
    asthma("diffPulmonaryEmbolism"),
  ],
  mdmDataReviewed: [asthma("mdmChestXrayConsideredIfAtypical")],
  mdmClinicalRationale: [
    asthma("mdmPeakFlowClinicalResponseAssessed"),
    asthma("mdmRepeatLungExamPerformed"),
    asthma("mdmOxygenRequirementAssessed"),
    asthma("mdmDischargeReadinessAssessed"),
  ],
  mdmPlanSummary: [
    asthma("mdmBronchodilatorTreatmentAdministered"),
    asthma("mdmSystemicSteroidConsideredAdministered"),
    asthma("mdmSerialReassessmentPerformed"),
  ],
  mdmImmediateActionsRationale: [asthma("mdmOxygenIfIndicated")],
  mdmAdmitObserveDischarge: [
    asthma("mdmAdmissionConsideredPersistentSymptoms"),
    asthma("mdmObservationConsidered"),
  ],
  reassessment: [
    asthma("reassessWheezingImproved"),
    asthma("reassessWorkOfBreathingImproved"),
    asthma("reassessOxygenSaturationStable"),
    asthma("reassessRepeatLungExamImproved"),
    asthma("reassessAbleToSpeakComfortably"),
  ],
  followUpDisposition: [
    asthma("dispDischargeInhalerSteroidPlan"),
    asthma("dispReturnWorseningBreathing"),
    asthma("dispAsthmaActionPlanReviewed"),
    asthma("dispAdmissionPersistentDistressConsidered"),
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
  psychiatric_behavioral: PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
  weakness: WEAKNESS_COMPLAINT_INTEL,
  flank_pain: FLANK_PAIN_COMPLAINT_INTEL,
  adult_uri_respiratory: URI_RESPIRATORY_COMPLAINT_INTEL,
  uri_respiratory: URI_RESPIRATORY_COMPLAINT_INTEL,
  fever: FEVER_COMPLAINT_INTEL,
  cough: COUGH_COMPLAINT_INTEL,
  asthma_wheezing: ASTHMA_WHEEZING_COMPLAINT_INTEL,
};

export const BATCH1_COMPLAINT_TEMPLATE_IDS = ["chest_pain", "sob", "abdominal_pain"] as const;
export const BATCH2_COMPLAINT_TEMPLATE_IDS = ["stroke_symptoms", "headache", "dizziness_syncope"] as const;
export const BATCH3_COMPLAINT_TEMPLATE_IDS = [
  "psychiatric_behavioral",
  "weakness",
  "flank_pain",
] as const;
export const BATCH4_COMPLAINT_TEMPLATE_IDS = [
  "adult_uri_respiratory",
  "fever",
  "cough",
  "asthma_wheezing",
] as const;
export const COMPLAINT_INTEL_TEMPLATE_IDS = [
  ...BATCH1_COMPLAINT_TEMPLATE_IDS,
  ...BATCH2_COMPLAINT_TEMPLATE_IDS,
  ...BATCH3_COMPLAINT_TEMPLATE_IDS,
  ...BATCH4_COMPLAINT_TEMPLATE_IDS,
  "uri_respiratory",
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

export function complaintIntelligenceHasDuplicateKeys(bundle: ProviderDocumentationComplaintIntelligence): boolean {
  const keys = flattenComplaintIntelligenceKeys(bundle);
  return new Set(keys).size !== keys.length;
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

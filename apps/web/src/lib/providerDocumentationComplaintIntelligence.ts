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
 * - Batch 5: ACEP trauma/head injury guidance; C-spine/CT head decision documentation; wound/laceration standards;
 *   orthopedic extremity injury and neurovascular exam documentation.
 * - Batch 6: AAP pediatric fever guidance; pediatric dehydration/gastroenteritis; pediatric asthma/wheezing;
 *   pediatric abdominal pain red flags; caregiver historian documentation standards.
 * - Batch 7: IDSA UTI concepts; ADA hyperglycemia/DKA; AHA/ACC hypertension emergency; allergy/anaphylaxis;
 *   dermatologic rash red-flag documentation.
 * - Batch 8: ED nausea/vomiting and diarrhea documentation; medication refill medico-legal standards;
 *   observation/reassessment and discharge readiness documentation.
 * - Batch 9: ACEP blunt trauma documentation; NEXUS/Canadian C-spine concepts; IPV/assault safety;
 *   spinal red flags and neurovascular exam documentation.
 * - Batch 10: ATLS crush/penetrating/burn documentation; pediatric trauma red flags;
 *   testicular torsion and pelvic/GYN ED documentation with chaperone-aware helpers.
 *
 * All fragments are click-to-insert only; never auto-inserted on template apply.
 */
import type {
  ProviderDocumentationExamSectionId,
  ProviderDocumentationTemplateStringField,
} from "./providerDocumentationModel";
import {
  buildAdultAbdominalPainComplaintIntel,
  buildPediatricAbdominalPainComplaintIntel,
} from "./providerDocumentationAbdominalPainComplaintIntelGoldStandard";
import { buildChestPainComplaintIntel } from "./providerDocumentationChestPainComplaintIntelGoldStandard";
import { buildCoughComplaintIntel, buildUriRespiratoryComplaintIntel } from "./providerDocumentationCoughUriComplaintIntelGoldStandard";
import { buildDizzinessSyncopeComplaintIntel } from "./providerDocumentationDizzinessVertigoComplaintIntelGoldStandard";
import { buildHeadacheComplaintIntel } from "./providerDocumentationHeadacheComplaintIntelGoldStandard";
import {
  buildAdultSobComplaintIntel,
  buildPediatricAsthmaSobComplaintIntel,
} from "./providerDocumentationShortnessOfBreathComplaintIntelGoldStandard";
import {
  buildAdultNauseaVomitingComplaintIntel,
  buildPediatricNauseaVomitingComplaintIntel,
} from "./providerDocumentationNauseaVomitingComplaintIntelGoldStandard";
import {
  GI_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationGiComplaintIntelligence19Mdm2";
import {
  RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";
import {
  CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  CARDIAC_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationCardiacComplaintIntelligence19Mdm4";
import {
  GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationGuRenalComplaintIntelligence19Mdm5";
import {
  MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import {
  EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL,
  INFECTIOUS_ENT_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import {
  ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationEndocrineMetabolicComplaintIntelligence19Mdm8";
import {
  NEURO_EXPANSION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";

export type ProviderDocumentationComplaintIntelligence = {
  hpi?: string[];
  rosImportantPositives?: string[];
  rosImportantNegatives?: string[];
  rosRedFlags?: string[];
  physicalExam?: Partial<Record<ProviderDocumentationExamSectionId, string[]>>;
  mdmWorkingAssessment?: string[];
  mdmDifferentialSynthesis?: string[];
  mdmDataReviewed?: string[];
  mdmRiskStratification?: string[];
  mdmClinicalRationale?: string[];
  clinicalImpression?: string[];
  mdmPlanSummary?: string[];
  mdmImmediateActionsRationale?: string[];
  mdmAdmitObserveDischarge?: string[];
  reassessment?: string[];
  followUpDisposition?: string[];
};

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const cp = (key: string) => `providerDocumentationComplaintIntel.chestPain.${key}`;
const ha = (key: string) => `providerDocumentationComplaintIntel.headache.${key}`;
const sob = (key: string) => `providerDocumentationComplaintIntel.sob.${key}`;
const abd = (key: string) => `providerDocumentationComplaintIntel.abdominal.${key}`;
const stroke = (key: string) => `providerDocumentationComplaintIntel.stroke.${key}`;
const dizz = (key: string) => `providerDocumentationComplaintIntel.dizzinessSyncope.${key}`;
const psych = (key: string) => `providerDocumentationComplaintIntel.psychiatricBehavioral.${key}`;
const weak = (key: string) => `providerDocumentationComplaintIntel.weakness.${key}`;
const flank = (key: string) => `providerDocumentationComplaintIntel.flankPain.${key}`;
const uri = (key: string) => `providerDocumentationComplaintIntel.uriRespiratory.${key}`;
const feb = (key: string) => `providerDocumentationComplaintIntel.fever.${key}`;
const coughIntel = (key: string) => `providerDocumentationComplaintIntel.cough.${key}`;
const asthma = (key: string) => `providerDocumentationComplaintIntel.asthmaWheezing.${key}`;
const fallIntel = (key: string) => `providerDocumentationComplaintIntel.fall.${key}`;
const headInj = (key: string) => `providerDocumentationComplaintIntel.headInjury.${key}`;
const lac = (key: string) => `providerDocumentationComplaintIntel.laceration.${key}`;
const frac = (key: string) => `providerDocumentationComplaintIntel.fractureConcern.${key}`;
const pedFeb = (key: string) => `providerDocumentationComplaintIntel.pediatricFever.${key}`;
const pedAbd = (key: string) => `providerDocumentationComplaintIntel.pediatricAbdominalPain.${key}`;
const pedAsthma = (key: string) => `providerDocumentationComplaintIntel.pediatricAsthmaWheezing.${key}`;
const pedGastro = (key: string) => `providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.${key}`;
const uti = (key: string) => `providerDocumentationComplaintIntel.utiUrinarySymptoms.${key}`;
const hyper = (key: string) => `providerDocumentationComplaintIntel.hyperglycemia.${key}`;
const ht = (key: string) => `providerDocumentationComplaintIntel.hypertension.${key}`;
const allergy = (key: string) => `providerDocumentationComplaintIntel.allergicReactionRash.${key}`;
const adultNv = (key: string) => `providerDocumentationComplaintIntel.adultNauseaVomiting.${key}`;
const adultDiarrhea = (key: string) => `providerDocumentationComplaintIntel.adultDiarrhea.${key}`;
const medRefill = (key: string) => `providerDocumentationComplaintIntel.medicationRefill.${key}`;
const obsReassess = (key: string) => `providerDocumentationComplaintIntel.observationReassessment.${key}`;
const mvcIntel = (key: string) => `providerDocumentationComplaintIntel.mvcCollision.${key}`;
const assaultIntel = (key: string) => `providerDocumentationComplaintIntel.assaultTrauma.${key}`;
const neckTrauma = (key: string) => `providerDocumentationComplaintIntel.neckPainTrauma.${key}`;
const backTrauma = (key: string) => `providerDocumentationComplaintIntel.backPainTrauma.${key}`;
const crushIntel = (key: string) => `providerDocumentationComplaintIntel.crushInjury.${key}`;
const penIntel = (key: string) => `providerDocumentationComplaintIntel.penetratingInjury.${key}`;
const burnIntel = (key: string) => `providerDocumentationComplaintIntel.burnInjury.${key}`;
const pedTraumaIntel = (key: string) => `providerDocumentationComplaintIntel.pediatricTrauma.${key}`;
const maleGenIntel = (key: string) => `providerDocumentationComplaintIntel.maleGenitalComplaint.${key}`;
const femaleGynIntel = (key: string) => `providerDocumentationComplaintIntel.femalePelvicGynComplaint.${key}`;

/** Chest pain — ACS / cardiopulmonary risk stratification (ACEP HEART / ACC-AHA). */
export const CHEST_PAIN_COMPLAINT_INTEL = buildChestPainComplaintIntel(cp);

/** Shortness of breath (adult) — cardiopulmonary / obstructive / PE framework. */
export const SOB_COMPLAINT_INTEL = buildAdultSobComplaintIntel(sob);

/** Abdominal pain — surgical / OB-GYN red flags (SAEM / StatPearls / ECAT). */
export const ABDOMINAL_COMPLAINT_INTEL = buildAdultAbdominalPainComplaintIntel(abd);

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
export const HEADACHE_COMPLAINT_INTEL = buildHeadacheComplaintIntel(ha);

/** Dizziness / syncope — ACEP serious-cause evaluation framework. */
export const DIZZINESS_SYNCOPE_COMPLAINT_INTEL = buildDizzinessSyncopeComplaintIntel(dizz);

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
export const URI_RESPIRATORY_COMPLAINT_INTEL = buildUriRespiratoryComplaintIntel(uri);

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
export const COUGH_COMPLAINT_INTEL = buildCoughComplaintIntel(coughIntel);

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

/** Fall — mechanism, syncope, head/spine injury documentation framework. */
export const FALL_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    fallIntel("hpiMechanicalFall"),
    fallIntel("hpiFallFromStanding"),
    fallIntel("hpiFallFromHeight"),
    fallIntel("hpiUnwitnessedFall"),
    fallIntel("hpiWitnessedFall"),
    fallIntel("hpiLossOfConsciousnessReviewed"),
    fallIntel("hpiHeadStrikeReported"),
    fallIntel("hpiAnticoagulantUseReviewed"),
    fallIntel("hpiAlcoholIntoxicationReviewed"),
    fallIntel("hpiDizzinessBeforeFall"),
    fallIntel("hpiSyncopeBeforeFall"),
    fallIntel("hpiBaselineMobilityReviewed"),
    fallIntel("hpiPainLocationReviewed"),
    fallIntel("hpiAmbulatoryStatusAfterFall"),
  ],
  rosImportantPositives: [
    fallIntel("rosPainAfterFall"),
    fallIntel("rosHeadache"),
    fallIntel("rosDizziness"),
    fallIntel("rosNeckPain"),
    fallIntel("rosBackPain"),
    fallIntel("rosExtremityPain"),
    fallIntel("rosLossOfConsciousness"),
  ],
  rosImportantNegatives: [
    fallIntel("rosDeniesLossOfConsciousness"),
    fallIntel("rosDeniesChestPainBeforeFall"),
    fallIntel("rosDeniesShortnessOfBreathBeforeFall"),
    fallIntel("rosDeniesFocalWeakness"),
    fallIntel("rosDeniesNumbness"),
    fallIntel("rosDeniesVomiting"),
  ],
  rosRedFlags: [
    fallIntel("rfAnticoagulatedHeadInjury"),
    fallIntel("rfAlteredMentalStatus"),
    fallIntel("rfPersistentVomiting"),
    fallIntel("rfFocalNeurologicDeficit"),
    fallIntel("rfUnstableGait"),
    fallIntel("rfPossibleSyncope"),
    fallIntel("rfSevereNeckBackPain"),
  ],
  physicalExam: {
    general: [fallIntel("examAlertOriented"), fallIntel("examNoAcuteDistress")],
    heent: [fallIntel("examScalpTenderness"), fallIntel("examCervicalSpineTenderness")],
    musculoskeletal: [
      fallIntel("examNoMidlineSpinalTenderness"),
      fallIntel("examExtremityTenderness"),
      fallIntel("examNoDeformity"),
    ],
    neuroPsych: [
      fallIntel("examNeurovascularlyIntact"),
      fallIntel("examGaitAssessed"),
      fallIntel("examNoFocalNeuroDeficit"),
    ],
  },
  mdmWorkingAssessment: [fallIntel("mdmSyncopeEvaluationConsidered"), fallIntel("mdmHeadInjuryConsidered")],
  mdmDifferentialSynthesis: [
    fallIntel("diffMechanicalFall"),
    fallIntel("diffSyncope"),
    fallIntel("diffHeadInjury"),
    fallIntel("diffIntracranialHemorrhage"),
    fallIntel("diffCervicalSpineInjury"),
    fallIntel("diffFracture"),
    fallIntel("diffSprainStrain"),
    fallIntel("diffContusion"),
    fallIntel("diffIntoxicationRelatedFall"),
    fallIntel("diffGaitInstability"),
  ],
  mdmDataReviewed: [
    fallIntel("mdmCtHeadConsideredReviewed"),
    fallIntel("mdmCspineImagingConsideredReviewed"),
    fallIntel("mdmExtremityImagingConsideredReviewed"),
  ],
  mdmClinicalRationale: [
    fallIntel("mdmMechanismOfInjuryReviewed"),
    fallIntel("mdmAnticoagulationStatusReviewed"),
    fallIntel("mdmNeurovascularExamDocumented"),
    fallIntel("mdmFallRiskDiscussed"),
  ],
  mdmPlanSummary: [
    fallIntel("mdmAmbulatoryReassessmentPerformed"),
    fallIntel("mdmSerialReassessmentPerformed"),
  ],
  mdmImmediateActionsRationale: [fallIntel("mdmFallPrecautionsIfIndicated")],
  mdmAdmitObserveDischarge: [
    fallIntel("mdmAdmissionObservationConsidered"),
  ],
  reassessment: [
    fallIntel("reassessPainImprovedAfterTreatment"),
    fallIntel("reassessNeurologicExamUnchanged"),
    fallIntel("reassessAmbulatoryReassessmentPerformed"),
    fallIntel("reassessVitalSignsStable"),
  ],
  followUpDisposition: [
    fallIntel("dispDischargedWithFallPrecautions"),
    fallIntel("dispReturnHeadacheVomitingConfusion"),
    fallIntel("dispFollowUpRecommended"),
    fallIntel("dispAdmissionObservationConsidered"),
    fallIntel("dispCaregiverInstructionsDiscussedIfApplicable"),
  ],
});

/** Head injury — ACEP head injury / concussion documentation framework. */
export const HEAD_INJURY_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    headInj("hpiHeadStrikeReported"),
    headInj("hpiLossOfConsciousnessReviewed"),
    headInj("hpiNoLossOfConsciousnessReported"),
    headInj("hpiVomitingReviewed"),
    headInj("hpiHeadacheReported"),
    headInj("hpiAnticoagulantUseReviewed"),
    headInj("hpiSeizureActivityReviewed"),
    headInj("hpiAmnesiaReviewed"),
    headInj("hpiIntoxicationReviewed"),
    headInj("hpiMechanismReviewed"),
    headInj("hpiWorseningHeadache"),
    headInj("hpiNeurologicSymptomsReviewed"),
  ],
  rosImportantPositives: [
    headInj("rosHeadache"),
    headInj("rosVomiting"),
    headInj("rosDizziness"),
    headInj("rosConfusion"),
    headInj("rosVisionChanges"),
    headInj("rosNeckPain"),
  ],
  rosImportantNegatives: [
    headInj("rosDeniesLossOfConsciousness"),
    headInj("rosDeniesVomiting"),
    headInj("rosDeniesSeizure"),
    headInj("rosDeniesFocalWeakness"),
    headInj("rosDeniesNumbness"),
    headInj("rosDeniesVisionLoss"),
  ],
  rosRedFlags: [
    headInj("rfAnticoagulatedHeadInjury"),
    headInj("rfPersistentVomiting"),
    headInj("rfWorseningHeadache"),
    headInj("rfAlteredMentalStatus"),
    headInj("rfFocalNeurologicDeficit"),
    headInj("rfSeizureAfterInjury"),
    headInj("rfSkullFractureConcern"),
  ],
  physicalExam: {
    general: [headInj("examAlertOriented")],
    heent: [
      headInj("examScalpHematoma"),
      headInj("examScalpLaceration"),
      headInj("examPupilsEqualReactive"),
      headInj("examCervicalSpineNonTender"),
    ],
    neuroPsych: [
      headInj("examCranialNervesGrosslyIntact"),
      headInj("examNoFocalNeuroDeficit"),
      headInj("examNormalGait"),
      headInj("examGcsDocumented"),
    ],
  },
  mdmWorkingAssessment: [headInj("mdmConcussionConsidered"), headInj("mdmIntracranialHemorrhageConsidered")],
  mdmDifferentialSynthesis: [
    headInj("diffConcussion"),
    headInj("diffIntracranialHemorrhage"),
    headInj("diffSkullFracture"),
    headInj("diffCervicalSpineInjury"),
    headInj("diffScalpLaceration"),
    headInj("diffContusion"),
    headInj("diffPostTraumaticHeadache"),
  ],
  mdmDataReviewed: [headInj("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [
    headInj("mdmCtHeadConsideredBasedOnRiskFactors"),
    headInj("mdmHeadInjuryDecisionRuleConsidered"),
    headInj("mdmAnticoagulationRiskReviewed"),
    headInj("mdmConcussionPrecautionsDiscussed"),
    headInj("mdmReturnPrecautionsEmphasized"),
  ],
  mdmPlanSummary: [
    headInj("mdmNeurologicExamReassessed"),
    headInj("mdmObservationConsidered"),
    headInj("mdmSerialReassessmentPerformed"),
  ],
  mdmImmediateActionsRationale: [headInj("mdmHeadInjuryPrecautionsIfIndicated")],
  mdmAdmitObserveDischarge: [headInj("mdmAdmissionObservationConsidered")],
  reassessment: [
    headInj("reassessNeurologicStatusStable"),
    headInj("reassessHeadacheImproved"),
    headInj("reassessNoVomitingInEd"),
    headInj("reassessRepeatExamUnchanged"),
  ],
  followUpDisposition: [
    headInj("dispDischargeHeadInjuryPrecautions"),
    headInj("dispReturnVomitingConfusionWorseningHeadache"),
    headInj("dispAvoidHighRiskActivityUntilCleared"),
    headInj("dispFollowUpRecommended"),
    headInj("dispObservationAdmissionConsidered"),
  ],
});

/** Laceration — wound exploration / repair documentation framework. */
export const LACERATION_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    lac("hpiLacerationLocationReviewed"),
    lac("hpiMechanismOfInjuryReviewed"),
    lac("hpiTimeSinceInjuryReviewed"),
    lac("hpiBleedingControlled"),
    lac("hpiForeignBodyConcernReviewed"),
    lac("hpiContaminationReviewed"),
    lac("hpiTetanusStatusReviewed"),
    lac("hpiBiteInjuryReviewed"),
    lac("hpiNeurovascularSymptomsReviewed"),
    lac("hpiFunctionalDeficitReviewed"),
  ],
  rosImportantPositives: [
    lac("rosWoundPain"),
    lac("rosBleeding"),
    lac("rosForeignBodySensation"),
    lac("rosNumbness"),
    lac("rosDecreasedRangeOfMotion"),
  ],
  rosImportantNegatives: [
    lac("rosDeniesNumbness"),
    lac("rosDeniesWeakness"),
    lac("rosDeniesForeignBodySensation"),
    lac("rosDeniesUncontrolledBleeding"),
    lac("rosDeniesBiteExposure"),
  ],
  rosRedFlags: [
    lac("rfTendonInjuryConcern"),
    lac("rfNeurovascularInjuryConcern"),
    lac("rfOpenFractureConcern"),
    lac("rfRetainedForeignBodyConcern"),
    lac("rfBiteWoundInfectionRisk"),
    lac("rfHeavilyContaminatedWound"),
  ],
  physicalExam: {
    skin: [
      lac("examLacerationVisualized"),
      lac("examBleedingControlled"),
      lac("examWoundDepthAssessed"),
      lac("examNoForeignBodyVisualized"),
      lac("examNoSignsOfInfection"),
    ],
    musculoskeletal: [lac("examTendonFunctionIntact"), lac("examFullRangeOfMotion")],
    neuroPsych: [
      lac("examDistalSensationIntact"),
      lac("examDistalPulsesCapRefillIntact"),
    ],
  },
  mdmWorkingAssessment: [lac("mdmSimpleLacerationConsidered"), lac("mdmComplexLacerationConsidered")],
  mdmDifferentialSynthesis: [
    lac("diffSimpleLaceration"),
    lac("diffComplexLaceration"),
    lac("diffTendonInjury"),
    lac("diffNerveInjury"),
    lac("diffVascularInjury"),
    lac("diffRetainedForeignBody"),
    lac("diffOpenFracture"),
    lac("diffBiteWound"),
  ],
  mdmDataReviewed: [lac("mdmImagingConsideredForForeignBodyFracture")],
  mdmClinicalRationale: [
    lac("mdmWoundExploredAsAppropriate"),
    lac("mdmTetanusStatusReviewed"),
    lac("mdmAntibioticsConsideredContaminationBite"),
    lac("mdmRepairOptionsDiscussed"),
    lac("mdmNeurovascularExamDocumented"),
    lac("mdmReturnPrecautionsDiscussed"),
  ],
  mdmPlanSummary: [
    lac("mdmProcedureDocumentationCompletedIfRepaired"),
    lac("mdmSerialReassessmentPerformed"),
  ],
  mdmImmediateActionsRationale: [lac("mdmHemostasisAchievedIfIndicated")],
  mdmAdmitObserveDischarge: [lac("mdmAdmissionConsideredIfComplex")],
  reassessment: [
    lac("reassessBleedingControlled"),
    lac("reassessNeurovascularStatusUnchangedAfterRepair"),
    lac("reassessPatientToleratedProcedure"),
    lac("reassessDressingApplied"),
  ],
  followUpDisposition: [
    lac("dispWoundCareInstructionsProvided"),
    lac("dispSutureStapleRemovalTimingDiscussed"),
    lac("dispInfectionReturnPrecautionsDiscussed"),
    lac("dispFollowUpRecommended"),
  ],
});

/** Fracture concern / extremity injury — orthopedic trauma documentation framework. */
export const FRACTURE_CONCERN_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    frac("hpiInjuryMechanismReviewed"),
    frac("hpiPainLocationReviewed"),
    frac("hpiSwellingReported"),
    frac("hpiDeformityReported"),
    frac("hpiInabilityToBearWeight"),
    frac("hpiLimitedRangeOfMotion"),
    frac("hpiNumbnessTinglingReviewed"),
    frac("hpiDominantHandReviewedIfUpperExtremity"),
    frac("hpiPriorInjurySurgeryReviewed"),
    frac("hpiOpenWoundReviewed"),
  ],
  rosImportantPositives: [
    frac("rosExtremityPain"),
    frac("rosSwelling"),
    frac("rosBruising"),
    frac("rosDeformity"),
    frac("rosDecreasedRangeOfMotion"),
    frac("rosNumbnessTingling"),
  ],
  rosImportantNegatives: [
    frac("rosDeniesNumbness"),
    frac("rosDeniesWeakness"),
    frac("rosDeniesOpenWound"),
    frac("rosDeniesHeadInjury"),
    frac("rosDeniesNeckBackPain"),
  ],
  rosRedFlags: [
    frac("rfOpenFractureConcern"),
    frac("rfNeurovascularCompromise"),
    frac("rfCompartmentSyndromeConcern"),
    frac("rfDislocationConcern"),
    frac("rfSevereDeformity"),
    frac("rfInabilityToAmbulate"),
  ],
  physicalExam: {
    musculoskeletal: [
      frac("examTendernessPresent"),
      frac("examSwellingPresent"),
      frac("examDeformityPresent"),
      frac("examRangeOfMotionLimited"),
      frac("examCompartmentsSoft"),
    ],
    skin: [frac("examSkinIntact"), frac("examOpenWoundPresent")],
    neuroPsych: [
      frac("examDistalPulsesIntact"),
      frac("examCapillaryRefillNormal"),
      frac("examSensationIntact"),
      frac("examMotorFunctionIntact"),
    ],
  },
  mdmWorkingAssessment: [frac("mdmFractureConsidered"), frac("mdmDislocationConsidered")],
  mdmDifferentialSynthesis: [
    frac("diffFracture"),
    frac("diffDislocation"),
    frac("diffSprain"),
    frac("diffStrain"),
    frac("diffContusion"),
    frac("diffTendonInjury"),
    frac("diffLigamentInjury"),
    frac("diffCompartmentSyndrome"),
    frac("diffNeurovascularInjury"),
  ],
  mdmDataReviewed: [frac("mdmXrayReviewed")],
  mdmClinicalRationale: [
    frac("mdmNeurovascularExamDocumented"),
    frac("mdmCompartmentSyndromeConsidered"),
    frac("mdmPainControlProvided"),
    frac("mdmAmbulatoryStatusAssessed"),
    frac("mdmReturnPrecautionsDiscussed"),
  ],
  mdmPlanSummary: [
    frac("mdmSplintAppliedIfIndicated"),
    frac("mdmReductionConsidered"),
    frac("mdmOrthopedicFollowUpDiscussed"),
    frac("mdmSerialReassessmentPerformed"),
  ],
  mdmImmediateActionsRationale: [frac("mdmImmobilizationIfIndicated")],
  mdmAdmitObserveDischarge: [
    frac("mdmAdmissionConsultConsidered"),
    frac("mdmObservationConsidered"),
  ],
  reassessment: [
    frac("reassessPainImproved"),
    frac("reassessNeurovascularExamUnchangedAfterSplint"),
    frac("reassessSplintCheckedForComfort"),
    frac("reassessAmbulatoryStatusReassessed"),
  ],
  followUpDisposition: [
    frac("dispDischargedWithSplintPrecautions"),
    frac("dispOrthopedicFollowUpRecommended"),
    frac("dispReturnWorseningPainNumbnessColorChange"),
    frac("dispNonWeightBearingInstructionsDiscussedIfApplicable"),
    frac("dispAdmissionConsultConsidered"),
  ],
});

/** Pediatric fever — AAP pediatric fever / toxic appearance documentation framework. */
export const PEDIATRIC_FEVER_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    pedFeb("hpiCaregiverHistorianUsed"),
    pedFeb("hpiFeverDurationReviewed"),
    pedFeb("hpiMaximumTemperatureReviewed"),
    pedFeb("hpiAntipyreticUseReviewed"),
    pedFeb("hpiVaccinationStatusReviewed"),
    pedFeb("hpiSickContactsReviewed"),
    pedFeb("hpiDaycareSchoolExposureReviewed"),
    pedFeb("hpiOralIntakeReviewed"),
    pedFeb("hpiUrineOutputReviewed"),
    pedFeb("hpiActivityLevelReviewed"),
    pedFeb("hpiRashReviewed"),
    pedFeb("hpiRespiratorySymptomsReviewed"),
    pedFeb("hpiVomitingDiarrheaReviewed"),
    pedFeb("hpiEarPainReviewed"),
  ],
  rosImportantPositives: [
    pedFeb("rosFever"),
    pedFeb("rosDecreasedAppetite"),
    pedFeb("rosDecreasedUrineOutput"),
    pedFeb("rosCough"),
    pedFeb("rosCongestion"),
    pedFeb("rosVomiting"),
    pedFeb("rosDiarrhea"),
    pedFeb("rosRash"),
    pedFeb("rosEarPain"),
  ],
  rosImportantNegatives: [
    pedFeb("rosDeniesNeckStiffness"),
    pedFeb("rosDeniesDifficultyBreathing"),
    pedFeb("rosDeniesPersistentVomiting"),
    pedFeb("rosDeniesLethargy"),
    pedFeb("rosDeniesSeizureActivity"),
    pedFeb("rosDeniesRash"),
  ],
  rosRedFlags: [
    pedFeb("rfToxicAppearingChild"),
    pedFeb("rfLethargy"),
    pedFeb("rfRespiratoryDistress"),
    pedFeb("rfDehydrationConcern"),
    pedFeb("rfMeningitisConcern"),
    pedFeb("rfSepsisConcern"),
    pedFeb("rfFeverInYoungInfant"),
    pedFeb("rfImmunocompromisedChild"),
  ],
  physicalExam: {
    general: [
      pedFeb("examNonToxicAppearing"),
      pedFeb("examToxicAppearing"),
      pedFeb("examInteractiveWithCaregiver"),
      pedFeb("examConsolable"),
    ],
    heent: [
      pedFeb("examMoistMucousMembranes"),
      pedFeb("examDryMucousMembranes"),
      pedFeb("examCapillaryRefillNormal"),
      pedFeb("examNoMeningismus"),
      pedFeb("examRashPresent"),
    ],
    respiratory: [pedFeb("examNoRespiratoryDistress"), pedFeb("examLungsClear")],
    abdomen: [pedFeb("examAbdomenSoft")],
  },
  mdmWorkingAssessment: [
    pedFeb("mdmPediatricFeverSourceEvaluated"),
    pedFeb("mdmSepsisConsidered"),
  ],
  mdmDifferentialSynthesis: [
    pedFeb("diffViralSyndrome"),
    pedFeb("diffUri"),
    pedFeb("diffOtitisMedia"),
    pedFeb("diffPneumonia"),
    pedFeb("diffUti"),
    pedFeb("diffGastroenteritis"),
    pedFeb("diffMeningitis"),
    pedFeb("diffSepsis"),
    pedFeb("diffCellulitis"),
    pedFeb("diffFeverWithoutSource"),
  ],
  mdmDataReviewed: [
    pedFeb("mdmUrinalysisConsideredReviewed"),
    pedFeb("mdmViralTestingConsideredReviewed"),
    pedFeb("mdmChestImagingConsideredIfRespiratoryFindings"),
  ],
  mdmClinicalRationale: [
    pedFeb("mdmHydrationStatusAssessed"),
    pedFeb("mdmCaregiverHistorianUsed"),
    pedFeb("mdmAntipyreticResponseReviewed"),
    pedFeb("mdmAntibioticsConsideredBasedOnSourceRisk"),
    pedFeb("mdmWeightBasedDosingReviewed"),
  ],
  mdmPlanSummary: [pedFeb("mdmSerialReassessmentPerformed")],
  mdmImmediateActionsRationale: [pedFeb("mdmAntipyreticProvidedIfIndicated")],
  mdmAdmitObserveDischarge: [pedFeb("mdmAdmissionConsideredToxicAppearanceDehydration")],
  reassessment: [
    pedFeb("reassessFeverImprovedAfterAntipyretic"),
    pedFeb("reassessRemainsNonToxicAppearing"),
    pedFeb("reassessToleratingOralIntake"),
    pedFeb("reassessHydrationStatusReassessed"),
    pedFeb("reassessCaregiverComfortableWithPlan"),
  ],
  followUpDisposition: [
    pedFeb("dispCaregiverReturnPrecautionsDiscussed"),
    pedFeb("dispReturnLethargyBreathingDehydrationFever"),
    pedFeb("dispPediatricianFollowUpRecommended"),
    pedFeb("dispSupportiveCareDiscussed"),
  ],
});

/** Pediatric abdominal pain — appendicitis / surgical red flag documentation framework. */
export const PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL = buildPediatricAbdominalPainComplaintIntel(pedAbd);

/** Pediatric asthma / wheezing — pediatric bronchospasm documentation framework. */
export const PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL = buildPediatricAsthmaSobComplaintIntel(pedAsthma);

/** Pediatric vomiting / diarrhea — gastroenteritis / dehydration documentation framework. */
export const PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL = buildPediatricNauseaVomitingComplaintIntel(pedGastro);

/** UTI / urinary symptoms — cystitis / pyelonephritis documentation framework. */
export const UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    uti("hpiDysuria"),
    uti("hpiUrinaryFrequency"),
    uti("hpiUrinaryUrgency"),
    uti("hpiSuprapubicPain"),
    uti("hpiFlankPainReviewed"),
    uti("hpiFeverReviewed"),
    uti("hpiHematuriaReviewed"),
    uti("hpiNauseaVomitingReviewed"),
    uti("hpiPregnancyConcernReviewed"),
    uti("hpiRecurrentUtiHistoryReviewed"),
    uti("hpiCatheterUseReviewed"),
    uti("hpiImmunocompromisedStatusReviewed"),
  ],
  rosImportantPositives: [
    uti("rosDysuria"),
    uti("rosFrequency"),
    uti("rosUrgency"),
    uti("rosHematuria"),
    uti("rosSuprapubicPain"),
    uti("rosFlankPain"),
    uti("rosFever"),
    uti("rosNauseaVomiting"),
  ],
  rosImportantNegatives: [
    uti("rosDeniesFlankPain"),
    uti("rosDeniesFever"),
    uti("rosDeniesVomiting"),
    uti("rosDeniesVaginalSymptoms"),
    uti("rosDeniesTesticularPain"),
    uti("rosDeniesPregnancyConcern"),
  ],
  rosRedFlags: [
    uti("rfPyelonephritisConcern"),
    uti("rfSepsisConcern"),
    uti("rfObstructingStoneConcern"),
    uti("rfPregnancyWithUrinarySymptoms"),
    uti("rfImmunocompromisedPatient"),
    uti("rfUrinaryRetention"),
  ],
  physicalExam: {
    general: [uti("examWellAppearing"), uti("examFebrileAppearance"), uti("examNoAcuteDistress")],
    abdomen: [
      uti("examSuprapubicTenderness"),
      uti("examCvaTenderness"),
      uti("examAbdomenSoft"),
      uti("examAbdomenNonTender"),
      uti("examNoPeritonealSigns"),
    ],
  },
  mdmWorkingAssessment: [
    uti("mdmPyelonephritisConsidered"),
    uti("mdmSepsisFromUrinarySourceConsidered"),
  ],
  mdmDifferentialSynthesis: [
    uti("diffCystitis"),
    uti("diffPyelonephritis"),
    uti("diffUreterolithiasis"),
    uti("diffStiUrethritis"),
    uti("diffVaginitis"),
    uti("diffProstatitis"),
    uti("diffUrinaryRetention"),
    uti("diffSepsisFromUrinarySource"),
  ],
  mdmDataReviewed: [
    uti("mdmUrinalysisReviewed"),
    uti("mdmUrineCultureConsidered"),
    uti("mdmPregnancyTestingReviewedIfApplicable"),
    uti("mdmRenalFunctionReviewedIfIndicated"),
  ],
  mdmClinicalRationale: [
    uti("mdmObstructingStoneConsidered"),
    uti("mdmAntibioticsConsideredBasedOnPresentation"),
    uti("mdmOutpatientTreatmentDiscussed"),
    uti("mdmSerialReassessmentPerformed"),
  ],
  mdmAdmitObserveDischarge: [uti("mdmAdmissionConsideredSystemicIllness")],
  reassessment: [
    uti("reassessPainImproved"),
    uti("reassessToleratingOralIntake"),
    uti("reassessAfebrileStable"),
    uti("reassessNoWorseningFlankPain"),
  ],
  followUpDisposition: [
    uti("dispDischargeAntibioticsIfIndicated"),
    uti("dispReturnFeverFlankPainVomiting"),
    uti("dispHydrationInstructionsDiscussed"),
    uti("dispFollowUpRecommended"),
  ],
});

/** Hyperglycemia — DKA / HHS documentation framework. */
export const HYPERGLYCEMIA_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    hyper("hpiElevatedGlucoseNoted"),
    hyper("hpiDiabetesHistoryReviewed"),
    hyper("hpiMedicationAdherenceReviewed"),
    hyper("hpiInsulinUseReviewed"),
    hyper("hpiRecentIllnessReviewed"),
    hyper("hpiPolyuria"),
    hyper("hpiPolydipsia"),
    hyper("hpiNauseaVomiting"),
    hyper("hpiAbdominalPain"),
    hyper("hpiWeakness"),
    hyper("hpiAlteredMentalStatusReviewed"),
    hyper("hpiDehydrationSymptomsReviewed"),
  ],
  rosImportantPositives: [
    hyper("rosPolyuria"),
    hyper("rosPolydipsia"),
    hyper("rosNausea"),
    hyper("rosVomiting"),
    hyper("rosAbdominalPain"),
    hyper("rosWeakness"),
    hyper("rosFatigue"),
  ],
  rosImportantNegatives: [
    hyper("rosDeniesChestPain"),
    hyper("rosDeniesShortnessOfBreath"),
    hyper("rosDeniesFever"),
    hyper("rosDeniesVomiting"),
    hyper("rosDeniesAlteredMentalStatus"),
  ],
  rosRedFlags: [
    hyper("rfDkaConcern"),
    hyper("rfHhsConcern"),
    hyper("rfAlteredMentalStatus"),
    hyper("rfDehydrationConcern"),
    hyper("rfInfectionTriggerConcern"),
    hyper("rfSevereElectrolyteAbnormality"),
  ],
  physicalExam: {
    general: [
      hyper("examAlertAndOriented"),
      hyper("examDryMucousMembranes"),
      hyper("examTachycardic"),
      hyper("examWellAppearing"),
    ],
    respiratory: [hyper("examNoRespiratoryDistress"), hyper("examKussmaulRespirationsConcern")],
    abdomen: [hyper("examAbdomenSoft")],
    neuroPsych: [hyper("examNoFocalNeurologicDeficit")],
  },
  mdmWorkingAssessment: [hyper("mdmDkaConsidered"), hyper("mdmHhsConsidered")],
  mdmDifferentialSynthesis: [
    hyper("diffUncomplicatedHyperglycemia"),
    hyper("diffDka"),
    hyper("diffHhs"),
    hyper("diffDehydration"),
    hyper("diffInfectionTriggeredHyperglycemia"),
    hyper("diffMedicationNonadherence"),
    hyper("diffSteroidInducedHyperglycemia"),
    hyper("diffElectrolyteAbnormality"),
  ],
  mdmDataReviewed: [
    hyper("mdmGlucoseReviewed"),
    hyper("mdmKetonesReviewedIfObtained"),
    hyper("mdmAnionGapReviewed"),
    hyper("mdmElectrolytesReviewed"),
    hyper("mdmRenalFunctionReviewed"),
  ],
  mdmClinicalRationale: [
    hyper("mdmInfectionTriggerEvaluated"),
    hyper("mdmInsulinTherapyConsideredAdministered"),
    hyper("mdmSerialReassessmentPerformed"),
  ],
  mdmPlanSummary: [hyper("mdmIvFluidsAdministered")],
  mdmAdmitObserveDischarge: [hyper("mdmAdmissionConsidered")],
  reassessment: [
    hyper("reassessGlucoseImproved"),
    hyper("reassessHydrationStatusImproved"),
    hyper("reassessMentalStatusStable"),
    hyper("reassessElectrolytesReviewed"),
    hyper("reassessToleratingOralIntake"),
  ],
  followUpDisposition: [
    hyper("dispOutpatientDiabetesFollowUpRecommended"),
    hyper("dispMedicationAdherenceDiscussed"),
    hyper("dispReturnVomitingAmsWorseningSymptoms"),
    hyper("dispAdmissionConsideredDkaHhsPersistentLabs"),
  ],
});

/** Hypertension — hypertensive urgency/emergency documentation framework. */
export const HYPERTENSION_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    ht("hpiElevatedBloodPressureNoted"),
    ht("hpiMedicationAdherenceReviewed"),
    ht("hpiMissedMedicationsReviewed"),
    ht("hpiHeadacheReviewed"),
    ht("hpiChestPainReviewed"),
    ht("hpiShortnessOfBreathReviewed"),
    ht("hpiNeuroSymptomsReviewed"),
    ht("hpiVisionChangesReviewed"),
    ht("hpiRenalDiseaseHistoryReviewed"),
    ht("hpiPregnancyConcernReviewedIfApplicable"),
  ],
  rosImportantPositives: [
    ht("rosHeadache"),
    ht("rosChestPain"),
    ht("rosShortnessOfBreath"),
    ht("rosVisionChanges"),
    ht("rosDizziness"),
    ht("rosNeurologicSymptoms"),
  ],
  rosImportantNegatives: [
    ht("rosDeniesChestPain"),
    ht("rosDeniesShortnessOfBreath"),
    ht("rosDeniesFocalNeurologicDeficit"),
    ht("rosDeniesVisionLoss"),
    ht("rosDeniesSevereHeadache"),
    ht("rosDeniesDecreasedUrineOutput"),
  ],
  rosRedFlags: [
    ht("rfHypertensiveEmergencyConcern"),
    ht("rfNeurologicDeficit"),
    ht("rfChestPain"),
    ht("rfPulmonaryEdemaConcern"),
    ht("rfAcuteKidneyInjuryConcern"),
    ht("rfPregnancyRelatedHypertensionConcern"),
  ],
  physicalExam: {
    general: [ht("examNoAcuteDistress")],
    neuroPsych: [ht("examNeurologicallyIntact"), ht("examNoFocalDeficit"), ht("examVisionSymptomsAssessed")],
    respiratory: [ht("examLungsClear"), ht("examNoRespiratoryDistress")],
    cardiovascular: [ht("examRegularRateAndRhythm"), ht("examNoPeripheralEdema")],
  },
  mdmWorkingAssessment: [
    ht("mdmEndOrganSymptomsAssessed"),
    ht("mdmHypertensiveEmergencyConsidered"),
  ],
  mdmDifferentialSynthesis: [
    ht("diffAsymptomaticHypertension"),
    ht("diffHypertensiveUrgency"),
    ht("diffHypertensiveEmergency"),
    ht("diffAcs"),
    ht("diffStrokeTia"),
    ht("diffAcuteKidneyInjury"),
    ht("diffMedicationNonadherence"),
    ht("diffPainAnxietyRelatedElevation"),
  ],
  mdmDataReviewed: [
    ht("mdmRepeatBloodPressureReviewed"),
    ht("mdmEcgReviewedIfIndicated"),
    ht("mdmRenalFunctionReviewedIfObtained"),
    ht("mdmTroponinReviewedIfChestPain"),
  ],
  mdmClinicalRationale: [
    ht("mdmNeurologicExamDocumented"),
    ht("mdmMedicationRefillRestartConsidered"),
    ht("mdmOutpatientFollowUpEmphasized"),
    ht("mdmSerialReassessmentPerformed"),
  ],
  mdmAdmitObserveDischarge: [ht("mdmAdmissionConsideredEndOrganInjury")],
  reassessment: [
    ht("reassessRepeatBloodPressureObtained"),
    ht("reassessSymptomsReassessed"),
    ht("reassessNoNewEndOrganSymptoms"),
    ht("reassessStableOutpatientFollowUp"),
  ],
  followUpDisposition: [
    ht("dispOutpatientBpFollowUpRecommended"),
    ht("dispMedicationAdherenceDiscussed"),
    ht("dispReturnChestPainSobNeuroSymptoms"),
    ht("dispAdmissionConsideredHypertensiveEmergency"),
  ],
});

/** Allergic reaction / rash — anaphylaxis and dermatologic red-flag documentation framework. */
export const ALLERGIC_REACTION_RASH_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    allergy("hpiRashOnsetReviewed"),
    allergy("hpiAllergenExposureReviewed"),
    allergy("hpiMedicationExposureReviewed"),
    allergy("hpiFoodExposureReviewed"),
    allergy("hpiInsectStingReviewed"),
    allergy("hpiItchingReported"),
    allergy("hpiSwellingReviewed"),
    allergy("hpiThroatTightnessReviewed"),
    allergy("hpiWheezingReviewed"),
    allergy("hpiPriorAnaphylaxisHistoryReviewed"),
    allergy("hpiEpinephrineUseReviewed"),
  ],
  rosImportantPositives: [
    allergy("rosRash"),
    allergy("rosItching"),
    allergy("rosSwelling"),
    allergy("rosWheezing"),
    allergy("rosThroatTightness"),
    allergy("rosNauseaVomiting"),
  ],
  rosImportantNegatives: [
    allergy("rosDeniesShortnessOfBreath"),
    allergy("rosDeniesThroatSwelling"),
    allergy("rosDeniesWheezing"),
    allergy("rosDeniesVomiting"),
    allergy("rosDeniesSyncope"),
    allergy("rosDeniesMucosalLesions"),
  ],
  rosRedFlags: [
    allergy("rfAnaphylaxisConcern"),
    allergy("rfAirwaySwellingConcern"),
    allergy("rfHypotension"),
    allergy("rfWheezingBronchospasm"),
    allergy("rfMucosalInvolvement"),
    allergy("rfStevensJohnsonTenConcern"),
    allergy("rfPurpuraPetechiaeConcern"),
  ],
  physicalExam: {
    general: [allergy("examNoHypotension")],
    respiratory: [
      allergy("examNoRespiratoryDistress"),
      allergy("examAirwayPatent"),
      allergy("examWheezingPresent"),
    ],
    heent: [allergy("examNoTongueLipSwelling"), allergy("examMucosalLesionsPresent")],
    skin: [allergy("examUrticariaPresent"), allergy("examMaculopapularRash"), allergy("examSkinWarmDry")],
  },
  mdmWorkingAssessment: [
    allergy("mdmAnaphylaxisCriteriaAssessed"),
    allergy("mdmAirwayInvolvementAssessed"),
  ],
  mdmDifferentialSynthesis: [
    allergy("diffAllergicReaction"),
    allergy("diffAnaphylaxis"),
    allergy("diffUrticaria"),
    allergy("diffContactDermatitis"),
    allergy("diffViralExanthem"),
    allergy("diffCellulitis"),
    allergy("diffMedicationReaction"),
    allergy("diffStevensJohnsonTen"),
    allergy("diffPetechialPurpuricRash"),
  ],
  mdmClinicalRationale: [
    allergy("mdmTriggerAvoidanceDiscussed"),
    allergy("mdmObservationPeriodConsidered"),
    allergy("mdmSerialReassessmentPerformed"),
  ],
  mdmPlanSummary: [
    allergy("mdmEpinephrineConsideredAdministered"),
    allergy("mdmAntihistamineTherapyConsideredAdministered"),
    allergy("mdmSteroidTherapyConsidered"),
  ],
  mdmImmediateActionsRationale: [allergy("mdmEpinephrinePrescriptionConsideredIfIndicated")],
  reassessment: [
    allergy("reassessRashImproving"),
    allergy("reassessAirwayRemainsPatent"),
    allergy("reassessNoRespiratoryDistress"),
    allergy("reassessVitalSignsStable"),
    allergy("reassessSymptomsImprovedAfterTreatment"),
  ],
  followUpDisposition: [
    allergy("dispReturnBreathingDifficultyThroatSwelling"),
    allergy("dispAllergenAvoidanceDiscussed"),
    allergy("dispEpinephrineAutoinjectorInstructionsIfPrescribed"),
    allergy("dispFollowUpRecommended"),
  ],
});

/** Adult nausea / vomiting — GI red flag and dehydration documentation framework. */
export const ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL = buildAdultNauseaVomitingComplaintIntel(adultNv);

/** Adult diarrhea — infectious diarrhea / C. diff documentation framework. */
export const ADULT_DIARRHEA_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    adultDiarrhea("hpiDiarrheaDurationReviewed"),
    adultDiarrhea("hpiStoolFrequencyReviewed"),
    adultDiarrhea("hpiWateryDiarrhea"),
    adultDiarrhea("hpiBloodyDiarrheaReviewed"),
    adultDiarrhea("hpiFeverReviewed"),
    adultDiarrhea("hpiAbdominalPainReviewed"),
    adultDiarrhea("hpiRecentAntibioticsReviewed"),
    adultDiarrhea("hpiRecentTravelReviewed"),
    adultDiarrhea("hpiSickContactsReviewed"),
    adultDiarrhea("hpiFoodExposureReviewed"),
    adultDiarrhea("hpiImmunocompromisedStatusReviewed"),
    adultDiarrhea("hpiHydrationOralIntakeReviewed"),
  ],
  rosImportantPositives: [
    adultDiarrhea("rosDiarrhea"),
    adultDiarrhea("rosAbdominalCramping"),
    adultDiarrhea("rosFever"),
    adultDiarrhea("rosNausea"),
    adultDiarrhea("rosVomiting"),
    adultDiarrhea("rosDecreasedOralIntake"),
  ],
  rosImportantNegatives: [
    adultDiarrhea("rosDeniesBloodyStool"),
    adultDiarrhea("rosDeniesSevereAbdominalPain"),
    adultDiarrhea("rosDeniesPersistentVomiting"),
    adultDiarrhea("rosDeniesSyncope"),
    adultDiarrhea("rosDeniesRecentAntibiotics"),
    adultDiarrhea("rosDeniesTravelExposure"),
  ],
  rosRedFlags: [
    adultDiarrhea("rfBloodyDiarrhea"),
    adultDiarrhea("rfSevereDehydrationConcern"),
    adultDiarrhea("rfSepsisConcern"),
    adultDiarrhea("rfCDifficileConcern"),
    adultDiarrhea("rfImmunocompromisedPatient"),
    adultDiarrhea("rfSevereAbdominalPainPeritonealSigns"),
  ],
  physicalExam: {
    general: [
      adultDiarrhea("examNonToxicAppearing"),
      adultDiarrhea("examNormalPerfusion"),
      adultDiarrhea("examNoAcuteDistress"),
    ],
    heent: [adultDiarrhea("examDryMucousMembranes")],
    abdomen: [
      adultDiarrhea("examAbdomenSoft"),
      adultDiarrhea("examMildDiffuseTenderness"),
      adultDiarrhea("examNoGuarding"),
      adultDiarrhea("examNoReboundTenderness"),
    ],
  },
  mdmWorkingAssessment: [
    adultDiarrhea("mdmCDifficileRiskReviewed"),
    adultDiarrhea("mdmSepsisConsidered"),
  ],
  mdmDifferentialSynthesis: [
    adultDiarrhea("diffViralGastroenteritis"),
    adultDiarrhea("diffBacterialEnteritis"),
    adultDiarrhea("diffFoodborneIllness"),
    adultDiarrhea("diffCDifficileColitis"),
    adultDiarrhea("diffDehydration"),
    adultDiarrhea("diffInflammatoryBowelDiseaseFlare"),
    adultDiarrhea("diffAppendicitis"),
    adultDiarrhea("diffDiverticulitis"),
    adultDiarrhea("diffMedicationRelatedDiarrhea"),
  ],
  mdmDataReviewed: [
    adultDiarrhea("mdmStoolTestingConsideredBasedOnRisk"),
    adultDiarrhea("mdmLabsReviewedIfObtained"),
  ],
  mdmClinicalRationale: [
    adultDiarrhea("mdmHydrationStatusAssessed"),
    adultDiarrhea("mdmAbdominalImagingConsideredIfRedFlags"),
    adultDiarrhea("mdmReturnPrecautionsDiscussed"),
    adultDiarrhea("mdmSerialReassessmentPerformed"),
  ],
  mdmPlanSummary: [
    adultDiarrhea("mdmIvFluidsConsideredAdministered"),
    adultDiarrhea("mdmAntibioticsConsideredOnlyIfIndicated"),
  ],
  reassessment: [
    adultDiarrhea("reassessSymptomsStableImproved"),
    adultDiarrhea("reassessToleratingOralIntake"),
    adultDiarrhea("reassessHydrationStatusReassessed"),
    adultDiarrhea("reassessAbdominalExamReassuring"),
  ],
  followUpDisposition: [
    adultDiarrhea("dispDischargeHydrationInstructions"),
    adultDiarrhea("dispReturnBloodyStool"),
    adultDiarrhea("dispReturnWorseningAbdominalPain"),
    adultDiarrhea("dispReturnDehydrationSymptoms"),
    adultDiarrhea("dispFollowUpRecommended"),
  ],
});

/** Medication refill — medico-legal refill documentation framework. */
export const MEDICATION_REFILL_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    medRefill("hpiMedicationNameReviewed"),
    medRefill("hpiDoseReviewed"),
    medRefill("hpiLastDoseReviewed"),
    medRefill("hpiReasonForRunningOutReviewed"),
    medRefill("hpiPrescribingClinicianReviewed"),
    medRefill("hpiChronicConditionReviewed"),
    medRefill("hpiSymptomsFromMissedMedicationReviewed"),
    medRefill("hpiAdverseEffectsReviewed"),
    medRefill("hpiControlledSubstanceStatusReviewed"),
    medRefill("hpiPdmpReviewedIfApplicable"),
    medRefill("hpiFollowUpAccessReviewed"),
  ],
  rosImportantPositives: [
    medRefill("rosMedicationRelatedSymptoms"),
    medRefill("rosWithdrawalSymptomsReviewed"),
    medRefill("rosChronicConditionSymptomsReviewed"),
    medRefill("rosPainSymptomsReviewedIfApplicable"),
  ],
  rosImportantNegatives: [
    medRefill("rosDeniesChestPain"),
    medRefill("rosDeniesShortnessOfBreath"),
    medRefill("rosDeniesNeurologicSymptoms"),
    medRefill("rosDeniesSevereWithdrawalSymptoms"),
    medRefill("rosDeniesSuicidalIdeationIfRelevant"),
    medRefill("rosDeniesAdverseMedicationReaction"),
  ],
  rosRedFlags: [
    medRefill("rfControlledSubstanceRefillRequest"),
    medRefill("rfWithdrawalConcern"),
    medRefill("rfMedicationMisuseConcern"),
    medRefill("rfUnsafeChronicDiseaseControl"),
    medRefill("rfInabilityToAccessPrimaryCare"),
    medRefill("rfHighRiskMedicationRequest"),
  ],
  physicalExam: {
    general: [
      medRefill("examNoAcuteDistress"),
      medRefill("examVitalSignsReviewed"),
      medRefill("examAlertAndOriented"),
    ],
    respiratory: [medRefill("examNoRespiratoryDistress")],
    neuroPsych: [medRefill("examNoFocalNeurologicDeficit")],
    cardiovascular: [medRefill("examChronicConditionFocusedExamPerformed")],
  },
  mdmWorkingAssessment: [
    medRefill("mdmChronicConditionStabilityAssessed"),
    medRefill("mdmRefillAppropriatenessAssessed"),
  ],
  mdmDifferentialSynthesis: [
    medRefill("diffMedicationLapse"),
    medRefill("diffChronicDiseaseMedicationNeed"),
    medRefill("diffWithdrawalSyndrome"),
    medRefill("diffMedicationAdverseEffect"),
    medRefill("diffUncontrolledChronicCondition"),
    medRefill("diffSubstanceMisuseDiversionConcern"),
  ],
  mdmDataReviewed: [
    medRefill("mdmMedicationHistoryReviewed"),
    medRefill("mdmPharmacyPrescriptionHistoryReviewedIfAvailable"),
    medRefill("mdmPdmpReviewedIfControlledSubstanceApplicable"),
  ],
  mdmClinicalRationale: [
    medRefill("mdmRisksBenefitsOfRefillDiscussed"),
    medRefill("mdmControlledSubstancePrescribingPolicyDiscussed"),
    medRefill("mdmFollowUpWithPcpSpecialistEmphasized"),
    medRefill("mdmRedFlagSymptomsReviewed"),
    medRefill("mdmAlternativeTreatmentOfferedIfRefillNotAppropriate"),
  ],
  mdmPlanSummary: [medRefill("mdmLimitedBridgeRefillConsidered")],
  reassessment: [
    medRefill("reassessPatientRemainsStable"),
    medRefill("reassessNoEmergentConditionIdentified"),
    medRefill("reassessFollowUpPlanReviewed"),
    medRefill("reassessMedicationInstructionsReviewed"),
  ],
  followUpDisposition: [
    medRefill("dispLimitedRefillProvidedIfAppropriate"),
    medRefill("dispRefillDeclinedWithExplanationIfUnsafe"),
    medRefill("dispPrimaryCareFollowUpRequired"),
    medRefill("dispReturnPrecautionsDiscussed"),
    medRefill("dispMedicationSafetyInstructionsProvided"),
  ],
});

/** Observation reassessment — interval reassessment and discharge readiness documentation framework. */
export const OBSERVATION_REASSESSMENT_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    obsReassess("hpiObservationReasonReviewed"),
    obsReassess("hpiIntervalSymptomsReviewed"),
    obsReassess("hpiResponseToTreatmentReviewed"),
    obsReassess("hpiRepeatVitalSignsReviewed"),
    obsReassess("hpiPainStatusReviewed"),
    obsReassess("hpiOralIntakeReviewed"),
    obsReassess("hpiAmbulationStatusReviewed"),
    obsReassess("hpiFamilyCaregiverUpdateReviewed"),
    obsReassess("hpiConsultantRecommendationsReviewed"),
    obsReassess("hpiPendingTestResultsReviewed"),
  ],
  rosImportantPositives: [
    obsReassess("rosPersistentSymptoms"),
    obsReassess("rosImprovedSymptoms"),
    obsReassess("rosPainImproved"),
    obsReassess("rosNauseaImproved"),
    obsReassess("rosDizzinessImproved"),
    obsReassess("rosShortnessOfBreathImproved"),
  ],
  rosImportantNegatives: [
    obsReassess("rosDeniesWorseningSymptoms"),
    obsReassess("rosDeniesNewChestPain"),
    obsReassess("rosDeniesNewShortnessOfBreath"),
    obsReassess("rosDeniesNewNeurologicSymptoms"),
    obsReassess("rosDeniesPersistentVomiting"),
  ],
  rosRedFlags: [
    obsReassess("rfWorseningClinicalStatus"),
    obsReassess("rfAbnormalRepeatVitals"),
    obsReassess("rfUncontrolledPain"),
    obsReassess("rfInabilityToToleratePo"),
    obsReassess("rfUnsafeAmbulation"),
    obsReassess("rfNewConcerningSymptoms"),
    obsReassess("rfPendingCriticalResult"),
  ],
  physicalExam: {
    general: [obsReassess("examImprovedAppearance"), obsReassess("examNoAcuteDistress")],
    respiratory: [obsReassess("examRepeatCardiopulmonaryExamStable")],
    abdomen: [obsReassess("examRepeatAbdominalExamStable")],
    neuroPsych: [
      obsReassess("examRepeatNeurologicExamStable"),
      obsReassess("examAmbulatoryWithoutDifficulty"),
      obsReassess("examToleratingOralIntake"),
    ],
  },
  mdmWorkingAssessment: [
    obsReassess("mdmDischargeReadinessAssessed"),
    obsReassess("mdmObservationFailureConsidered"),
  ],
  mdmDifferentialSynthesis: [
    obsReassess("diffImprovingAcuteCondition"),
    obsReassess("diffPersistentSymptomsRequiringAdmission"),
    obsReassess("diffTreatmentResponseIncomplete"),
    obsReassess("diffEvolvingDiagnosis"),
    obsReassess("diffDischargeReadiness"),
    obsReassess("diffObservationFailure"),
  ],
  mdmDataReviewed: [
    obsReassess("mdmPendingStudiesReviewed"),
    obsReassess("mdmConsultantRecommendationsReviewed"),
    obsReassess("mdmRepeatVitalsReviewed"),
  ],
  mdmClinicalRationale: [
    obsReassess("mdmIntervalReassessmentPerformed"),
    obsReassess("mdmResponseToTherapyReviewed"),
    obsReassess("mdmRepeatExamDocumented"),
    obsReassess("mdmSharedDecisionMakingDocumented"),
  ],
  mdmAdmitObserveDischarge: [
    obsReassess("mdmAdmissionConsidered"),
    obsReassess("mdmObservationContinuedConsidered"),
  ],
  reassessment: [
    obsReassess("reassessSymptomsImproved"),
    obsReassess("reassessRepeatExamStable"),
    obsReassess("reassessVitalsStable"),
    obsReassess("reassessPatientAmbulatory"),
    obsReassess("reassessToleratingOralIntake"),
    obsReassess("reassessFamilyCaregiverComfortableWithPlan"),
  ],
  followUpDisposition: [
    obsReassess("dispDischargedAfterObservationImprovement"),
    obsReassess("dispAdmissionDueToPersistentSymptoms"),
    obsReassess("dispObservationContinued"),
    obsReassess("dispReturnPrecautionsReviewed"),
    obsReassess("dispFollowUpArrangedRecommended"),
  ],
});

/** MVC / collision — blunt trauma mechanism and C-spine documentation framework. */
export const MVC_COLLISION_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    mvcIntel("hpiRestrainedDriverPassenger"),
    mvcIntel("hpiUnrestrainedOccupant"),
    mvcIntel("hpiAirbagDeployment"),
    mvcIntel("hpiVehicleSpeedReviewed"),
    mvcIntel("hpiRearEndCollision"),
    mvcIntel("hpiSideImpactCollision"),
    mvcIntel("hpiRolloverMechanism"),
    mvcIntel("hpiEjectionDeniedReviewed"),
    mvcIntel("hpiLossOfConsciousnessReviewed"),
    mvcIntel("hpiHeadStrikeReviewed"),
    mvcIntel("hpiAmbulatoryAtScene"),
    mvcIntel("hpiEmsEvaluationReviewed"),
    mvcIntel("hpiAnticoagulantUseReviewed"),
    mvcIntel("hpiNeckPainReported"),
    mvcIntel("hpiBackPainReported"),
    mvcIntel("hpiChestAbdominalPainReviewed"),
  ],
  rosImportantPositives: [
    mvcIntel("rosNeckPain"),
    mvcIntel("rosBackPain"),
    mvcIntel("rosHeadache"),
    mvcIntel("rosChestWallPain"),
    mvcIntel("rosAbdominalPain"),
    mvcIntel("rosExtremityPain"),
    mvcIntel("rosDizziness"),
  ],
  rosImportantNegatives: [
    mvcIntel("rosDeniesLossOfConsciousness"),
    mvcIntel("rosDeniesFocalWeakness"),
    mvcIntel("rosDeniesNumbnessTingling"),
    mvcIntel("rosDeniesChestPain"),
    mvcIntel("rosDeniesAbdominalPain"),
    mvcIntel("rosDeniesShortnessOfBreath"),
  ],
  rosRedFlags: [
    mvcIntel("rfHighSpeedMechanism"),
    mvcIntel("rfRolloverEjectionMechanism"),
    mvcIntel("rfNeurologicDeficit"),
    mvcIntel("rfMidlineSpinalTenderness"),
    mvcIntel("rfAnticoagulatedHeadInjury"),
    mvcIntel("rfChestAbdominalTraumaConcern"),
    mvcIntel("rfIntoxicationLimitingExam"),
  ],
  physicalExam: {
    general: [mvcIntel("examAlertAndOriented"), mvcIntel("examNoAcuteDistress")],
    heent: [mvcIntel("examCervicalSpineTenderness"), mvcIntel("examNoMidlineSpinalTenderness")],
    cardiovascular: [mvcIntel("examChestWallTenderness")],
    abdomen: [mvcIntel("examAbdomenSoftNonTender"), mvcIntel("examSeatbeltSignAssessed")],
    musculoskeletal: [mvcIntel("examExtremityTenderness")],
    neuroPsych: [
      mvcIntel("examNeurovascularlyIntact"),
      mvcIntel("examNoFocalNeurologicDeficit"),
      mvcIntel("examGaitAssessed"),
    ],
  },
  mdmWorkingAssessment: [
    mvcIntel("mdmChestAbdominalInjuryConsidered"),
    mvcIntel("mdmHeadInjuryConsidered"),
  ],
  mdmDifferentialSynthesis: [
    mvcIntel("diffCervicalStrain"),
    mvcIntel("diffThoracicLumbarStrain"),
    mvcIntel("diffConcussion"),
    mvcIntel("diffIntracranialHemorrhage"),
    mvcIntel("diffCervicalSpineInjury"),
    mvcIntel("diffRibChestWallInjury"),
    mvcIntel("diffIntraAbdominalInjury"),
    mvcIntel("diffExtremityFracture"),
    mvcIntel("diffContusion"),
  ],
  mdmDataReviewed: [
    mvcIntel("mdmImagingReviewedIfObtained"),
    mvcIntel("mdmCtHeadConsideredBasedOnRiskFactors"),
  ],
  mdmClinicalRationale: [
    mvcIntel("mdmMechanismOfMvcReviewed"),
    mvcIntel("mdmCspineDecisionRuleConsidered"),
    mvcIntel("mdmNeurovascularExamDocumented"),
    mvcIntel("mdmDischargePrecautionsDiscussed"),
  ],
  mdmPlanSummary: [
    mvcIntel("mdmPainControlProvided"),
    mvcIntel("mdmSerialReassessmentPerformed"),
  ],
  mdmAdmitObserveDischarge: [mvcIntel("mdmAdmissionObservationConsidered")],
  reassessment: [
    mvcIntel("reassessPainImproved"),
    mvcIntel("reassessNeurologicExamUnchanged"),
    mvcIntel("reassessAmbulatoryReassessmentPerformed"),
    mvcIntel("reassessVitalSignsStable"),
    mvcIntel("reassessRepeatAbdominalExamReassuring"),
  ],
  followUpDisposition: [
    mvcIntel("dispDischargedWithMvcPrecautions"),
    mvcIntel("dispReturnWorseningPainWeaknessNumbnessVomitingConfusion"),
    mvcIntel("dispFollowUpRecommended"),
    mvcIntel("dispAdmissionObservationConsidered"),
  ],
});

/** Assault — IPV / assault safety and injury documentation framework. */
export const ASSAULT_TRAUMA_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    assaultIntel("hpiAssaultMechanismReviewed"),
    assaultIntel("hpiStruckWithFistObject"),
    assaultIntel("hpiKicked"),
    assaultIntel("hpiStrangulationChokingReviewed"),
    assaultIntel("hpiLossOfConsciousnessReviewed"),
    assaultIntel("hpiHeadStrikeReviewed"),
    assaultIntel("hpiWeaponInvolvementReviewed"),
    assaultIntel("hpiSexualAssaultConcernReviewed"),
    assaultIntel("hpiLawEnforcementInvolved"),
    assaultIntel("hpiSafetyAtDischargeReviewed"),
    assaultIntel("hpiAnticoagulantUseReviewed"),
    assaultIntel("hpiPainLocationsReviewed"),
    assaultIntel("hpiTimeSinceAssaultReviewed"),
  ],
  rosImportantPositives: [
    assaultIntel("rosHeadache"),
    assaultIntel("rosFacialPain"),
    assaultIntel("rosNeckPain"),
    assaultIntel("rosChestWallPain"),
    assaultIntel("rosAbdominalPain"),
    assaultIntel("rosExtremityPain"),
    assaultIntel("rosDizziness"),
    assaultIntel("rosAnxietyDistress"),
  ],
  rosImportantNegatives: [
    assaultIntel("rosDeniesLossOfConsciousness"),
    assaultIntel("rosDeniesShortnessOfBreath"),
    assaultIntel("rosDeniesFocalWeakness"),
    assaultIntel("rosDeniesNumbness"),
    assaultIntel("rosDeniesAbdominalPain"),
    assaultIntel("rosDeniesSexualAssaultConcernWhenAppropriate"),
  ],
  rosRedFlags: [
    assaultIntel("rfStrangulationChokingConcern"),
    assaultIntel("rfWeaponInjury"),
    assaultIntel("rfSexualAssaultConcern"),
    assaultIntel("rfUnsafeDischargeEnvironment"),
    assaultIntel("rfLossOfConsciousness"),
    assaultIntel("rfNeurologicDeficit"),
    assaultIntel("rfAbdominalTraumaConcern"),
    assaultIntel("rfFacialFractureConcern"),
  ],
  physicalExam: {
    general: [assaultIntel("examAlertAndOriented"), assaultIntel("examDistressedAnxiousAppearance")],
    heent: [assaultIntel("examFacialInjuryNoted"), assaultIntel("examScalpTenderness"), assaultIntel("examNeckTenderness")],
    cardiovascular: [assaultIntel("examChestWallTenderness")],
    abdomen: [assaultIntel("examAbdomenSoftNonTender")],
    skin: [assaultIntel("examBruisingAbrasionsNoted")],
    neuroPsych: [assaultIntel("examNoFocalNeurologicDeficit"), assaultIntel("examNeurovascularlyIntact")],
  },
  mdmWorkingAssessment: [
    assaultIntel("mdmStrangulationRedFlagsConsidered"),
    assaultIntel("mdmAbdominalTraumaConsidered"),
  ],
  mdmDifferentialSynthesis: [
    assaultIntel("diffContusion"),
    assaultIntel("diffConcussion"),
    assaultIntel("diffIntracranialInjury"),
    assaultIntel("diffFacialFracture"),
    assaultIntel("diffCervicalSpineInjury"),
    assaultIntel("diffRibChestWallInjury"),
    assaultIntel("diffIntraAbdominalInjury"),
    assaultIntel("diffSoftTissueInjury"),
    assaultIntel("diffStrangulationInjury"),
    assaultIntel("diffAcuteStressReaction"),
  ],
  mdmDataReviewed: [assaultIntel("mdmImagingConsideredBasedOnInjuryPattern")],
  mdmClinicalRationale: [
    assaultIntel("mdmAssaultHistoryDocumented"),
    assaultIntel("mdmSafetyScreeningPerformed"),
    assaultIntel("mdmLawEnforcementInvolvementReviewed"),
    assaultIntel("mdmSexualAssaultResourcesConsideredOfferedIfApplicable"),
    assaultIntel("mdmNeurovascularExamDocumented"),
    assaultIntel("mdmSocialWorkAdvocacyResourcesConsidered"),
    assaultIntel("mdmSafeDischargePlanAssessed"),
  ],
  mdmPlanSummary: [
    assaultIntel("mdmPainControlProvided"),
    assaultIntel("mdmSerialReassessmentPerformed"),
  ],
  reassessment: [
    assaultIntel("reassessPainImproved"),
    assaultIntel("reassessNeurologicExamUnchanged"),
    assaultIntel("reassessSafetyPlanReassessed"),
    assaultIntel("reassessVitalSignsStable"),
  ],
  followUpDisposition: [
    assaultIntel("dispDischargedWithAssaultPrecautions"),
    assaultIntel("dispSafetyResourcesProvidedIfApplicable"),
    assaultIntel("dispReturnWorseningPainNeuroSymptomsVomitingBreathingDifficulty"),
    assaultIntel("dispFollowUpRecommended"),
    assaultIntel("dispTransferAdmissionConsideredIfUnsafeOrSevereInjury"),
  ],
});

/** Neck pain trauma — cervical spine red flag documentation framework. */
export const NECK_PAIN_TRAUMA_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    neckTrauma("hpiTraumaMechanismReviewed"),
    neckTrauma("hpiNeckPainOnsetReviewed"),
    neckTrauma("hpiMidlinePainReviewed"),
    neckTrauma("hpiRadiationToArmReviewed"),
    neckTrauma("hpiNumbnessTinglingReviewed"),
    neckTrauma("hpiWeaknessReviewed"),
    neckTrauma("hpiLossOfConsciousnessReviewed"),
    neckTrauma("hpiHeadInjuryReviewed"),
    neckTrauma("hpiAnticoagulantUseReviewed"),
    neckTrauma("hpiIntoxicationReviewed"),
    neckTrauma("hpiPriorCervicalSpineDiseaseReviewed"),
  ],
  rosImportantPositives: [
    neckTrauma("rosNeckPain"),
    neckTrauma("rosHeadache"),
    neckTrauma("rosArmPain"),
    neckTrauma("rosNumbnessTingling"),
    neckTrauma("rosWeakness"),
    neckTrauma("rosDizziness"),
  ],
  rosImportantNegatives: [
    neckTrauma("rosDeniesFocalWeakness"),
    neckTrauma("rosDeniesNumbnessTingling"),
    neckTrauma("rosDeniesBowelBladderSymptoms"),
    neckTrauma("rosDeniesLossOfConsciousness"),
    neckTrauma("rosDeniesFever"),
    neckTrauma("rosDeniesChestPain"),
  ],
  rosRedFlags: [
    neckTrauma("rfMidlineCervicalTenderness"),
    neckTrauma("rfNeurologicDeficit"),
    neckTrauma("rfHighRiskMechanism"),
    neckTrauma("rfAlteredMentalStatusIntoxication"),
    neckTrauma("rfAnticoagulatedHeadInjury"),
    neckTrauma("rfSpinalCordSymptoms"),
  ],
  physicalExam: {
    heent: [
      neckTrauma("examCervicalMidlineTenderness"),
      neckTrauma("examParaspinalTenderness"),
      neckTrauma("examLimitedRangeOfMotion"),
      neckTrauma("examNoMidlineTenderness"),
    ],
    musculoskeletal: [neckTrauma("examUpperExtremityStrengthIntact")],
    neuroPsych: [
      neckTrauma("examSensationIntact"),
      neckTrauma("examReflexesGrosslyIntact"),
      neckTrauma("examNoFocalNeurologicDeficit"),
      neckTrauma("examGaitSteady"),
    ],
  },
  mdmWorkingAssessment: [
    neckTrauma("mdmCervicalSpineInjuryConsidered"),
    neckTrauma("mdmSpinalCordInjuryConsidered"),
  ],
  mdmDifferentialSynthesis: [
    neckTrauma("diffCervicalStrain"),
    neckTrauma("diffCervicalSpineFracture"),
    neckTrauma("diffLigamentousInjury"),
    neckTrauma("diffRadiculopathy"),
    neckTrauma("diffSpinalCordInjury"),
    neckTrauma("diffConcussionHeadInjury"),
    neckTrauma("diffMuscleSpasm"),
  ],
  mdmDataReviewed: [neckTrauma("mdmCervicalSpineImagingConsideredReviewed")],
  mdmClinicalRationale: [
    neckTrauma("mdmNexusCanadianCspineConsiderationsReviewed"),
    neckTrauma("mdmNeurologicExamDocumented"),
    neckTrauma("mdmHighRiskMechanismAssessed"),
    neckTrauma("mdmReturnPrecautionsDiscussed"),
    neckTrauma("mdmSpineOrthopedicFollowUpConsidered"),
  ],
  mdmPlanSummary: [
    neckTrauma("mdmPainControlProvided"),
    neckTrauma("mdmReassessmentPerformed"),
  ],
  reassessment: [
    neckTrauma("reassessPainImproved"),
    neckTrauma("reassessNeurologicExamUnchanged"),
    neckTrauma("reassessAmbulatoryStatusStable"),
    neckTrauma("reassessNoNewNeurologicSymptoms"),
  ],
  followUpDisposition: [
    neckTrauma("dispDischargedWithNeckInjuryPrecautions"),
    neckTrauma("dispReturnWeaknessNumbnessWorseningPain"),
    neckTrauma("dispFollowUpRecommended"),
    neckTrauma("dispAdmissionConsultConsideredIfAbnormalImagingOrNeurologicFindings"),
  ],
});

/** Back pain trauma — thoracic/lumbar spine and cauda equina red flag documentation framework. */
export const BACK_PAIN_TRAUMA_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    backTrauma("hpiTraumaMechanismReviewed"),
    backTrauma("hpiBackPainLocationReviewed"),
    backTrauma("hpiMidlineTendernessReviewed"),
    backTrauma("hpiRadiationToLegReviewed"),
    backTrauma("hpiNumbnessTinglingReviewed"),
    backTrauma("hpiWeaknessReviewed"),
    backTrauma("hpiBowelBladderSymptomsReviewed"),
    backTrauma("hpiSaddleAnesthesiaReviewed"),
    backTrauma("hpiAnticoagulantUseReviewed"),
    backTrauma("hpiPriorSpineDiseaseReviewed"),
    backTrauma("hpiAbilityToAmbulateReviewed"),
  ],
  rosImportantPositives: [
    backTrauma("rosBackPain"),
    backTrauma("rosLegPain"),
    backTrauma("rosNumbnessTingling"),
    backTrauma("rosWeakness"),
    backTrauma("rosDifficultyWalking"),
  ],
  rosImportantNegatives: [
    backTrauma("rosDeniesBowelBladderIncontinence"),
    backTrauma("rosDeniesSaddleAnesthesia"),
    backTrauma("rosDeniesFocalWeakness"),
    backTrauma("rosDeniesNumbness"),
    backTrauma("rosDeniesFever"),
    backTrauma("rosDeniesAbdominalPain"),
  ],
  rosRedFlags: [
    backTrauma("rfMidlineSpinalTenderness"),
    backTrauma("rfNeurologicDeficit"),
    backTrauma("rfBowelBladderDysfunction"),
    backTrauma("rfSaddleAnesthesia"),
    backTrauma("rfHighEnergyMechanism"),
    backTrauma("rfInabilityToAmbulate"),
    backTrauma("rfAnticoagulatedTraumaConcern"),
  ],
  physicalExam: {
    musculoskeletal: [
      backTrauma("examThoracicLumbarTenderness"),
      backTrauma("examParaspinalTenderness"),
      backTrauma("examNoMidlineTenderness"),
    ],
    neuroPsych: [
      backTrauma("examLowerExtremityStrengthIntact"),
      backTrauma("examSensationIntact"),
      backTrauma("examReflexesGrosslyIntact"),
      backTrauma("examGaitAssessed"),
      backTrauma("examNoFocalNeurologicDeficit"),
      backTrauma("examNoSaddleAnesthesiaReportedExaminedIfApplicable"),
    ],
  },
  mdmWorkingAssessment: [
    backTrauma("mdmSpinalCordInjuryConsidered"),
    backTrauma("mdmCaudaEquinaConsidered"),
  ],
  mdmDifferentialSynthesis: [
    backTrauma("diffBackStrain"),
    backTrauma("diffVertebralFracture"),
    backTrauma("diffCompressionFracture"),
    backTrauma("diffRadiculopathy"),
    backTrauma("diffSpinalCordInjury"),
    backTrauma("diffCaudaEquinaSyndrome"),
    backTrauma("diffRenalInjury"),
    backTrauma("diffIntraAbdominalInjuryReferredPain"),
  ],
  mdmDataReviewed: [backTrauma("mdmSpineImagingConsideredReviewed")],
  mdmClinicalRationale: [
    backTrauma("mdmTraumaMechanismReviewed"),
    backTrauma("mdmNeurologicRedFlagsAssessed"),
    backTrauma("mdmCaudaEquinaSymptomsReviewed"),
    backTrauma("mdmReturnPrecautionsDiscussed"),
    backTrauma("mdmSpineFollowUpConsidered"),
  ],
  mdmPlanSummary: [
    backTrauma("mdmPainControlProvided"),
    backTrauma("mdmAmbulatoryReassessmentPerformed"),
  ],
  reassessment: [
    backTrauma("reassessPainImproved"),
    backTrauma("reassessNeurologicExamUnchanged"),
    backTrauma("reassessAmbulationReassessed"),
    backTrauma("reassessVitalSignsStable"),
  ],
  followUpDisposition: [
    backTrauma("dispDischargedWithBackInjuryPrecautions"),
    backTrauma("dispReturnWeaknessNumbnessBowelBladderChanges"),
    backTrauma("dispFollowUpRecommended"),
    backTrauma("dispAdmissionConsultConsideredIfNeurologicDeficitOrImagingAbnormality"),
  ],
});

export const CRUSH_INJURY_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    crushIntel("hpiCrushMechanism"),
    crushIntel("hpiDurationOfCompression"),
    crushIntel("hpiBodyPartInvolved"),
    crushIntel("hpiPainSwelling"),
    crushIntel("hpiNumbnessTingling"),
    crushIntel("hpiWeakness"),
    crushIntel("hpiUrineColorReviewed"),
    crushIntel("hpiTimeSinceInjury"),
    crushIntel("hpiOccupationalIndustrialInjury"),
    crushIntel("hpiAbilityToMoveExtremity"),
  ],
  rosImportantPositives: [
    crushIntel("rosPain"),
    crushIntel("rosSwelling"),
    crushIntel("rosNumbnessTingling"),
    crushIntel("rosWeakness"),
    crushIntel("rosDarkUrineConcern"),
  ],
  rosImportantNegatives: [
    crushIntel("rosDeniesNumbness"),
    crushIntel("rosDeniesWeakness"),
    crushIntel("rosDeniesOpenWound"),
    crushIntel("rosDeniesDecreasedPulses"),
  ],
  rosRedFlags: [
    crushIntel("rfCompartmentSyndromeConcern"),
    crushIntel("rfRhabdomyolysisConcern"),
    crushIntel("rfNeurovascularCompromise"),
    crushIntel("rfOpenFractureConcern"),
    crushIntel("rfSevereSwelling"),
    crushIntel("rfDarkUrine"),
    crushIntel("rfDecreasedPulses"),
  ],
  physicalExam: {
    musculoskeletal: [
      crushIntel("examSwelling"),
      crushIntel("examTenderness"),
      crushIntel("examCompartmentsSoft"),
      crushIntel("examCompartmentsFirm"),
    ],
    cardiovascular: [crushIntel("examDistalPulsesIntact"), crushIntel("examCapRefillNormal")],
    neuroPsych: [crushIntel("examSensationIntact"), crushIntel("examMotorFunctionIntact")],
    skin: [crushIntel("examOpenWoundPresent"), crushIntel("examOpenWoundAbsent")],
  },
  mdmWorkingAssessment: [
    crushIntel("mdmCompartmentSyndromeConsidered"),
    crushIntel("mdmRhabdomyolysisConsidered"),
  ],
  mdmDifferentialSynthesis: [
    crushIntel("diffContusion"),
    crushIntel("diffFracture"),
    crushIntel("diffCompartmentSyndrome"),
    crushIntel("diffRhabdomyolysis"),
    crushIntel("diffNeurovascularInjury"),
    crushIntel("diffCrushSyndrome"),
    crushIntel("diffSoftTissueInjury"),
  ],
  mdmDataReviewed: [
    crushIntel("mdmCkRenalFunctionConsideredReviewed"),
    crushIntel("mdmXrayReviewedIfObtained"),
  ],
  mdmClinicalRationale: [crushIntel("mdmNeurovascularExamDocumented"), crushIntel("mdmSerialReassessmentPerformed")],
  mdmPlanSummary: [crushIntel("mdmIvFluidsConsideredAdministered")],
  mdmAdmitObserveDischarge: [
    crushIntel("mdmOrthopedicConsultationConsidered"),
    crushIntel("mdmAdmissionObservationConsidered"),
  ],
  reassessment: [
    crushIntel("reassessPainReassessed"),
    crushIntel("reassessNeurovascularExamUnchanged"),
    crushIntel("reassessCompartmentsReassessed"),
    crushIntel("reassessSwellingStable"),
  ],
  followUpDisposition: [
    crushIntel("dispReturnWorseningPainSwellingNumbness"),
    crushIntel("dispOrthoFollowUp"),
    crushIntel("dispAdmissionObservationIfRhabdoCompartmentConcern"),
  ],
});

export const PENETRATING_INJURY_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    penIntel("hpiPenetratingMechanism"),
    penIntel("hpiObjectWeaponType"),
    penIntel("hpiBodyRegionInvolved"),
    penIntel("hpiTimeSinceInjury"),
    penIntel("hpiBleedingControlled"),
    penIntel("hpiDepthTrajectoryConcern"),
    penIntel("hpiForeignBodyConcern"),
    penIntel("hpiTetanusStatusReviewed"),
    penIntel("hpiAnticoagulationReviewed"),
    penIntel("hpiAssaultSafetyReviewedIfApplicable"),
  ],
  rosImportantPositives: [
    penIntel("rosBleeding"),
    penIntel("rosPain"),
    penIntel("rosNumbness"),
    penIntel("rosWeakness"),
    penIntel("rosShortnessOfBreath"),
  ],
  rosImportantNegatives: [
    penIntel("rosDeniesActiveBleeding"),
    penIntel("rosDeniesNumbness"),
    penIntel("rosDeniesWeakness"),
    penIntel("rosDeniesShortnessOfBreath"),
    penIntel("rosDeniesAbdominalPain"),
  ],
  rosRedFlags: [
    penIntel("rfUncontrolledBleeding"),
    penIntel("rfVascularInjuryConcern"),
    penIntel("rfPneumothoraxConcern"),
    penIntel("rfIntraAbdominalInjuryConcern"),
    penIntel("rfRetainedForeignBody"),
    penIntel("rfNeurovascularCompromise"),
    penIntel("rfUnsafeDischargeEnvironment"),
  ],
  physicalExam: {
    skin: [penIntel("examWoundLocation"), penIntel("examBleedingControlled"), penIntel("examNoExpandingHematoma")],
    cardiovascular: [penIntel("examDistalPulsesIntact")],
    neuroPsych: [penIntel("examSensationIntact"), penIntel("examMotorIntact")],
    abdomen: [penIntel("examAbdomenExamIfRelevant")],
    respiratory: [penIntel("examNoRespiratoryDistress")],
  },
  mdmWorkingAssessment: [
    penIntel("mdmVascularInjuryConsidered"),
    penIntel("mdmIntraAbdominalInjuryConsidered"),
  ],
  mdmDifferentialSynthesis: [
    penIntel("diffSuperficialPunctureLaceration"),
    penIntel("diffRetainedForeignBody"),
    penIntel("diffVascularInjury"),
    penIntel("diffNerveInjury"),
    penIntel("diffTendonInjury"),
    penIntel("diffPneumothorax"),
    penIntel("diffIntraAbdominalInjury"),
    penIntel("diffOpenFracture"),
  ],
  mdmClinicalRationale: [
    penIntel("mdmWoundExploredAsAppropriate"),
    penIntel("mdmTetanusReviewed"),
    penIntel("mdmNeurovascularExamDocumented"),
    penIntel("mdmSafetyLawEnforcementReviewedIfAssaultRelated"),
  ],
  mdmDataReviewed: [penIntel("mdmImagingConsideredForForeignBodyTrajectory")],
  mdmPlanSummary: [
    penIntel("mdmAntibioticsConsidered"),
    penIntel("mdmTraumaSurgeryConsultationConsidered"),
    penIntel("mdmSerialReassessmentPerformed"),
  ],
  reassessment: [
    penIntel("reassessBleedingRemainsControlled"),
    penIntel("reassessNeurovascularExamStable"),
    penIntel("reassessPainImproved"),
    penIntel("reassessVitalSignsStable"),
  ],
  followUpDisposition: [
    penIntel("dispWoundCareInstructions"),
    penIntel("dispInfectionBleedingReturnPrecautions"),
    penIntel("dispSpecialistFollowUpIfNeeded"),
  ],
});

export const BURN_INJURY_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    burnIntel("hpiBurnMechanism"),
    burnIntel("hpiThermalChemicalElectrical"),
    burnIntel("hpiTimeSinceBurn"),
    burnIntel("hpiLocation"),
    burnIntel("hpiEstimatedSizeTbsa"),
    burnIntel("hpiDepthReviewed"),
    burnIntel("hpiInhalationExposureReviewed"),
    burnIntel("hpiCircumferentialBurnReviewed"),
    burnIntel("hpiTetanusStatusReviewed"),
    burnIntel("hpiPainSeverity"),
  ],
  rosImportantPositives: [
    burnIntel("rosPain"),
    burnIntel("rosShortnessOfBreath"),
    burnIntel("rosCough"),
    burnIntel("rosHoarseness"),
    burnIntel("rosFacialBurnSymptoms"),
  ],
  rosImportantNegatives: [
    burnIntel("rosDeniesShortnessOfBreath"),
    burnIntel("rosDeniesHoarseness"),
    burnIntel("rosDeniesCough"),
    burnIntel("rosDeniesThroatTightness"),
  ],
  rosRedFlags: [
    burnIntel("rfInhalationInjuryConcern"),
    burnIntel("rfFacialAirwayBurn"),
    burnIntel("rfCircumferentialBurn"),
    burnIntel("rfHandFaceGenitalBurn"),
    burnIntel("rfElectricalBurn"),
    burnIntel("rfChemicalBurn"),
    burnIntel("rfLargeTbsa"),
    burnIntel("rfPediatricBurnConcern"),
  ],
  physicalExam: {
    skin: [
      burnIntel("examErythema"),
      burnIntel("examBlistering"),
      burnIntel("examFullThicknessConcern"),
      burnIntel("examCircumferentialInvolvement"),
    ],
    heent: [burnIntel("examAirwayNormalNoSoot")],
    neuroPsych: [burnIntel("examSensationIntactDecreased")],
    cardiovascular: [burnIntel("examDistalPerfusionIntact")],
  },
  mdmWorkingAssessment: [
    burnIntel("mdmInhalationInjuryAssessed"),
    burnIntel("mdmBurnDepthAssessed"),
  ],
  mdmDifferentialSynthesis: [
    burnIntel("diffSuperficialBurn"),
    burnIntel("diffPartialThicknessBurn"),
    burnIntel("diffFullThicknessBurn"),
    burnIntel("diffChemicalBurn"),
    burnIntel("diffElectricalInjury"),
    burnIntel("diffInhalationInjury"),
    burnIntel("diffInfectionRisk"),
  ],
  mdmClinicalRationale: [
    burnIntel("mdmTbsaEstimated"),
    burnIntel("mdmTetanusReviewed"),
    burnIntel("mdmDressingInstructionsProvided"),
    burnIntel("mdmSerialReassessmentPerformed"),
  ],
  mdmPlanSummary: [
    burnIntel("mdmPainControlProvided"),
    burnIntel("mdmWoundCarePerformed"),
  ],
  mdmAdmitObserveDischarge: [burnIntel("mdmBurnCenterConsultationTransferConsidered")],
  reassessment: [
    burnIntel("reassessPainImproved"),
    burnIntel("reassessBurnDressed"),
    burnIntel("reassessPerfusionUnchanged"),
    burnIntel("reassessAirwayRemainsStable"),
  ],
  followUpDisposition: [
    burnIntel("dispBurnCareInstructions"),
    burnIntel("dispReturnInfectionWorseningPain"),
    burnIntel("dispBurnClinicFollowUp"),
    burnIntel("dispTransferAdmissionIfHighRiskBurn"),
  ],
});

export const PEDIATRIC_TRAUMA_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    pedTraumaIntel("hpiCaregiverHistorianUsed"),
    pedTraumaIntel("hpiMechanismReviewed"),
    pedTraumaIntel("hpiWitnessedUnwitnessedInjury"),
    pedTraumaIntel("hpiFallHeightReviewed"),
    pedTraumaIntel("hpiHeadStrike"),
    pedTraumaIntel("hpiLocVomitingReviewed"),
    pedTraumaIntel("hpiBehaviorChangeReviewed"),
    pedTraumaIntel("hpiAmbulatoryStatusReviewed"),
    pedTraumaIntel("hpiPainLocationReviewed"),
    pedTraumaIntel("hpiNonAccidentalTraumaConcernConsideredWhenAppropriate"),
  ],
  rosImportantPositives: [
    pedTraumaIntel("rosPain"),
    pedTraumaIntel("rosVomiting"),
    pedTraumaIntel("rosHeadache"),
    pedTraumaIntel("rosLethargy"),
    pedTraumaIntel("rosAbdominalPain"),
    pedTraumaIntel("rosExtremityPain"),
  ],
  rosImportantNegatives: [
    pedTraumaIntel("rosDeniesLossOfConsciousness"),
    pedTraumaIntel("rosDeniesPersistentVomiting"),
    pedTraumaIntel("rosDeniesFocalWeakness"),
    pedTraumaIntel("rosDeniesAbdominalPain"),
    pedTraumaIntel("rosDeniesBehaviorChange"),
  ],
  rosRedFlags: [
    pedTraumaIntel("rfAlteredMentalStatus"),
    pedTraumaIntel("rfPersistentVomiting"),
    pedTraumaIntel("rfNonAccidentalTraumaConcern"),
    pedTraumaIntel("rfHighRiskMechanism"),
    pedTraumaIntel("rfFocalNeurologicDeficit"),
    pedTraumaIntel("rfAbdominalTraumaConcern"),
    pedTraumaIntel("rfInabilityToAmbulate"),
  ],
  physicalExam: {
    general: [
      pedTraumaIntel("examChildNonToxicInteractive"),
      pedTraumaIntel("examAgeAppropriateBehavior"),
    ],
    heent: [pedTraumaIntel("examScalpInjury")],
    abdomen: [pedTraumaIntel("examAbdominalTenderness")],
    musculoskeletal: [pedTraumaIntel("examExtremityTenderness")],
    neuroPsych: [
      pedTraumaIntel("examNeuroExamAgeAppropriate"),
      pedTraumaIntel("examGaitAmbulationIfAppropriate"),
    ],
    skin: [pedTraumaIntel("examBruisingPatternReviewedIfClinicallyIndicated")],
  },
  mdmWorkingAssessment: [
    pedTraumaIntel("mdmHeadInjuryConsidered"),
    pedTraumaIntel("mdmAbdominalInjuryConsidered"),
  ],
  mdmDifferentialSynthesis: [
    pedTraumaIntel("diffContusion"),
    pedTraumaIntel("diffFracture"),
    pedTraumaIntel("diffConcussion"),
    pedTraumaIntel("diffIntracranialInjury"),
    pedTraumaIntel("diffAbdominalInjury"),
    pedTraumaIntel("diffNatConcern"),
    pedTraumaIntel("diffSprainStrain"),
  ],
  mdmClinicalRationale: [
    pedTraumaIntel("mdmCaregiverHistoryReviewed"),
    pedTraumaIntel("mdmMechanismAssessed"),
    pedTraumaIntel("mdmPediatricHeadInjuryDecisionConsiderations"),
    pedTraumaIntel("mdmChildProtectionConcernConsideredIfIndicated"),
    pedTraumaIntel("mdmCaregiverCounselingDocumented"),
  ],
  mdmDataReviewed: [pedTraumaIntel("mdmImagingConsideredReviewed")],
  mdmPlanSummary: [pedTraumaIntel("mdmSerialReassessmentPerformed")],
  reassessment: [
    pedTraumaIntel("reassessChildRemainsInteractive"),
    pedTraumaIntel("reassessPainImproved"),
    pedTraumaIntel("reassessRepeatExamStable"),
    pedTraumaIntel("reassessToleratingPo"),
  ],
  followUpDisposition: [
    pedTraumaIntel("dispCaregiverReturnPrecautions"),
    pedTraumaIntel("dispReturnVomitingConfusionWorseningPain"),
    pedTraumaIntel("dispPediatricFollowUpRecommended"),
    pedTraumaIntel("dispAdmissionTransferConsideredIfConcerningFindings"),
  ],
});

export const MALE_GENITAL_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    maleGenIntel("hpiTesticularPain"),
    maleGenIntel("hpiScrotalSwelling"),
    maleGenIntel("hpiDysuria"),
    maleGenIntel("hpiPenileDischarge"),
    maleGenIntel("hpiTraumaReviewed"),
    maleGenIntel("hpiOnsetSuddenGradual"),
    maleGenIntel("hpiNauseaVomiting"),
    maleGenIntel("hpiSexualHistoryReviewedIfClinicallyAppropriate"),
    maleGenIntel("hpiStiExposureReviewed"),
    maleGenIntel("hpiUrinarySymptomsReviewed"),
  ],
  rosImportantPositives: [
    maleGenIntel("rosTesticularPain"),
    maleGenIntel("rosScrotalSwelling"),
    maleGenIntel("rosDysuria"),
    maleGenIntel("rosPenileDischarge"),
    maleGenIntel("rosNausea"),
    maleGenIntel("rosFever"),
  ],
  rosImportantNegatives: [
    maleGenIntel("rosDeniesFever"),
    maleGenIntel("rosDeniesPenileDischarge"),
    maleGenIntel("rosDeniesTrauma"),
    maleGenIntel("rosDeniesUrinaryRetention"),
    maleGenIntel("rosDeniesSeverePain"),
  ],
  rosRedFlags: [
    maleGenIntel("rfTesticularTorsionConcern"),
    maleGenIntel("rfSevereSuddenTesticularPain"),
    maleGenIntel("rfHighRidingTesticleConcern"),
    maleGenIntel("rfAbsentCremastericReflexConcern"),
    maleGenIntel("rfScrotalTrauma"),
    maleGenIntel("rfFournierGangreneConcern"),
    maleGenIntel("rfUrinaryRetention"),
  ],
  physicalExam: {
    general: [maleGenIntel("examChaperoneOfferedPresentIfApplicable")],
    abdomen: [maleGenIntel("examInguinalHerniaAssessed")],
    skin: [
      maleGenIntel("examTesticularTenderness"),
      maleGenIntel("examScrotalSwelling"),
      maleGenIntel("examPenileDischarge"),
      maleGenIntel("examNoSkinNecrosis"),
      maleGenIntel("examCremastericReflexDocumentedIfPerformed"),
    ],
  },
  mdmWorkingAssessment: [
    maleGenIntel("mdmTesticularTorsionConsidered"),
    maleGenIntel("mdmStiConsidered"),
  ],
  mdmDifferentialSynthesis: [
    maleGenIntel("diffTesticularTorsion"),
    maleGenIntel("diffEpididymitis"),
    maleGenIntel("diffOrchitis"),
    maleGenIntel("diffStiUrethritis"),
    maleGenIntel("diffInguinalHernia"),
    maleGenIntel("diffScrotalTrauma"),
    maleGenIntel("diffHydroceleVaricocele"),
    maleGenIntel("diffFournierGangrene"),
  ],
  mdmDataReviewed: [
    maleGenIntel("mdmUrinalysisReviewed"),
    maleGenIntel("mdmScrotalUltrasoundConsideredReviewed"),
  ],
  mdmClinicalRationale: [
    maleGenIntel("mdmStiTestingTreatmentConsidered"),
    maleGenIntel("mdmAntibioticsConsidered"),
    maleGenIntel("mdmChaperoneDocumentationIncluded"),
  ],
  mdmPlanSummary: [maleGenIntel("mdmUrologyConsultationConsidered")],
  mdmAdmitObserveDischarge: [maleGenIntel("mdmEmergentTransferConsultConsideredIfTorsionConcern")],
  reassessment: [
    maleGenIntel("reassessPainReassessed"),
    maleGenIntel("reassessVitalSignsStable"),
    maleGenIntel("reassessUltrasoundLabResultsReviewed"),
  ],
  followUpDisposition: [
    maleGenIntel("dispUrologyFollowUp"),
    maleGenIntel("dispStiPrecautionsIfRelevant"),
    maleGenIntel("dispReturnWorseningPainSwellingFever"),
    maleGenIntel("dispEmergentReturnTorsionSymptoms"),
  ],
});

export const FEMALE_PELVIC_GYN_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    femaleGynIntel("hpiPelvicPain"),
    femaleGynIntel("hpiVaginalBleeding"),
    femaleGynIntel("hpiVaginalDischarge"),
    femaleGynIntel("hpiPregnancyConcern"),
    femaleGynIntel("hpiLmpReviewed"),
    femaleGynIntel("hpiDysuriaReviewed"),
    femaleGynIntel("hpiStiExposureReviewed"),
    femaleGynIntel("hpiAbdominalPainReviewed"),
    femaleGynIntel("hpiFeverReviewed"),
    femaleGynIntel("hpiSexualAssaultConcernReviewedIfClinicallyAppropriate"),
  ],
  rosImportantPositives: [
    femaleGynIntel("rosPelvicPain"),
    femaleGynIntel("rosVaginalBleeding"),
    femaleGynIntel("rosVaginalDischarge"),
    femaleGynIntel("rosAbdominalPain"),
    femaleGynIntel("rosFever"),
    femaleGynIntel("rosDysuria"),
  ],
  rosImportantNegatives: [
    femaleGynIntel("rosDeniesHeavyBleeding"),
    femaleGynIntel("rosDeniesSeverePain"),
    femaleGynIntel("rosDeniesFever"),
    femaleGynIntel("rosDeniesSyncope"),
    femaleGynIntel("rosDeniesPregnancyConcern"),
  ],
  rosRedFlags: [
    femaleGynIntel("rfEctopicPregnancyConcern"),
    femaleGynIntel("rfHeavyVaginalBleeding"),
    femaleGynIntel("rfPidConcern"),
    femaleGynIntel("rfOvarianTorsionConcern"),
    femaleGynIntel("rfSexualAssaultConcern"),
    femaleGynIntel("rfPregnancyComplicationConcern"),
    femaleGynIntel("rfSepsisConcern"),
  ],
  physicalExam: {
    general: [femaleGynIntel("examChaperonePresentOffered")],
    abdomen: [femaleGynIntel("examAbdominalTendernessIfPerformed")],
    skin: [
      femaleGynIntel("examExternalExamSummaryDocumented"),
      femaleGynIntel("examSpeculumExamSummaryDocumented"),
      femaleGynIntel("examBimanualExamSummaryDocumented"),
      femaleGynIntel("examCervicalMotionTenderness"),
      femaleGynIntel("examAdnexalTenderness"),
      femaleGynIntel("examDischargeNoted"),
      femaleGynIntel("examBleedingNoted"),
      femaleGynIntel("examDeferredWithReasonIfDeferred"),
    ],
  },
  mdmWorkingAssessment: [
    femaleGynIntel("mdmEctopicPregnancyConsidered"),
    femaleGynIntel("mdmPidConsidered"),
  ],
  mdmDifferentialSynthesis: [
    femaleGynIntel("diffEctopicPregnancy"),
    femaleGynIntel("diffPregnancyRelatedBleeding"),
    femaleGynIntel("diffPid"),
    femaleGynIntel("diffOvarianTorsionCyst"),
    femaleGynIntel("diffCervicitisSti"),
    femaleGynIntel("diffUti"),
    femaleGynIntel("diffVaginitis"),
    femaleGynIntel("diffAbnormalUterineBleeding"),
    femaleGynIntel("diffAppendicitis"),
  ],
  mdmDataReviewed: [
    femaleGynIntel("mdmPregnancyTestingReviewed"),
    femaleGynIntel("mdmPelvicUltrasoundConsideredReviewed"),
  ],
  mdmClinicalRationale: [
    femaleGynIntel("mdmStiTestingTreatmentConsidered"),
    femaleGynIntel("mdmChaperoneDocumentationIncluded"),
    femaleGynIntel("mdmSafetySexualAssaultResourcesConsideredIfApplicable"),
  ],
  mdmPlanSummary: [femaleGynIntel("mdmObGynConsultationConsidered")],
  reassessment: [
    femaleGynIntel("reassessPainReassessed"),
    femaleGynIntel("reassessBleedingStatusReassessed"),
    femaleGynIntel("reassessVitalsStable"),
    femaleGynIntel("reassessTestResultsReviewed"),
  ],
  followUpDisposition: [
    femaleGynIntel("dispObGynFollowUp"),
    femaleGynIntel("dispReturnHeavyBleedingWorseningPainSyncopeFever"),
    femaleGynIntel("dispStiPrecautionsIfRelevant"),
    femaleGynIntel("dispDischargeAfterReassuringEvaluation"),
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
  fever: PEDIATRIC_FEVER_COMPLAINT_INTEL,
  cough: COUGH_COMPLAINT_INTEL,
  asthma_wheezing: PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
  abdominal_pain_pediatric: PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
  nausea_vomiting: PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
  diarrhea: PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
  ear_pain: EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL,
  fall: FALL_COMPLAINT_INTEL,
  head_injury: HEAD_INJURY_COMPLAINT_INTEL,
  laceration: LACERATION_COMPLAINT_INTEL,
  fracture_concern: FRACTURE_CONCERN_COMPLAINT_INTEL,
  urinary_symptoms: UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL,
  hyperglycemia: HYPERGLYCEMIA_COMPLAINT_INTEL,
  hypertension: HYPERTENSION_COMPLAINT_INTEL,
  allergic_reaction_rash: ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
  adult_nausea_vomiting: ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
  adult_diarrhea: ADULT_DIARRHEA_COMPLAINT_INTEL,
  medication_refill: MEDICATION_REFILL_COMPLAINT_INTEL,
  observation_reassessment: OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
  mvc: MVC_COLLISION_COMPLAINT_INTEL,
  assault: ASSAULT_TRAUMA_COMPLAINT_INTEL,
  neck_pain_trauma: NECK_PAIN_TRAUMA_COMPLAINT_INTEL,
  back_pain: BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
  crush_injury: CRUSH_INJURY_COMPLAINT_INTEL,
  penetrating_injury: PENETRATING_INJURY_COMPLAINT_INTEL,
  burn: BURN_INJURY_COMPLAINT_INTEL,
  pediatric_trauma: PEDIATRIC_TRAUMA_COMPLAINT_INTEL,
  male_genital_complaint: MALE_GENITAL_COMPLAINT_INTEL,
  female_pelvic_gyn_complaint: FEMALE_PELVIC_GYN_COMPLAINT_INTEL,
  ...GI_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...INFECTIOUS_ENT_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...NEURO_EXPANSION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
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
  "cough",
] as const;
export const BATCH5_COMPLAINT_TEMPLATE_IDS = [
  "fall",
  "head_injury",
  "laceration",
  "fracture_concern",
] as const;
export const BATCH6_COMPLAINT_TEMPLATE_IDS = [
  "fever",
  "abdominal_pain_pediatric",
  "asthma_wheezing",
  "nausea_vomiting",
] as const;
export const BATCH7_COMPLAINT_TEMPLATE_IDS = [
  "urinary_symptoms",
  "hyperglycemia",
  "hypertension",
  "allergic_reaction_rash",
] as const;
export const BATCH8_COMPLAINT_TEMPLATE_IDS = [
  "adult_nausea_vomiting",
  "adult_diarrhea",
  "medication_refill",
  "observation_reassessment",
] as const;
export const BATCH9_COMPLAINT_TEMPLATE_IDS = [
  "mvc",
  "assault",
  "neck_pain_trauma",
  "back_pain",
] as const;
export const BATCH10_COMPLAINT_TEMPLATE_IDS = [
  "crush_injury",
  "penetrating_injury",
  "burn",
  "pediatric_trauma",
  "male_genital_complaint",
  "female_pelvic_gyn_complaint",
] as const;
export const BATCH11_GI_COMPLAINT_TEMPLATE_IDS = GI_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH12_RESPIRATORY_COMPLAINT_TEMPLATE_IDS = RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH13_CARDIAC_COMPLAINT_TEMPLATE_IDS = CARDIAC_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH14_GU_RENAL_COMPLAINT_TEMPLATE_IDS = GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH15_MSK_TRAUMA_COMPLAINT_TEMPLATE_IDS = MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH16_INFECTIOUS_ENT_COMPLAINT_TEMPLATE_IDS = INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH17_ENDOCRINE_METABOLIC_COMPLAINT_TEMPLATE_IDS = ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH18_NEURO_EXPANSION_COMPLAINT_TEMPLATE_IDS = NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS;
export const COMPLAINT_INTEL_TEMPLATE_IDS = [
  ...BATCH1_COMPLAINT_TEMPLATE_IDS,
  ...BATCH2_COMPLAINT_TEMPLATE_IDS,
  ...BATCH3_COMPLAINT_TEMPLATE_IDS,
  ...BATCH4_COMPLAINT_TEMPLATE_IDS,
  ...BATCH5_COMPLAINT_TEMPLATE_IDS,
  ...BATCH6_COMPLAINT_TEMPLATE_IDS,
  ...BATCH7_COMPLAINT_TEMPLATE_IDS,
  ...BATCH8_COMPLAINT_TEMPLATE_IDS,
  ...BATCH9_COMPLAINT_TEMPLATE_IDS,
  ...BATCH10_COMPLAINT_TEMPLATE_IDS,
  ...BATCH11_GI_COMPLAINT_TEMPLATE_IDS,
  ...BATCH12_RESPIRATORY_COMPLAINT_TEMPLATE_IDS,
  ...BATCH13_CARDIAC_COMPLAINT_TEMPLATE_IDS,
  ...BATCH14_GU_RENAL_COMPLAINT_TEMPLATE_IDS,
  ...BATCH15_MSK_TRAUMA_COMPLAINT_TEMPLATE_IDS,
  ...BATCH16_INFECTIOUS_ENT_COMPLAINT_TEMPLATE_IDS,
  ...BATCH17_ENDOCRINE_METABOLIC_COMPLAINT_TEMPLATE_IDS,
  ...BATCH18_NEURO_EXPANSION_COMPLAINT_TEMPLATE_IDS,
  "uri_respiratory",
  "diarrhea",
  "ear_pain",
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
    ...(bundle.mdmRiskStratification ?? []),
    ...(bundle.mdmClinicalRationale ?? []),
    ...(bundle.clinicalImpression ?? []),
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

export {
  ABDOMINAL_PAIN_COMPLAINT_V1_INTEL,
  NAUSEA_VOMITING_COMPLAINT_V1_INTEL,
  DIARRHEA_COMPLAINT_V1_INTEL,
  CONSTIPATION_COMPLAINT_V1_INTEL,
  GI_BLEED_COMPLAINT_V1_INTEL,
  FLANK_PAIN_COMPLAINT_V1_INTEL,
  HERNIA_COMPLAINT_V1_INTEL,
  RECTAL_PAIN_COMPLAINT_V1_INTEL,
  DYSPHAGIA_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  GI_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationGiComplaintIntelligence19Mdm2";
export {
  COUGH_COMPLAINT_V1_INTEL,
  URI_CONGESTION_COMPLAINT_V1_INTEL,
  SORE_THROAT_COMPLAINT_V1_INTEL,
  ASTHMA_WHEEZING_COMPLAINT_V1_INTEL,
  COPD_EXACERBATION_COMPLAINT_V1_INTEL,
  PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL,
  HEMOPTYSIS_COMPLAINT_V1_INTEL,
  CHEST_CONGESTION_COMPLAINT_V1_INTEL,
  FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
  RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS,
  RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";
export {
  PALPITATIONS_COMPLAINT_V1_INTEL,
  HYPERTENSION_COMPLAINT_V1_INTEL,
  LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
  CHF_SYMPTOMS_COMPLAINT_V1_INTEL,
  AFIB_RAPID_RATE_COMPLAINT_V1_INTEL,
  GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
  NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
  EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
  CARDIAC_COMPLAINT_V1_TEMPLATE_IDS,
  CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationCardiacComplaintIntelligence19Mdm4";
export {
  DYSURIA_COMPLAINT_V1_INTEL,
  HEMATURIA_COMPLAINT_V1_INTEL,
  FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL,
  URINARY_RETENTION_COMPLAINT_V1_INTEL,
  TESTICULAR_PAIN_COMPLAINT_V1_INTEL,
  PELVIC_PAIN_COMPLAINT_V1_INTEL,
  VAGINAL_BLEEDING_COMPLAINT_V1_INTEL,
  VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL,
  RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL,
  GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS,
  GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationGuRenalComplaintIntelligence19Mdm5";
export {
  BACK_PAIN_COMPLAINT_V1_INTEL,
  NECK_PAIN_COMPLAINT_V1_INTEL,
  SHOULDER_INJURY_COMPLAINT_V1_INTEL,
  KNEE_INJURY_COMPLAINT_V1_INTEL,
  ANKLE_FOOT_INJURY_COMPLAINT_V1_INTEL,
  HIP_PAIN_INJURY_COMPLAINT_V1_INTEL,
  HAND_WRIST_INJURY_COMPLAINT_V1_INTEL,
  FALL_TRAUMA_COMPLAINT_V1_INTEL,
  MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL,
  LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS,
  MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
export {
  FEVER_COMPLAINT_V1_INTEL,
  CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL,
  ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  WOUND_INFECTION_COMPLAINT_V1_INTEL,
  EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL,
  SINUS_SYMPTOMS_COMPLAINT_V1_INTEL,
  DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL,
  RASH_SKIN_COMPLAINT_V1_INTEL,
  SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL,
  DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL,
  INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS,
  INFECTIOUS_ENT_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
export {
  HYPERGLYCEMIA_COMPLAINT_V1_INTEL,
  HYPOGLYCEMIA_COMPLAINT_V1_INTEL,
  DIABETES_SICK_DAY_COMPLAINT_V1_INTEL,
  INSULIN_MEDICATION_ISSUE_COMPLAINT_V1_INTEL,
  POLYURIA_POLYDYPSIA_COMPLAINT_V1_INTEL,
  DEHYDRATION_METABOLIC_COMPLAINT_V1_INTEL,
  ELECTROLYTE_ABNORMALITY_COMPLAINT_V1_INTEL,
  THYROID_SYMPTOMS_COMPLAINT_V1_INTEL,
  GENERALIZED_WEAKNESS_METABOLIC_COMPLAINT_V1_INTEL,
  NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL,
  ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS,
  ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationEndocrineMetabolicComplaintIntelligence19Mdm8";
export {
  SEIZURE_COMPLAINT_V1_INTEL,
  ALTERED_MENTAL_STATUS_COMPLAINT_V1_INTEL,
  FOCAL_WEAKNESS_COMPLAINT_V1_INTEL,
  NUMBNESS_TINGLING_COMPLAINT_V1_INTEL,
  TREMOR_MOVEMENT_COMPLAINT_V1_INTEL,
  VERTIGO_COMPLAINT_V1_INTEL,
  MIGRAINE_HEADACHE_COMPLAINT_V1_INTEL,
  CONCUSSION_FOLLOWUP_COMPLAINT_V1_INTEL,
  GAIT_INSTABILITY_FALLS_NEURO_COMPLAINT_V1_INTEL,
  BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL,
  NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS,
  NEURO_EXPANSION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";

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

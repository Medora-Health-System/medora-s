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
  buildAssaultTraumaComplaintIntel,
  buildBackPainTraumaComplaintIntel,
  buildBurnInjuryComplaintIntel,
  buildCrushInjuryComplaintIntel,
  buildFallComplaintIntel,
  buildFractureConcernComplaintIntel,
  buildHeadInjuryComplaintIntel,
  buildLacerationComplaintIntel,
  buildMvcCollisionComplaintIntel,
  buildNeckPainTraumaComplaintIntel,
  buildPediatricTraumaComplaintIntel,
  buildPenetratingInjuryComplaintIntel,
} from "./providerDocumentationTraumaInjuryComplaintIntelGoldStandard";
import { buildFemalePelvicGynComplaintIntel } from "./providerDocumentationFemalePelvicGynComplaintIntelGoldStandard";
import { buildFlankPainComplaintIntel } from "./providerDocumentationFlankPainRenalComplaintIntelGoldStandard";
import { buildMaleGenitalComplaintIntel } from "./providerDocumentationMaleGuComplaintIntelGoldStandard";
import { buildAllergicReactionRashIntel } from "./providerDocumentationRashSkinComplaintIntelGoldStandard";
import {
  buildAdultSobComplaintIntel,
  buildPediatricAsthmaSobComplaintIntel,
} from "./providerDocumentationShortnessOfBreathComplaintIntelGoldStandard";
import {
  buildAdultDiarrheaComplaintIntel,
  buildPediatricDiarrheaComplaintIntel,
} from "./providerDocumentationDiarrheaComplaintIntelGoldStandard";
import {
  buildAdultNauseaVomitingComplaintIntel,
  buildPediatricNauseaVomitingComplaintIntel,
} from "./providerDocumentationNauseaVomitingComplaintIntelGoldStandard";
import { buildUrinarySymptomsComplaintIntel } from "./providerDocumentationUrinarySymptomsComplaintIntelGoldStandard";
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
const pedDiarrhea = (key: string) => `providerDocumentationComplaintIntel.pediatricDiarrhea.${key}`;
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

export const FLANK_PAIN_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildFlankPainComplaintIntel(flank);

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

/** Trauma / injury — ME.2N-R gold-standard builders. */
export const FALL_COMPLAINT_INTEL = buildFallComplaintIntel(fallIntel);
export const HEAD_INJURY_COMPLAINT_INTEL = buildHeadInjuryComplaintIntel(headInj);
export const LACERATION_COMPLAINT_INTEL = buildLacerationComplaintIntel(lac);
export const FRACTURE_CONCERN_COMPLAINT_INTEL = buildFractureConcernComplaintIntel(frac);
export const MVC_COLLISION_COMPLAINT_INTEL = buildMvcCollisionComplaintIntel(mvcIntel);
export const ASSAULT_TRAUMA_COMPLAINT_INTEL = buildAssaultTraumaComplaintIntel(assaultIntel);
export const NECK_PAIN_TRAUMA_COMPLAINT_INTEL = buildNeckPainTraumaComplaintIntel(neckTrauma);
export const BACK_PAIN_TRAUMA_COMPLAINT_INTEL = buildBackPainTraumaComplaintIntel(backTrauma);
export const CRUSH_INJURY_COMPLAINT_INTEL = buildCrushInjuryComplaintIntel(crushIntel);
export const PENETRATING_INJURY_COMPLAINT_INTEL = buildPenetratingInjuryComplaintIntel(penIntel);
export const BURN_INJURY_COMPLAINT_INTEL = buildBurnInjuryComplaintIntel(burnIntel);
export const PEDIATRIC_TRAUMA_COMPLAINT_INTEL = buildPediatricTraumaComplaintIntel(pedTraumaIntel);

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

/** Pediatric diarrhea — dedicated gold-standard bundle (ME.2B-R). */
export const PEDIATRIC_DIARRHEA_COMPLAINT_INTEL = buildPediatricDiarrheaComplaintIntel(pedDiarrhea);

/** UTI / urinary symptoms — cystitis / pyelonephritis documentation framework. */
export const UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildUrinarySymptomsComplaintIntel(uti);

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
export const ALLERGIC_REACTION_RASH_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAllergicReactionRashIntel(allergy);

/** Adult nausea / vomiting — GI red flag and dehydration documentation framework. */
export const ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL = buildAdultNauseaVomitingComplaintIntel(adultNv);

/** Adult diarrhea — infectious diarrhea / C. diff documentation framework. */
export const ADULT_DIARRHEA_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAdultDiarrheaComplaintIntel(adultDiarrhea);

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


export const MALE_GENITAL_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildMaleGenitalComplaintIntel(maleGenIntel);

export const FEMALE_PELVIC_GYN_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildFemalePelvicGynComplaintIntel(femaleGynIntel);

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
  diarrhea: PEDIATRIC_DIARRHEA_COMPLAINT_INTEL,
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

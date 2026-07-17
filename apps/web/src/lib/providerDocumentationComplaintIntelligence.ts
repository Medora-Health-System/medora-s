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
import { buildPsychiatricBehavioralComplaintIntel } from "./providerDocumentationPsychBehavioralComplaintIntelGoldStandard";
import { buildMedicationRefillComplaintIntel } from "./providerDocumentationMedicationRefillGoldStandard";
import { buildObservationReassessmentComplaintIntel } from "./providerDocumentationObservationReassessmentGoldStandard";
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
import {
  ENT_EMERGENCY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ENT_EMERGENCY_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationEntEmergencyComplaintIntelligence";
import {
  SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationSoftTissueWoundInfectionIntelligence";
import {
  DERMATOLOGY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  DERMATOLOGY_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationDermatologyIntelligence";
import {
  ENVIRONMENTAL_EXPOSURE_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ENVIRONMENTAL_EXPOSURE_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationEnvironmentalExposureIntelligence";
import {
  TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationToxicologyIntelligence";
import {
  OBGYN_UROLOGY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS,
} from "./providerDocumentationObGynUrologyIntelligence";
import { buildExtremityMskComplaintIntel } from "./providerDocumentationExtremityMskComplaintIntelGoldStandard";
import {
  buildPediatricCroupComplaintIntel,
  buildPediatricDehydrationComplaintIntel,
  buildPediatricFeverComplaintIntel,
  buildPediatricRashComplaintIntel,
  buildPediatricRsvLikeIllnessComplaintIntel,
  buildPediatricSeizureComplaintIntel,
} from "./providerDocumentationPediatricLegacyComplaintIntelGoldStandard";
import {
  buildAlteredMentalStatusComplaintV1Intel,
  buildBackPainNeuroRedFlagsComplaintV1Intel,
  buildFocalWeaknessComplaintV1Intel,
  buildGaitInstabilityFallsNeuroComplaintV1Intel,
  buildNumbnessTinglingComplaintV1Intel,
  buildStrokeSymptomsComplaintIntel,
  buildWeaknessComplaintIntel,
  NEURO_STROKE_WEAKNESS_TEMPLATE_IDS,
} from "./providerDocumentationNeuroStrokeWeaknessComplaintIntelGoldStandard";

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

export const PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPsychiatricBehavioralComplaintIntel(psych);
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
const pedSeizure = (key: string) => `providerDocumentationComplaintIntel.pediatricSeizure.${key}`;
const pedRash = (key: string) => `providerDocumentationComplaintIntel.pediatricRash.${key}`;
const pedDehydration = (key: string) => `providerDocumentationComplaintIntel.pediatricDehydration.${key}`;
const pedCroup = (key: string) => `providerDocumentationComplaintIntel.pediatricCroup.${key}`;
const pedRsv = (key: string) => `providerDocumentationComplaintIntel.pediatricRsvLikeIllness.${key}`;
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
export const MEDICATION_REFILL_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildMedicationRefillComplaintIntel(medRefill);
const obsReassess = (key: string) => `providerDocumentationComplaintIntel.observationReassessment.${key}`;
export const OBSERVATION_REASSESSMENT_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildObservationReassessmentComplaintIntel(obsReassess);
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

/** Acute neuro symptoms / stroke concern — ME.2W-R gold standard. */
export const STROKE_SYMPTOMS_COMPLAINT_INTEL = buildStrokeSymptomsComplaintIntel(stroke);

/** Headache — ACEP red flags / secondary headache workup framework. */
export const HEADACHE_COMPLAINT_INTEL = buildHeadacheComplaintIntel(ha);

/** Dizziness / syncope — ACEP serious-cause evaluation framework. */
export const DIZZINESS_SYNCOPE_COMPLAINT_INTEL = buildDizzinessSyncopeComplaintIntel(dizz);

/** Weakness — ME.2W-R gold standard. */
export const WEAKNESS_COMPLAINT_INTEL = buildWeaknessComplaintIntel(weak);

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

const extremityMsk = (key: string) => `providerDocumentationComplaintIntel.extremityMskComplaint.${key}`;
/** Extremity / MSK — ME.2O-R gold-standard builder (`trauma_musculoskeletal` only). */
export const EXTREMITY_MSK_COMPLAINT_INTEL = buildExtremityMskComplaintIntel(extremityMsk);

/** Pediatric fever — ME.2V-R gold standard (AAP pediatric fever / toxic appearance). */
export const PEDIATRIC_FEVER_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPediatricFeverComplaintIntel(pedFeb);

/** Pediatric seizure — ME.2V-R gold standard. */
export const PEDIATRIC_SEIZURE_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPediatricSeizureComplaintIntel(pedSeizure);

/** Pediatric rash — ME.2V-R gold standard. */
export const PEDIATRIC_RASH_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPediatricRashComplaintIntel(pedRash);

/** Pediatric dehydration — ME.2V-R gold standard. */
export const PEDIATRIC_DEHYDRATION_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPediatricDehydrationComplaintIntel(pedDehydration);

/** Pediatric croup — ME.2V-R gold standard. */
export const PEDIATRIC_CROUP_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPediatricCroupComplaintIntel(pedCroup);

/** Pediatric RSV-like illness — ME.2V-R gold standard. */
export const PEDIATRIC_RSV_LIKE_ILLNESS_COMPLAINT_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPediatricRsvLikeIllnessComplaintIntel(pedRsv);

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
  seizure: PEDIATRIC_SEIZURE_COMPLAINT_INTEL,
  pediatric_rash: PEDIATRIC_RASH_COMPLAINT_INTEL,
  dehydration: PEDIATRIC_DEHYDRATION_COMPLAINT_INTEL,
  croup: PEDIATRIC_CROUP_COMPLAINT_INTEL,
  rsv_like_illness: PEDIATRIC_RSV_LIKE_ILLNESS_COMPLAINT_INTEL,
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
  trauma_musculoskeletal: EXTREMITY_MSK_COMPLAINT_INTEL,
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
  ...ENT_EMERGENCY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...DERMATOLOGY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...ENVIRONMENTAL_EXPOSURE_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ...OBGYN_UROLOGY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
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
export const BATCH19_PEDIATRIC_LEGACY_COMPLAINT_TEMPLATE_IDS = [
  "seizure",
  "pediatric_rash",
  "dehydration",
  "croup",
  "rsv_like_illness",
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
export const BATCH20_NEURO_STROKE_WEAKNESS_COMPLAINT_TEMPLATE_IDS = NEURO_STROKE_WEAKNESS_TEMPLATE_IDS;
export const BATCH21_EXTREMITY_MSK_COMPLAINT_TEMPLATE_IDS = ["trauma_musculoskeletal"] as const;
export const BATCH22_ENT_EMERGENCY_COMPLAINT_TEMPLATE_IDS = ENT_EMERGENCY_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH23_SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_TEMPLATE_IDS =
  SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH24_DERMATOLOGY_COMPLAINT_TEMPLATE_IDS = DERMATOLOGY_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH25_ENVIRONMENTAL_EXPOSURE_COMPLAINT_TEMPLATE_IDS = ENVIRONMENTAL_EXPOSURE_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH26_TOXICOLOGY_ENVENOMATION_COMPLAINT_TEMPLATE_IDS =
  TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS;
export const BATCH27_OBGYN_UROLOGY_COMPLAINT_TEMPLATE_IDS = OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS;

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
  ...BATCH19_PEDIATRIC_LEGACY_COMPLAINT_TEMPLATE_IDS,
  ...BATCH20_NEURO_STROKE_WEAKNESS_COMPLAINT_TEMPLATE_IDS,
  ...BATCH21_EXTREMITY_MSK_COMPLAINT_TEMPLATE_IDS,
  ...BATCH22_ENT_EMERGENCY_COMPLAINT_TEMPLATE_IDS,
  ...BATCH23_SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_TEMPLATE_IDS,
  ...BATCH24_DERMATOLOGY_COMPLAINT_TEMPLATE_IDS,
  ...BATCH25_ENVIRONMENTAL_EXPOSURE_COMPLAINT_TEMPLATE_IDS,
  ...BATCH26_TOXICOLOGY_ENVENOMATION_COMPLAINT_TEMPLATE_IDS,
  ...BATCH27_OBGYN_UROLOGY_COMPLAINT_TEMPLATE_IDS,
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
  ANIMAL_BITE_ADULT_COMPLAINT_V1_INTEL,
  HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL,
  FRACTURE_ADULT_COMPLAINT_V1_INTEL,
  DISLOCATION_ADULT_COMPLAINT_V1_INTEL,
  SPRAIN_STRAIN_ADULT_COMPLAINT_V1_INTEL,
  TENDON_INJURY_ADULT_COMPLAINT_V1_INTEL,
  LIGAMENT_INJURY_ADULT_COMPLAINT_V1_INTEL,
  CRUSH_INJURY_ADULT_COMPLAINT_V1_INTEL,
  TRAUMATIC_AMPUTATION_ADULT_COMPLAINT_V1_INTEL,
  FOREIGN_BODY_ADULT_COMPLAINT_V1_INTEL,
  BURN_INJURY_ADULT_COMPLAINT_V1_INTEL,
  PENETRATING_TRAUMA_ADULT_COMPLAINT_V1_INTEL,
  BLAST_POLYTRAUMA_ADULT_COMPLAINT_V1_INTEL,
  SPINE_BACK_PAIN_ADULT_COMPLAINT_V1_INTEL,
  SPINAL_TRAUMA_ADULT_COMPLAINT_V1_INTEL,
  HEAD_INJURY_ADULT_COMPLAINT_V1_INTEL,
  FACIAL_TRAUMA_ADULT_COMPLAINT_V1_INTEL,
  EYE_COMPLAINT_ADULT_V1_INTEL,
  EYE_TRAUMA_ADULT_V1_INTEL,
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
export {
  ENT_EAR_HEARING_VERTIGO_ADULT_V1_INTEL,
  ENT_NOSE_EPISTAXIS_ADULT_V1_INTEL,
  ENT_THROAT_NECK_AIRWAY_ADULT_V1_INTEL,
  ENT_EMERGENCY_COMPLAINT_V1_TEMPLATE_IDS,
  ENT_EMERGENCY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationEntEmergencyComplaintIntelligence";
export {
  SOFT_TISSUE_INFECTION_ADULT_V1_INTEL,
  ABSCESS_PURULENT_INFECTION_ADULT_V1_INTEL,
  HIGH_RISK_WOUND_INFECTION_ADULT_V1_INTEL,
  SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_V1_TEMPLATE_IDS,
  SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationSoftTissueWoundInfectionIntelligence";
export {
  DERMATOLOGIC_RASH_ADULT_V1_INTEL,
  ALLERGIC_INFLAMMATORY_DERMATOLOGY_ADULT_V1_INTEL,
  VESICULAR_BULLOUS_SKIN_DISORDER_ADULT_V1_INTEL,
  DERMATOLOGIC_EMERGENCY_ADULT_V1_INTEL,
  DERMATOLOGY_COMPLAINT_V1_TEMPLATE_IDS,
  DERMATOLOGY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationDermatologyIntelligence";
export {
  HEAT_ENVIRONMENTAL_ILLNESS_ADULT_V1_INTEL,
  COLD_ENVIRONMENTAL_INJURY_ADULT_V1_INTEL,
  SUBMERSION_ELECTRICAL_LIGHTNING_ADULT_V1_INTEL,
  ALTITUDE_DIVING_RADIATION_EXPOSURE_ADULT_V1_INTEL,
  ENVIRONMENTAL_EXPOSURE_COMPLAINT_V1_TEMPLATE_IDS,
  ENVIRONMENTAL_EXPOSURE_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationEnvironmentalExposureIntelligence";
export {
  TOXIC_INGESTION_OVERDOSE_ADULT_V1_INTEL,
  SUBSTANCE_INTOXICATION_WITHDRAWAL_ADULT_V1_INTEL,
  INHALED_INDUSTRIAL_TOXIC_EXPOSURE_ADULT_V1_INTEL,
  ENVENOMATION_POISONOUS_EXPOSURE_ADULT_V1_INTEL,
  TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS,
  TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationToxicologyIntelligence";
export {
  EARLY_PREGNANCY_BLEEDING_PAIN_V1_INTEL,
  LATE_PREGNANCY_LABOR_EMERGENCY_V1_INTEL,
  HYPERTENSIVE_POSTPARTUM_OBSTETRIC_EMERGENCY_V1_INTEL,
  ACUTE_GYNECOLOGIC_PELVIC_COMPLAINT_V1_INTEL,
  RENAL_URINARY_EMERGENCY_V1_INTEL,
  ACUTE_SCROTAL_PENILE_EMERGENCY_V1_INTEL,
  OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS,
  OBGYN_UROLOGY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationObGynUrologyIntelligence";

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

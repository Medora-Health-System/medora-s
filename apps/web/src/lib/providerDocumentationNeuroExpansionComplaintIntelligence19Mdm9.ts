/** Phase 19MDM.9 — Neurology expansion complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { buildMigraineHeadacheComplaintV1Intel } from "./providerDocumentationHeadacheComplaintIntelGoldStandard";
import { buildVertigoComplaintV1Intel } from "./providerDocumentationDizzinessVertigoComplaintIntelGoldStandard";
import { buildConcussionFollowupComplaintV1Intel } from "./providerDocumentationTraumaInjuryComplaintIntelGoldStandard";
import {
  buildAlteredMentalStatusComplaintV1Intel,
  buildBackPainNeuroRedFlagsComplaintV1Intel,
  buildFocalWeaknessComplaintV1Intel,
  buildGaitInstabilityFallsNeuroComplaintV1Intel,
  buildNumbnessTinglingComplaintV1Intel,
} from "./providerDocumentationNeuroStrokeWeaknessComplaintIntelGoldStandard";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const seizure = (key: string) => `providerDocumentationComplaintIntel.seizureComplaintV1.${key}`;
const alteredMentalStatus = (key: string) => `providerDocumentationComplaintIntel.alteredMentalStatusComplaintV1.${key}`;
const focalWeakness = (key: string) => `providerDocumentationComplaintIntel.focalWeaknessComplaintV1.${key}`;
const numbnessTingling = (key: string) => `providerDocumentationComplaintIntel.numbnessTinglingComplaintV1.${key}`;
const tremorMovement = (key: string) => `providerDocumentationComplaintIntel.tremorMovementComplaintV1.${key}`;
const vertigo = (key: string) => `providerDocumentationComplaintIntel.vertigoComplaintV1.${key}`;
const migraineHeadache = (key: string) => `providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.${key}`;
const concussionFollowup = (key: string) => `providerDocumentationComplaintIntel.concussionFollowupComplaintV1.${key}`;
const gaitInstabilityFallsNeuro = (key: string) => `providerDocumentationComplaintIntel.gaitInstabilityFallsNeuroComplaintV1.${key}`;
const backPainNeuroRedFlags = (key: string) => `providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.${key}`;

export const SEIZURE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [seizure("hpiWitnessedEventDurationPostictal"), seizure("hpiPriorSeizureHistoryMeds"), seizure("hpiTraumaFeverSubstanceUse"), seizure("hpiPregnancyRiskIfApplicable")],
  rosImportantPositives: [seizure("rosSeizureEvent"), seizure("rosPostictalConfusion"), seizure("rosHeadache")],
  rosImportantNegatives: [seizure("rosDeniesFever")],
  rosRedFlags: [seizure("rfRecurrentSeizures"), seizure("rfProlongedPostictalState")],
  physicalExam: { neuroPsych: [seizure("examMentalStatusIfDocumented"), seizure("examFocalDeficitsIfDocumented"), seizure("examInjuryAssessmentIfDocumented")], general: [seizure("examGeneralAppearance")] },
  mdmWorkingAssessment: [seizure("mdmSeizurePresentation")],
  mdmDifferentialSynthesis: [seizure("diffSeizure"), seizure("diffSyncope"), seizure("diffMetabolicToxic"), seizure("diffInfection"), seizure("diffIntracranialProcess")],
  mdmDataReviewed: [seizure("mdmCtEegLabsReviewedIfObtained")],
  mdmClinicalRationale: [seizure("mdmAntiepilepticPlanIfGiven"), seizure("mdmNeurologyFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [seizure("mdmObservationIfHighRisk")],
  reassessment: [seizure("reassessMentalStatusRecurrence")],
  followUpDisposition: [seizure("dispReturnRecurrenceDrivingRestrictionsAsDirected")],
});

export const ALTERED_MENTAL_STATUS_COMPLAINT_V1_INTEL = buildAlteredMentalStatusComplaintV1Intel(alteredMentalStatus);
export const FOCAL_WEAKNESS_COMPLAINT_V1_INTEL = buildFocalWeaknessComplaintV1Intel(focalWeakness);
export const NUMBNESS_TINGLING_COMPLAINT_V1_INTEL = buildNumbnessTinglingComplaintV1Intel(numbnessTingling);
export const GAIT_INSTABILITY_FALLS_NEURO_COMPLAINT_V1_INTEL = buildGaitInstabilityFallsNeuroComplaintV1Intel(gaitInstabilityFallsNeuro);
export const BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL = buildBackPainNeuroRedFlagsComplaintV1Intel(backPainNeuroRedFlags);

export const TREMOR_MOVEMENT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [tremorMovement("hpiOnsetRestVsActionTremor"), tremorMovement("hpiMedicationSubstanceTriggers"), tremorMovement("hpiWeaknessGaitChangeFever"), tremorMovement("hpiThyroidSymptomsIfPresent")],
  rosImportantPositives: [tremorMovement("rosTremor"), tremorMovement("rosWeakness"), tremorMovement("rosGaitChange")],
  rosImportantNegatives: [tremorMovement("rosDeniesFever")],
  rosRedFlags: [tremorMovement("rfFunctionalImpairment"), tremorMovement("rfRapidProgression")],
  physicalExam: { neuroPsych: [tremorMovement("examTremorCharacterizationIfDocumented"), tremorMovement("examNeuroScreenIfDocumented"), tremorMovement("examGaitIfDocumented")], general: [tremorMovement("examGeneralAppearance")] },
  mdmWorkingAssessment: [tremorMovement("mdmTremorMovementPresentation")],
  mdmDifferentialSynthesis: [tremorMovement("diffMedicationEffect"), tremorMovement("diffMetabolicThyroid"), tremorMovement("diffWithdrawal"), tremorMovement("diffEssentialTremor"), tremorMovement("diffNeurologicDisorder")],
  mdmDataReviewed: [tremorMovement("mdmLabsReviewedIfObtained")],
  mdmClinicalRationale: [tremorMovement("mdmMedicationReviewIfApplicable"), tremorMovement("mdmNeurologyFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [tremorMovement("mdmObservationIfHighRisk")],
  reassessment: [tremorMovement("reassessFunctionalImpairment")],
  followUpDisposition: [tremorMovement("dispReturnWorseningTremorWeakness")],
});

export const VERTIGO_COMPLAINT_V1_INTEL = buildVertigoComplaintV1Intel(vertigo);

export const MIGRAINE_HEADACHE_COMPLAINT_V1_INTEL = buildMigraineHeadacheComplaintV1Intel(migraineHeadache);

export const CONCUSSION_FOLLOWUP_COMPLAINT_V1_INTEL = buildConcussionFollowupComplaintV1Intel(concussionFollowup);

export const NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS = [
  "seizure_complaint_v1",
  "altered_mental_status_complaint_v1",
  "focal_weakness_complaint_v1",
  "numbness_tingling_complaint_v1",
  "tremor_movement_complaint_v1",
  "vertigo_complaint_v1",
  "migraine_headache_complaint_v1",
  "concussion_followup_complaint_v1",
  "gait_instability_falls_neuro_complaint_v1",
  "back_pain_neuro_red_flags_complaint_v1"
] as const;

export const NEURO_EXPANSION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  seizure_complaint_v1: SEIZURE_COMPLAINT_V1_INTEL,
  altered_mental_status_complaint_v1: ALTERED_MENTAL_STATUS_COMPLAINT_V1_INTEL,
  focal_weakness_complaint_v1: FOCAL_WEAKNESS_COMPLAINT_V1_INTEL,
  numbness_tingling_complaint_v1: NUMBNESS_TINGLING_COMPLAINT_V1_INTEL,
  tremor_movement_complaint_v1: TREMOR_MOVEMENT_COMPLAINT_V1_INTEL,
  vertigo_complaint_v1: VERTIGO_COMPLAINT_V1_INTEL,
  migraine_headache_complaint_v1: MIGRAINE_HEADACHE_COMPLAINT_V1_INTEL,
  concussion_followup_complaint_v1: CONCUSSION_FOLLOWUP_COMPLAINT_V1_INTEL,
  gait_instability_falls_neuro_complaint_v1: GAIT_INSTABILITY_FALLS_NEURO_COMPLAINT_V1_INTEL,
  back_pain_neuro_red_flags_complaint_v1: BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL,
} as const;

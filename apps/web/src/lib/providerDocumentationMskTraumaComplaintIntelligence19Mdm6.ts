/** Phase 19MDM.6 — MSK / trauma complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const backPain = (key: string) => `providerDocumentationComplaintIntel.backPainComplaintV1.${key}`;
const neckPain = (key: string) => `providerDocumentationComplaintIntel.neckPainComplaintV1.${key}`;
const shoulderInjury = (key: string) => `providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.${key}`;
const kneeInjury = (key: string) => `providerDocumentationComplaintIntel.kneeInjuryComplaintV1.${key}`;
const ankleFootInjury = (key: string) => `providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.${key}`;
const hipPainInjury = (key: string) => `providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.${key}`;
const handWristInjury = (key: string) => `providerDocumentationComplaintIntel.handWristInjuryComplaintV1.${key}`;
const fallTrauma = (key: string) => `providerDocumentationComplaintIntel.fallTraumaComplaintV1.${key}`;
const minorHeadInjury = (key: string) => `providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.${key}`;
const lacerationSoftTissue = (key: string) => `providerDocumentationComplaintIntel.lacerationSoftTissueComplaintV1.${key}`;

export const BACK_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [backPain("hpiOnsetMechanism"), backPain("hpiLiftingTwistingTrauma"), backPain("hpiRadiationWeaknessNumbness"), backPain("hpiBowelBladderSymptoms"), backPain("hpiFeverIvduCancerAnticoagulants")],
  rosImportantPositives: [backPain("rosBackPain"), backPain("rosWeakness"), backPain("rosNumbness")],
  rosImportantNegatives: [backPain("rosDeniesFever")],
  rosRedFlags: [backPain("rfBowelBladderConcern"), backPain("rfProgressiveWeakness")],
  physicalExam: { musculoskeletal: [backPain("examMidlineTenderness"), backPain("examRomIfDocumented"), backPain("examNeuroGaitIfDocumented")], general: [backPain("examGeneralAppearance")] },
  mdmWorkingAssessment: [backPain("mdmBackPainPresentation")],
  mdmDifferentialSynthesis: [backPain("diffStrainSpasm"), backPain("diffRadiculopathy"), backPain("diffFracture"), backPain("diffInfection"), backPain("diffCaudaEquina"), backPain("diffRenalVascularCause")],
  mdmDataReviewed: [backPain("mdmImagingLabsReviewedIfObtained")],
  mdmClinicalRationale: [backPain("mdmAnalgesiaPlanIfGiven"), backPain("mdmSpineConsultIfIndicated")],
  mdmAdmitObserveDischarge: [backPain("mdmObservationIfHighRisk")],
  reassessment: [backPain("reassessWeaknessMobility")],
  followUpDisposition: [backPain("dispReturnWeaknessRetentionFever")],
});

export const NECK_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [neckPain("hpiTraumaVsAtraumatic"), neckPain("hpiRadiationStiffness"), neckPain("hpiNumbnessWeaknessHeadache"), neckPain("hpiFeverIfPresent")],
  rosImportantPositives: [neckPain("rosNeckPain"), neckPain("rosStiffness"), neckPain("rosHeadache")],
  rosImportantNegatives: [neckPain("rosDeniesWeakness")],
  rosRedFlags: [neckPain("rfNeuroDeficitConcern"), neckPain("rfFeverConcern")],
  physicalExam: { musculoskeletal: [neckPain("examRomIfDocumented"), neckPain("examMidlineTenderness"), neckPain("examNeuroFindingsIfDocumented")], general: [neckPain("examGeneralAppearance")] },
  mdmWorkingAssessment: [neckPain("mdmNeckPainPresentation")],
  mdmDifferentialSynthesis: [neckPain("diffStrain"), neckPain("diffCervicalRadiculopathy"), neckPain("diffFracture"), neckPain("diffMeningitis"), neckPain("diffVascularCause")],
  mdmDataReviewed: [neckPain("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [neckPain("mdmCspinePrecautionsIfApplicable"), neckPain("mdmSpineConsultIfIndicated")],
  mdmAdmitObserveDischarge: [neckPain("mdmObservationIfHighRisk")],
  reassessment: [neckPain("reassessNeuroSymptoms")],
  followUpDisposition: [neckPain("dispReturnWeaknessFeverWorseningPain")],
});

export const SHOULDER_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [shoulderInjury("hpiFallLiftingDislocationMechanism"), shoulderInjury("hpiWeaknessNumbnessReducedRom"), shoulderInjury("hpiPriorShoulderInjury")],
  rosImportantPositives: [shoulderInjury("rosShoulderPain"), shoulderInjury("rosWeakness"), shoulderInjury("rosReducedRom")],
  rosImportantNegatives: [shoulderInjury("rosDeniesNumbness")],
  rosRedFlags: [shoulderInjury("rfDistalNeurovascularConcern"), shoulderInjury("rfSeverePainConcern")],
  physicalExam: { musculoskeletal: [shoulderInjury("examDeformityIfDocumented"), shoulderInjury("examRomIfDocumented"), shoulderInjury("examDistalPerfusionSensationIfDocumented")], general: [shoulderInjury("examGeneralAppearance")] },
  mdmWorkingAssessment: [shoulderInjury("mdmShoulderInjuryPresentation")],
  mdmDifferentialSynthesis: [shoulderInjury("diffStrain"), shoulderInjury("diffRotatorCuffInjury"), shoulderInjury("diffFracture"), shoulderInjury("diffDislocation"), shoulderInjury("diffAcInjury")],
  mdmDataReviewed: [shoulderInjury("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [shoulderInjury("mdmSlingPrecautionsIfApplicable"), shoulderInjury("mdmOrthoFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [shoulderInjury("mdmObservationIfHighRisk")],
  reassessment: [shoulderInjury("reassessPainNumbnessRom")],
  followUpDisposition: [shoulderInjury("dispReturnWorseningPainNumbness")],
});

export const KNEE_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [kneeInjury("hpiTwistingFallDirectImpact"), kneeInjury("hpiInstabilityLockingSwelling"), kneeInjury("hpiInabilityToBearWeight")],
  rosImportantPositives: [kneeInjury("rosKneePain"), kneeInjury("rosSwelling"), kneeInjury("rosInstability")],
  rosImportantNegatives: [kneeInjury("rosDeniesFever")],
  rosRedFlags: [kneeInjury("rfInabilityToAmbulate"), kneeInjury("rfSevereSwellingConcern")],
  physicalExam: { musculoskeletal: [kneeInjury("examSwellingIfDocumented"), kneeInjury("examRomIfDocumented"), kneeInjury("examLigamentFindingsIfDocumented"), kneeInjury("examDistalPerfusionIfDocumented")], general: [kneeInjury("examGeneralAppearance")] },
  mdmWorkingAssessment: [kneeInjury("mdmKneeInjuryPresentation")],
  mdmDifferentialSynthesis: [kneeInjury("diffSprain"), kneeInjury("diffMeniscalInjury"), kneeInjury("diffFracture"), kneeInjury("diffTendonInjury"), kneeInjury("diffSepticJointWhenRelevant")],
  mdmDataReviewed: [kneeInjury("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [kneeInjury("mdmWeightBearingPlanIfDiscussed"), kneeInjury("mdmOrthoFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [kneeInjury("mdmObservationIfHighRisk")],
  reassessment: [kneeInjury("reassessAmbulationSwelling")],
  followUpDisposition: [kneeInjury("dispReturnInabilityToAmbulateWorseningPain")],
});

export const ANKLE_FOOT_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [ankleFootInjury("hpiInversionTwistingFallMechanism"), ankleFootInjury("hpiSwellingNumbness"), ankleFootInjury("hpiInabilityToBearWeight")],
  rosImportantPositives: [ankleFootInjury("rosAnkleFootPain"), ankleFootInjury("rosSwelling"), ankleFootInjury("rosNumbness")],
  rosImportantNegatives: [ankleFootInjury("rosDeniesOpenWound")],
  rosRedFlags: [ankleFootInjury("rfInabilityToBearWeight"), ankleFootInjury("rfNeurovascularConcern")],
  physicalExam: { musculoskeletal: [ankleFootInjury("examSwellingEcchymosisIfDocumented"), ankleFootInjury("examTendernessDistribution"), ankleFootInjury("examNeurovascularStatusIfDocumented")], general: [ankleFootInjury("examGeneralAppearance")] },
  mdmWorkingAssessment: [ankleFootInjury("mdmAnkleFootInjuryPresentation")],
  mdmDifferentialSynthesis: [ankleFootInjury("diffSprain"), ankleFootInjury("diffFracture"), ankleFootInjury("diffTendonInjury"), ankleFootInjury("diffLisfrancConcernWhenAppropriate")],
  mdmDataReviewed: [ankleFootInjury("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [ankleFootInjury("mdmSplintPrecautionsIfApplicable"), ankleFootInjury("mdmOrthoPodiatryFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [ankleFootInjury("mdmObservationIfHighRisk")],
  reassessment: [ankleFootInjury("reassessWeightBearingPain")],
  followUpDisposition: [ankleFootInjury("dispReturnInabilityToBearWeightWorseningSwelling")],
});

export const HIP_PAIN_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [hipPainInjury("hpiFallTraumaMechanism"), hipPainInjury("hpiInabilityToAmbulate"), hipPainInjury("hpiAnticoagulantUse"), hipPainInjury("hpiBackPainNeuroSymptoms")],
  rosImportantPositives: [hipPainInjury("rosHipPain"), hipPainInjury("rosInabilityToAmbulate"), hipPainInjury("rosBackPain")],
  rosImportantNegatives: [hipPainInjury("rosDeniesSyncope")],
  rosRedFlags: [hipPainInjury("rfInabilityToAmbulate"), hipPainInjury("rfNeuroDeficitConcern")],
  physicalExam: { musculoskeletal: [hipPainInjury("examRomIfDocumented"), hipPainInjury("examShorteningRotationIfDocumented"), hipPainInjury("examNeurovascularFindingsIfDocumented")], general: [hipPainInjury("examGeneralAppearance")] },
  mdmWorkingAssessment: [hipPainInjury("mdmHipInjuryPresentation")],
  mdmDifferentialSynthesis: [hipPainInjury("diffFracture"), hipPainInjury("diffDislocation"), hipPainInjury("diffStrain"), hipPainInjury("diffOccultInjury"), hipPainInjury("diffSpinalReferredPain")],
  mdmDataReviewed: [hipPainInjury("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [hipPainInjury("mdmMobilityPlanIfDiscussed"), hipPainInjury("mdmOrthoFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [hipPainInjury("mdmAdmissionIfIndicated")],
  reassessment: [hipPainInjury("reassessMobilityPain")],
  followUpDisposition: [hipPainInjury("dispReturnInabilityToAmbulateWorseningPain")],
});

export const HAND_WRIST_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [handWristInjury("hpiCrushFallPunchLacerationMechanism"), handWristInjury("hpiNumbnessWeaknessReducedGrip"), handWristInjury("hpiSwellingOpenWound")],
  rosImportantPositives: [handWristInjury("rosHandWristPain"), handWristInjury("rosNumbness"), handWristInjury("rosSwelling")],
  rosImportantNegatives: [handWristInjury("rosDeniesWeakness")],
  rosRedFlags: [handWristInjury("rfTendonInjuryConcern"), handWristInjury("rfNeurovascularConcern")],
  physicalExam: { musculoskeletal: [handWristInjury("examRomIfDocumented"), handWristInjury("examTendonFunctionIfDocumented"), handWristInjury("examSensationPerfusionIfDocumented")], general: [handWristInjury("examGeneralAppearance")] },
  mdmWorkingAssessment: [handWristInjury("mdmHandWristInjuryPresentation")],
  mdmDifferentialSynthesis: [handWristInjury("diffFracture"), handWristInjury("diffSprain"), handWristInjury("diffTendonInjury"), handWristInjury("diffDislocation"), handWristInjury("diffInfectionIfWoundPresent")],
  mdmDataReviewed: [handWristInjury("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [handWristInjury("mdmSplintPrecautionsIfApplicable"), handWristInjury("mdmHandOrthoFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [handWristInjury("mdmObservationIfHighRisk")],
  reassessment: [handWristInjury("reassessPainNumbnessFunction")],
  followUpDisposition: [handWristInjury("dispReturnWorseningPainNumbness")],
});

export const FALL_TRAUMA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [fallTrauma("hpiFallMechanismHeight"), fallTrauma("hpiLocAnticoagulantsHeadStrike"), fallTrauma("hpiNeckBackChestAbdominalExtremityPain")],
  rosImportantPositives: [fallTrauma("rosPainAfterFall"), fallTrauma("rosWeakness"), fallTrauma("rosHeadache")],
  rosImportantNegatives: [fallTrauma("rosDeniesSyncope")],
  rosRedFlags: [fallTrauma("rfHeadStrikeConcern"), fallTrauma("rfNeuroDeficitConcern")],
  physicalExam: { musculoskeletal: [fallTrauma("examTraumaSurveyFindingsIfDocumented"), fallTrauma("examNeuroFindingsIfDocumented"), fallTrauma("examMobilityIfDocumented")], general: [fallTrauma("examGeneralAppearance")] },
  mdmWorkingAssessment: [fallTrauma("mdmFallTraumaPresentation")],
  mdmDifferentialSynthesis: [fallTrauma("diffFracture"), fallTrauma("diffIntracranialInjury"), fallTrauma("diffSpinalInjury"), fallTrauma("diffSoftTissueInjury"), fallTrauma("diffOccultTrauma")],
  mdmDataReviewed: [fallTrauma("mdmImagingLabsReviewedIfObtained")],
  mdmClinicalRationale: [fallTrauma("mdmFallRiskDiscussed"), fallTrauma("mdmSpecialistConsultIfIndicated")],
  mdmAdmitObserveDischarge: [fallTrauma("mdmObservationIfHighRisk")],
  reassessment: [fallTrauma("reassessPainNeuroMobility")],
  followUpDisposition: [fallTrauma("dispReturnNeuroSymptomsWorseningPain")],
});

export const MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [minorHeadInjury("hpiMechanismLocAmnesia"), minorHeadInjury("hpiAnticoagulantUse"), minorHeadInjury("hpiHeadacheVomitingDizziness"), minorHeadInjury("hpiVisionNeuroSymptoms")],
  rosImportantPositives: [minorHeadInjury("rosHeadache"), minorHeadInjury("rosDizziness"), minorHeadInjury("rosVomiting")],
  rosImportantNegatives: [minorHeadInjury("rosDeniesWeakness")],
  rosRedFlags: [minorHeadInjury("rfAlteredMentalStatusConcern"), minorHeadInjury("rfRepeatedVomiting")],
  physicalExam: { musculoskeletal: [minorHeadInjury("examNeuroFindingsIfDocumented"), minorHeadInjury("examScalpFacialTraumaIfDocumented")], general: [minorHeadInjury("examGeneralAppearance")] },
  mdmWorkingAssessment: [minorHeadInjury("mdmHeadInjuryPresentation")],
  mdmDifferentialSynthesis: [minorHeadInjury("diffConcussion"), minorHeadInjury("diffIntracranialInjury"), minorHeadInjury("diffCervicalInjury"), minorHeadInjury("diffFacialTrauma")],
  mdmDataReviewed: [minorHeadInjury("mdmCtImagingReviewedIfObtained")],
  mdmClinicalRationale: [minorHeadInjury("mdmConcussionPrecautionsIfApplicable"), minorHeadInjury("mdmNeuroFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [minorHeadInjury("mdmObservationIfHighRisk")],
  reassessment: [minorHeadInjury("reassessHeadacheVomitingNeuro")],
  followUpDisposition: [minorHeadInjury("dispReturnWorseningHeadacheConfusion")],
});

export const LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [lacerationSoftTissue("hpiMechanismContamination"), lacerationSoftTissue("hpiBiteCrushGlassExposure"), lacerationSoftTissue("hpiNumbnessWeaknessTendonBleeding")],
  rosImportantPositives: [lacerationSoftTissue("rosLacerationPain"), lacerationSoftTissue("rosBleeding"), lacerationSoftTissue("rosNumbness")],
  rosImportantNegatives: [lacerationSoftTissue("rosDeniesWeakness")],
  rosRedFlags: [lacerationSoftTissue("rfUncontrolledBleeding"), lacerationSoftTissue("rfTendonNerveConcern")],
  physicalExam: { musculoskeletal: [lacerationSoftTissue("examWoundDepthIfDocumented"), lacerationSoftTissue("examRomIfDocumented"), lacerationSoftTissue("examNeurovascularTendonIfDocumented")], general: [lacerationSoftTissue("examGeneralAppearance")] },
  mdmWorkingAssessment: [lacerationSoftTissue("mdmLacerationPresentation")],
  mdmDifferentialSynthesis: [lacerationSoftTissue("diffTendonInjury"), lacerationSoftTissue("diffNerveInjury"), lacerationSoftTissue("diffRetainedForeignBody"), lacerationSoftTissue("diffInfectionRisk")],
  mdmDataReviewed: [lacerationSoftTissue("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [lacerationSoftTissue("mdmWoundCarePlanIfGiven"), lacerationSoftTissue("mdmHandPlasticsFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [lacerationSoftTissue("mdmObservationIfHighRisk")],
  reassessment: [lacerationSoftTissue("reassessBleedingInfectionSigns")],
  followUpDisposition: [lacerationSoftTissue("dispReturnInfectionSignsWorseningPain")],
});

export const MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS = [
  "back_pain_complaint_v1",
  "neck_pain_complaint_v1",
  "shoulder_injury_complaint_v1",
  "knee_injury_complaint_v1",
  "ankle_foot_injury_complaint_v1",
  "hip_pain_injury_complaint_v1",
  "hand_wrist_injury_complaint_v1",
  "fall_trauma_complaint_v1",
  "minor_head_injury_complaint_v1",
  "laceration_soft_tissue_complaint_v1"
] as const;

export const MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  back_pain_complaint_v1: BACK_PAIN_COMPLAINT_V1_INTEL,
  neck_pain_complaint_v1: NECK_PAIN_COMPLAINT_V1_INTEL,
  shoulder_injury_complaint_v1: SHOULDER_INJURY_COMPLAINT_V1_INTEL,
  knee_injury_complaint_v1: KNEE_INJURY_COMPLAINT_V1_INTEL,
  ankle_foot_injury_complaint_v1: ANKLE_FOOT_INJURY_COMPLAINT_V1_INTEL,
  hip_pain_injury_complaint_v1: HIP_PAIN_INJURY_COMPLAINT_V1_INTEL,
  hand_wrist_injury_complaint_v1: HAND_WRIST_INJURY_COMPLAINT_V1_INTEL,
  fall_trauma_complaint_v1: FALL_TRAUMA_COMPLAINT_V1_INTEL,
  minor_head_injury_complaint_v1: MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL,
  laceration_soft_tissue_complaint_v1: LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL,
} as const;
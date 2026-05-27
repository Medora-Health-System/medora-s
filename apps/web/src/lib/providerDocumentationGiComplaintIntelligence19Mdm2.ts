/** Phase 19MDM.2 — GI / abdominal complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const abdominalPain = (key: string) => `providerDocumentationComplaintIntel.abdominalPainComplaintV1.${key}`;
const nauseaVomiting = (key: string) => `providerDocumentationComplaintIntel.nauseaVomitingComplaintV1.${key}`;
const diarrhea = (key: string) => `providerDocumentationComplaintIntel.diarrheaComplaintV1.${key}`;
const constipation = (key: string) => `providerDocumentationComplaintIntel.constipationComplaintV1.${key}`;
const giBleed = (key: string) => `providerDocumentationComplaintIntel.giBleedComplaintV1.${key}`;
const flankPain = (key: string) => `providerDocumentationComplaintIntel.flankPainComplaintV1.${key}`;
const hernia = (key: string) => `providerDocumentationComplaintIntel.herniaComplaintV1.${key}`;
const rectalPain = (key: string) => `providerDocumentationComplaintIntel.rectalPainComplaintV1.${key}`;
const dysphagia = (key: string) => `providerDocumentationComplaintIntel.dysphagiaComplaintV1.${key}`;

export const ABDOMINAL_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [abdominalPain("hpiOnsetTiming"), abdominalPain("hpiLocationRadiation"), abdominalPain("hpiMigrationSeverity"), abdominalPain("hpiAssocNauseaVomiting"), abdominalPain("hpiAssocBowelUrinary"), abdominalPain("hpiFeverGiBleedSyncope"), abdominalPain("hpiPregnancyGynConsiderations")],
  rosImportantPositives: [abdominalPain("rosNauseaVomiting"), abdominalPain("rosFever"), abdominalPain("rosGiBleedingConcern"), abdominalPain("rosUrinarySymptoms")],
  rosImportantNegatives: [abdominalPain("rosDeniesChestPain"), abdominalPain("rosDeniesSyncope")],
  rosRedFlags: [abdominalPain("rfPeritonealSigns"), abdominalPain("rfGiBleedingConcern"), abdominalPain("rfPregnancyConcern")],
  physicalExam: { abdomen: [abdominalPain("examTendernessLocation"), abdominalPain("examGuardingRebound"), abdominalPain("examDistension"), abdominalPain("examCvaTenderness")], general: [abdominalPain("examGeneralAppearance")] },
  mdmWorkingAssessment: [abdominalPain("mdmUndifferentiatedAbdominalPain")],
  mdmDifferentialSynthesis: [abdominalPain("diffAppendicitis"), abdominalPain("diffBiliary"), abdominalPain("diffPancreatitis"), abdominalPain("diffObstruction"), abdominalPain("diffGastroenteritis"), abdominalPain("diffRenalColic"), abdominalPain("diffUtiPyelo"), abdominalPain("diffGynecologic"), abdominalPain("diffVascular")],
  mdmDataReviewed: [abdominalPain("mdmLabsReviewedIfObtained"), abdominalPain("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [abdominalPain("mdmSerialAbdominalExams"), abdominalPain("mdmRiskBenefitDiscussed")],
  mdmAdmitObserveDischarge: [abdominalPain("mdmAdmissionObservationIfIndicated")],
  reassessment: [abdominalPain("reassessSerialExam"), abdominalPain("reassessPoTolerance")],
  followUpDisposition: [abdominalPain("dispReturnPrecautions"), abdominalPain("dispDispositionReflectsCourse")],
});

export const NAUSEA_VOMITING_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [nauseaVomiting("hpiDurationFrequency"), nauseaVomiting("hpiEmesisCharacter"), nauseaVomiting("hpiOralIntakeDehydration"), nauseaVomiting("hpiAssocAbdominalPain"), nauseaVomiting("hpiPregnancyDiabetesRisk")],
  rosImportantPositives: [nauseaVomiting("rosVomiting"), nauseaVomiting("rosAbdominalPain"), nauseaVomiting("rosFever")],
  rosImportantNegatives: [nauseaVomiting("rosDeniesChestPain")],
  rosRedFlags: [nauseaVomiting("rfDehydration"), nauseaVomiting("rfGiBleedConcern"), nauseaVomiting("rfObstructionConcern")],
  physicalExam: { abdomen: [nauseaVomiting("examHydrationStatus"), nauseaVomiting("examAbdominalExam"), nauseaVomiting("examNeuroScreen")], general: [nauseaVomiting("examGeneralAppearance")] },
  mdmWorkingAssessment: [nauseaVomiting("mdmNauseaVomitingSyndrome")],
  mdmDifferentialSynthesis: [nauseaVomiting("diffGastroenteritis"), nauseaVomiting("diffObstruction"), nauseaVomiting("diffPregnancyRelated"), nauseaVomiting("diffMetabolic"), nauseaVomiting("diffCns"), nauseaVomiting("diffMedicationToxin")],
  mdmDataReviewed: [nauseaVomiting("mdmLabsReviewedIfObtained")],
  mdmClinicalRationale: [nauseaVomiting("mdmAntiemeticFluidsPlan")],
  mdmPlanSummary: [nauseaVomiting("mdmSymptomaticSupportPlan")],
  mdmAdmitObserveDischarge: [nauseaVomiting("mdmObservationIfPersistent")],
  reassessment: [nauseaVomiting("reassessVomitingControlled"), nauseaVomiting("reassessHydration")],
  followUpDisposition: [nauseaVomiting("dispFluidToleranceFollowUp")],
});

export const DIARRHEA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [diarrhea("hpiFrequencyDuration"), diarrhea("hpiBloodMucusTravel"), diarrhea("hpiDehydrationImmunocompromised")],
  rosImportantPositives: [diarrhea("rosDiarrhea"), diarrhea("rosFever"), diarrhea("rosAbdominalPain")],
  rosImportantNegatives: [diarrhea("rosDeniesSeverePain")],
  rosRedFlags: [diarrhea("rfBloodyStool"), diarrhea("rfDehydration")],
  physicalExam: { abdomen: [diarrhea("examHydration"), diarrhea("examAbdominalTenderness")], general: [diarrhea("examGeneralAppearance")] },
  mdmWorkingAssessment: [diarrhea("mdmAcuteDiarrhea")],
  mdmDifferentialSynthesis: [diarrhea("diffViralBacterial"), diarrhea("diffCdiff"), diarrhea("diffIbd"), diarrhea("diffFoodborne"), diarrhea("diffMedication")],
  mdmDataReviewed: [diarrhea("mdmStoolTestingIfIndicated")],
  mdmClinicalRationale: [diarrhea("mdmHydrationAssessed")],
  mdmAdmitObserveDischarge: [diarrhea("mdmAdmissionIfSevereDehydration")],
  reassessment: [diarrhea("reassessHydrationStatus")],
  followUpDisposition: [diarrhea("dispReturnWorseningBleedingFever")],
});

export const CONSTIPATION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [constipation("hpiDurationPattern"), constipation("hpiPassingGasVomiting"), constipation("hpiOpioidSurgeryHistory")],
  rosImportantPositives: [constipation("rosConstipation"), constipation("rosAbdominalDistension")],
  rosImportantNegatives: [constipation("rosDeniesFever")],
  rosRedFlags: [constipation("rfObstructionConcern"), constipation("rfRectalBleeding")],
  physicalExam: { abdomen: [constipation("examDistensionTenderness"), constipation("examRectalIfPerformed")], general: [constipation("examGeneralAppearance")] },
  mdmWorkingAssessment: [constipation("mdmConstipationPresentation")],
  mdmDifferentialSynthesis: [constipation("diffFunctional"), constipation("diffMedication"), constipation("diffObstruction"), constipation("diffImpaction")],
  mdmDataReviewed: [constipation("mdmImagingIfIndicated")],
  mdmClinicalRationale: [constipation("mdmBowelObstructionConsidered")],
  mdmAdmitObserveDischarge: [constipation("mdmAdmissionIfObstructionConcern")],
  reassessment: [constipation("reassessBowelSymptoms")],
  followUpDisposition: [constipation("dispReturnVomitingObstructionSigns")],
});

export const GI_BLEED_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [giBleed("hpiBleedTypeAmount"), giBleed("hpiAnticoagulantUse"), giBleed("hpiSyncopeDizziness")],
  rosImportantPositives: [giBleed("rosMelena"), giBleed("rosHematochezia"), giBleed("rosDizziness")],
  rosImportantNegatives: [giBleed("rosDeniesChestPain")],
  rosRedFlags: [giBleed("rfHemodynamicInstability"), giBleed("rfLargeVolumeBleed")],
  physicalExam: { abdomen: [giBleed("examVitalsTrend"), giBleed("examAbdominalExam"), giBleed("examRectalIfPerformed")], general: [giBleed("examGeneralAppearance")] },
  mdmWorkingAssessment: [giBleed("mdmGiBleedPresentation")],
  mdmDifferentialSynthesis: [giBleed("diffUpperGi"), giBleed("diffLowerGi"), giBleed("diffVarices"), giBleed("diffDiverticular"), giBleed("diffHemorrhoids")],
  mdmDataReviewed: [giBleed("mdmHemoglobinReviewedIfObtained"), giBleed("mdmImagingEndoscopyConsidered")],
  mdmClinicalRationale: [giBleed("mdmTransfusionConsultIfIndicated")],
  mdmAdmitObserveDischarge: [giBleed("mdmAdmissionObservationIfIndicated")],
  reassessment: [giBleed("reassessHemodynamicStatus"), giBleed("reassessRepeatBleeding")],
  followUpDisposition: [giBleed("dispDispositionAfterReassessment")],
});

export const FLANK_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [flankPain("hpiSideRadiation"), flankPain("hpiUrinarySymptoms"), flankPain("hpiPregnancyConsideration")],
  rosImportantPositives: [flankPain("rosFlankPain"), flankPain("rosDysuria"), flankPain("rosFever")],
  rosImportantNegatives: [flankPain("rosDeniesAbdominalDistension")],
  rosRedFlags: [flankPain("rfFeverObstruction"), flankPain("rfPregnancyConcern")],
  physicalExam: { abdomen: [flankPain("examCvaTenderness"), flankPain("examAbdominalTenderness")], general: [flankPain("examGeneralAppearance")] },
  mdmWorkingAssessment: [flankPain("mdmFlankPainPresentation")],
  mdmDifferentialSynthesis: [flankPain("diffRenalColic"), flankPain("diffPyelo"), flankPain("diffObstruction"), flankPain("diffMsk"), flankPain("diffGynecologic")],
  mdmDataReviewed: [flankPain("mdmUrinalysisImagingIfObtained")],
  mdmClinicalRationale: [flankPain("mdmPainControlReassessment")],
  mdmAdmitObserveDischarge: [flankPain("mdmUrologyFollowUpIfNeeded")],
  reassessment: [flankPain("reassessPainControl"), flankPain("reassessVomitingFever")],
  followUpDisposition: [flankPain("dispReturnObstructionFever")],
});

export const HERNIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [hernia("hpiLocationDuration"), hernia("hpiReducibilityPain"), hernia("hpiBowelSymptomsSkinChanges")],
  rosImportantPositives: [hernia("rosVomiting"), hernia("rosAbdominalPain")],
  rosImportantNegatives: [hernia("rosDeniesFever")],
  rosRedFlags: [hernia("rfIncarcerationConcern"), hernia("rfStrangulationConcern")],
  physicalExam: { abdomen: [hernia("examHerniaExam"), hernia("examAbdominalDistension")], general: [hernia("examGeneralAppearance")] },
  mdmWorkingAssessment: [hernia("mdmHerniaPresentation")],
  mdmDifferentialSynthesis: [hernia("diffReducibleHernia"), hernia("diffIncarcerated"), hernia("diffObstruction")],
  mdmDataReviewed: [hernia("mdmImagingIfIndicated")],
  mdmClinicalRationale: [hernia("mdmSurgicalConsultIfConcern")],
  mdmAdmitObserveDischarge: [hernia("mdmAdmissionIfNonreducible")],
  reassessment: [hernia("reassessHerniaExam")],
  followUpDisposition: [hernia("dispReturnWorseningPainVomiting")],
});

export const RECTAL_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [rectalPain("hpiOnsetBleeding"), rectalPain("hpiConstipationDrainage"), rectalPain("hpiImmunocompromised")],
  rosImportantPositives: [rectalPain("rosRectalPain"), rectalPain("rosBleeding"), rectalPain("rosFever")],
  rosImportantNegatives: [rectalPain("rosDeniesAbdominalDistension")],
  rosRedFlags: [rectalPain("rfAbscessConcern"), rectalPain("rfSignificantBleeding")],
  physicalExam: { abdomen: [rectalPain("examExternalRectalIfPerformed")], general: [rectalPain("examGeneralAppearance")] },
  mdmWorkingAssessment: [rectalPain("mdmRectalPainPresentation")],
  mdmDifferentialSynthesis: [rectalPain("diffHemorrhoid"), rectalPain("diffFissure"), rectalPain("diffAbscess"), rectalPain("diffProctitis")],
  mdmDataReviewed: [rectalPain("mdmLabsIfIndicated")],
  mdmClinicalRationale: [rectalPain("mdmAnalgesiaHygienePlan")],
  mdmAdmitObserveDischarge: [rectalPain("mdmSurgicalReferralIfAbscess")],
  reassessment: [rectalPain("reassessPainBleeding")],
  followUpDisposition: [rectalPain("dispReturnFeverDrainage")],
});

export const DYSPHAGIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [dysphagia("hpiSolidsVsLiquids"), dysphagia("hpiChokingDrooling"), dysphagia("hpiWeightLossNeuro")],
  rosImportantPositives: [dysphagia("rosChestPain"), dysphagia("rosRegurgitation")],
  rosImportantNegatives: [dysphagia("rosDeniesFocalWeakness")],
  rosRedFlags: [dysphagia("rfAirwayCompromise"), dysphagia("rfFoodImpaction")],
  physicalExam: { abdomen: [dysphagia("examAirwayOralPharynx"), dysphagia("examNeuroScreen")], general: [dysphagia("examGeneralAppearance")] },
  mdmWorkingAssessment: [dysphagia("mdmDysphagiaPresentation")],
  mdmDifferentialSynthesis: [dysphagia("diffImpaction"), dysphagia("diffEsophagitis"), dysphagia("diffStricture"), dysphagia("diffMotility"), dysphagia("diffNeurologic")],
  mdmDataReviewed: [dysphagia("mdmImagingConsultIfIndicated")],
  mdmClinicalRationale: [dysphagia("mdmNpoAirwayPrecautionsIfIndicated")],
  mdmAdmitObserveDischarge: [dysphagia("mdmAdmissionIfCannotTolerateSecretions")],
  reassessment: [dysphagia("reassessSwallowingTrial")],
  followUpDisposition: [dysphagia("dispEntGiFollowUp")],
});

export const GI_COMPLAINT_V1_TEMPLATE_IDS = [
  "abdominal_pain_complaint_v1",
  "nausea_vomiting_complaint_v1",
  "diarrhea_complaint_v1",
  "constipation_complaint_v1",
  "gi_bleed_complaint_v1",
  "flank_pain_complaint_v1",
  "hernia_complaint_v1",
  "rectal_pain_complaint_v1",
  "dysphagia_complaint_v1"
] as const;

export const GI_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  abdominal_pain_complaint_v1: ABDOMINAL_PAIN_COMPLAINT_V1_INTEL,
  nausea_vomiting_complaint_v1: NAUSEA_VOMITING_COMPLAINT_V1_INTEL,
  diarrhea_complaint_v1: DIARRHEA_COMPLAINT_V1_INTEL,
  constipation_complaint_v1: CONSTIPATION_COMPLAINT_V1_INTEL,
  gi_bleed_complaint_v1: GI_BLEED_COMPLAINT_V1_INTEL,
  flank_pain_complaint_v1: FLANK_PAIN_COMPLAINT_V1_INTEL,
  hernia_complaint_v1: HERNIA_COMPLAINT_V1_INTEL,
  rectal_pain_complaint_v1: RECTAL_PAIN_COMPLAINT_V1_INTEL,
  dysphagia_complaint_v1: DYSPHAGIA_COMPLAINT_V1_INTEL,
} as const;
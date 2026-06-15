/** Phase 19MDM.8 — Endocrine / metabolic complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { buildNauseaVomitingMetabolicComplaintV1Intel } from "./providerDocumentationNauseaVomitingComplaintIntelGoldStandard";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const hyperglycemia = (key: string) => `providerDocumentationComplaintIntel.hyperglycemiaComplaintV1.${key}`;
const hypoglycemia = (key: string) => `providerDocumentationComplaintIntel.hypoglycemiaComplaintV1.${key}`;
const diabetesSickDay = (key: string) => `providerDocumentationComplaintIntel.diabetesSickDayComplaintV1.${key}`;
const insulinMedicationIssue = (key: string) => `providerDocumentationComplaintIntel.insulinMedicationIssueComplaintV1.${key}`;
const polyuriaPolydipsia = (key: string) => `providerDocumentationComplaintIntel.polyuriaPolydipsiaComplaintV1.${key}`;
const dehydrationMetabolic = (key: string) => `providerDocumentationComplaintIntel.dehydrationMetabolicComplaintV1.${key}`;
const electrolyteAbnormality = (key: string) => `providerDocumentationComplaintIntel.electrolyteAbnormalityComplaintV1.${key}`;
const thyroidSymptoms = (key: string) => `providerDocumentationComplaintIntel.thyroidSymptomsComplaintV1.${key}`;
const generalizedWeaknessMetabolic = (key: string) => `providerDocumentationComplaintIntel.generalizedWeaknessMetabolicComplaintV1.${key}`;
const nauseaVomitingMetabolic = (key: string) => `providerDocumentationComplaintIntel.nauseaVomitingMetabolicComplaintV1.${key}`;

export const HYPERGLYCEMIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [hyperglycemia("hpiGlucoseConcernDuration"), hyperglycemia("hpiHomeReadingsIfReported"), hyperglycemia("hpiMedicationInsulinAdherence"), hyperglycemia("hpiPolyuriaPolydipsiaVomiting"), hyperglycemia("hpiAbdominalPainConfusion")],
  rosImportantPositives: [hyperglycemia("rosHyperglycemiaConcern"), hyperglycemia("rosPolyuria"), hyperglycemia("rosPolydipsia")],
  rosImportantNegatives: [hyperglycemia("rosDeniesConfusion")],
  rosRedFlags: [hyperglycemia("rfAlteredMentalStatus"), hyperglycemia("rfSevereVomiting")],
  physicalExam: { general: [hyperglycemia("examHydrationIfDocumented"), hyperglycemia("examMentalStatusIfDocumented"), hyperglycemia("examAbdominalExamIfDocumented"), hyperglycemia("examGeneralAppearance")] },
  mdmWorkingAssessment: [hyperglycemia("mdmHyperglycemiaPresentation")],
  mdmDifferentialSynthesis: [hyperglycemia("diffHyperglycemia"), hyperglycemia("diffDkaHhsConcern"), hyperglycemia("diffInfection"), hyperglycemia("diffMedicationNonadherenceAccess"), hyperglycemia("diffDehydration")],
  mdmDataReviewed: [hyperglycemia("mdmGlucoseKetonesLabsReviewedIfObtained")],
  mdmClinicalRationale: [hyperglycemia("mdmFluidInsulinPlanIfGiven"), hyperglycemia("mdmEndocrinologyPcpFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [hyperglycemia("mdmObservationIfHighRisk")],
  reassessment: [hyperglycemia("reassessHydrationVomitingConfusion")],
  followUpDisposition: [hyperglycemia("dispReturnVomitingConfusionDehydration")],
});

export const HYPOGLYCEMIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [hypoglycemia("hpiEpisodeTimingGlucoseConcern"), hypoglycemia("hpiFoodIntakeMedicationTiming"), hypoglycemia("hpiInsulinSulfonylureaUse"), hypoglycemia("hpiRecurrentEpisodesAlteredMsSeizure")],
  rosImportantPositives: [hypoglycemia("rosHypoglycemiaConcern"), hypoglycemia("rosDizziness"), hypoglycemia("rosWeakness")],
  rosImportantNegatives: [hypoglycemia("rosDeniesSyncope")],
  rosRedFlags: [hypoglycemia("rfRecurrentEpisodes"), hypoglycemia("rfAlteredMentalStatus")],
  physicalExam: { general: [hypoglycemia("examMentalStatusIfDocumented"), hypoglycemia("examNeuroScreenIfDocumented"), hypoglycemia("examHydrationIfDocumented"), hypoglycemia("examGeneralAppearance")] },
  mdmWorkingAssessment: [hypoglycemia("mdmHypoglycemiaPresentation")],
  mdmDifferentialSynthesis: [hypoglycemia("diffMedicationEffect"), hypoglycemia("diffDecreasedIntake"), hypoglycemia("diffInfection"), hypoglycemia("diffRenalDysfunction"), hypoglycemia("diffEndocrineMetabolicCause")],
  mdmDataReviewed: [hypoglycemia("mdmGlucoseLabsReviewedIfObtained")],
  mdmClinicalRationale: [hypoglycemia("mdmRecurrenceMonitoringDiscussed"), hypoglycemia("mdmEndocrinologyFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [hypoglycemia("mdmObservationIfHighRisk")],
  reassessment: [hypoglycemia("reassessRecurrenceMentalStatusIntake")],
  followUpDisposition: [hypoglycemia("dispReturnRecurrenceMedicationSafety")],
});

export const DIABETES_SICK_DAY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [diabetesSickDay("hpiIllnessSymptomsOralIntake"), diabetesSickDay("hpiMedicationAccessAdherence"), diabetesSickDay("hpiVomitingFeverDehydration"), diabetesSickDay("hpiGlucoseConcerns")],
  rosImportantPositives: [diabetesSickDay("rosFever"), diabetesSickDay("rosVomiting"), diabetesSickDay("rosPoorIntake")],
  rosImportantNegatives: [diabetesSickDay("rosDeniesConfusion")],
  rosRedFlags: [diabetesSickDay("rfDehydrationConcern"), diabetesSickDay("rfAlteredMentalStatus")],
  physicalExam: { general: [diabetesSickDay("examHydrationIfDocumented"), diabetesSickDay("examRespiratoryStatusIfDocumented"), diabetesSickDay("examMentalStatusIfDocumented"), diabetesSickDay("examGeneralAppearance")] },
  mdmWorkingAssessment: [diabetesSickDay("mdmDiabetesSickDayPresentation")],
  mdmDifferentialSynthesis: [diabetesSickDay("diffViralInfectiousTrigger"), diabetesSickDay("diffDehydration"), diabetesSickDay("diffDkaHhsConcern"), diabetesSickDay("diffMedicationAccessIssue")],
  mdmDataReviewed: [diabetesSickDay("mdmGlucoseKetonesLabsReviewedIfObtained")],
  mdmClinicalRationale: [diabetesSickDay("mdmSickDayPlanDiscussedIfDirected"), diabetesSickDay("mdmEndocrinologyPcpFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [diabetesSickDay("mdmObservationIfHighRisk")],
  reassessment: [diabetesSickDay("reassessHydrationGlucoseSymptoms")],
  followUpDisposition: [diabetesSickDay("dispReturnWorseningVomitingConfusion")],
});

export const INSULIN_MEDICATION_ISSUE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [insulinMedicationIssue("hpiMissedDosesDosingConfusion"), insulinMedicationIssue("hpiAccessCostStorageIssue"), insulinMedicationIssue("hpiHighLowGlucoseSymptoms"), insulinMedicationIssue("hpiEatingPatternSupportSystem")],
  rosImportantPositives: [insulinMedicationIssue("rosMedicationAccessConcern"), insulinMedicationIssue("rosGlucoseSymptoms"), insulinMedicationIssue("rosPoorIntake")],
  rosImportantNegatives: [insulinMedicationIssue("rosDeniesAlteredMentalStatus")],
  rosRedFlags: [insulinMedicationIssue("rfHypoglycemiaRiskConcern"), insulinMedicationIssue("rfHyperglycemiaRiskConcern")],
  physicalExam: { general: [insulinMedicationIssue("examMentalStatusIfDocumented"), insulinMedicationIssue("examHydrationIfDocumented"), insulinMedicationIssue("examInjectionSiteIfRelevant"), insulinMedicationIssue("examGeneralAppearance")] },
  mdmWorkingAssessment: [insulinMedicationIssue("mdmInsulinMedicationIssuePresentation")],
  mdmDifferentialSynthesis: [insulinMedicationIssue("diffMedicationAccessIssue"), insulinMedicationIssue("diffHypoglycemiaRisk"), insulinMedicationIssue("diffHyperglycemiaRisk"), insulinMedicationIssue("diffEducationGap")],
  mdmDataReviewed: [insulinMedicationIssue("mdmGlucoseLabsReviewedIfObtained")],
  mdmClinicalRationale: [insulinMedicationIssue("mdmMedicationReconciliationDiscussed"), insulinMedicationIssue("mdmPharmacyPcpEndocrinologyFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [insulinMedicationIssue("mdmObservationIfHighRisk")],
  reassessment: [insulinMedicationIssue("reassessGlucoseSymptomsAdherence")],
  followUpDisposition: [insulinMedicationIssue("dispReturnMedicationSafetyGlucoseSymptoms")],
});

export const POLYURIA_POLYDYPSIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [polyuriaPolydipsia("hpiOnsetUrineFrequencyThirst"), polyuriaPolydipsia("hpiWeightChangeFatigue"), polyuriaPolydipsia("hpiVomitingInfectionSymptoms")],
  rosImportantPositives: [polyuriaPolydipsia("rosPolyuria"), polyuriaPolydipsia("rosPolydipsia"), polyuriaPolydipsia("rosFatigue")],
  rosImportantNegatives: [polyuriaPolydipsia("rosDeniesConfusion")],
  rosRedFlags: [polyuriaPolydipsia("rfDehydrationConcern"), polyuriaPolydipsia("rfWeightLossConcern")],
  physicalExam: { general: [polyuriaPolydipsia("examHydrationIfDocumented"), polyuriaPolydipsia("examMentalStatusIfDocumented"), polyuriaPolydipsia("examGeneralAppearance")] },
  mdmWorkingAssessment: [polyuriaPolydipsia("mdmPolyuriaPolydipsiaPresentation")],
  mdmDifferentialSynthesis: [polyuriaPolydipsia("diffDiabetesHyperglycemiaConcern"), polyuriaPolydipsia("diffDehydration"), polyuriaPolydipsia("diffUti"), polyuriaPolydipsia("diffRenalMetabolicCause")],
  mdmDataReviewed: [polyuriaPolydipsia("mdmGlucoseLabsReviewedIfObtained")],
  mdmClinicalRationale: [polyuriaPolydipsia("mdmHydrationPlanIfGiven"), polyuriaPolydipsia("mdmEndocrinologyPcpFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [polyuriaPolydipsia("mdmObservationIfHighRisk")],
  reassessment: [polyuriaPolydipsia("reassessHydrationVomiting")],
  followUpDisposition: [polyuriaPolydipsia("dispReturnDehydrationVomitingConfusion")],
});

export const DEHYDRATION_METABOLIC_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [dehydrationMetabolic("hpiPoorIntakeVomitingDiarrhea"), dehydrationMetabolic("hpiHeatExposureUrineOutput"), dehydrationMetabolic("hpiWeaknessDizzinessConfusion")],
  rosImportantPositives: [dehydrationMetabolic("rosDehydration"), dehydrationMetabolic("rosDizziness"), dehydrationMetabolic("rosWeakness")],
  rosImportantNegatives: [dehydrationMetabolic("rosDeniesAlteredMentalStatus")],
  rosRedFlags: [dehydrationMetabolic("rfSevereDehydrationConcern"), dehydrationMetabolic("rfAlteredMentalStatus")],
  physicalExam: { general: [dehydrationMetabolic("examHydrationIfDocumented"), dehydrationMetabolic("examPerfusionIfDocumented"), dehydrationMetabolic("examMentalStatusIfDocumented"), dehydrationMetabolic("examGeneralAppearance")] },
  mdmWorkingAssessment: [dehydrationMetabolic("mdmDehydrationMetabolicPresentation")],
  mdmDifferentialSynthesis: [dehydrationMetabolic("diffDehydration"), dehydrationMetabolic("diffMetabolicElectrolyteAbnormality"), dehydrationMetabolic("diffInfection"), dehydrationMetabolic("diffGiIllness")],
  mdmDataReviewed: [dehydrationMetabolic("mdmMetabolicLabsReviewedIfObtained")],
  mdmClinicalRationale: [dehydrationMetabolic("mdmFluidPlanIfGiven"), dehydrationMetabolic("mdmPcpFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [dehydrationMetabolic("mdmObservationIfHighRisk")],
  reassessment: [dehydrationMetabolic("reassessOralToleranceHydration")],
  followUpDisposition: [dehydrationMetabolic("dispReturnInabilityToKeepFluidsWorseningWeakness")],
});

export const ELECTROLYTE_ABNORMALITY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [electrolyteAbnormality("hpiWeaknessCrampsPalpitations"), electrolyteAbnormality("hpiDizzinessSyncope"), electrolyteAbnormality("hpiVomitingDiarrheaDiuretics"), electrolyteAbnormality("hpiRenalDiseaseDialysisHistory")],
  rosImportantPositives: [electrolyteAbnormality("rosWeakness"), electrolyteAbnormality("rosPalpitations"), electrolyteAbnormality("rosDizziness")],
  rosImportantNegatives: [electrolyteAbnormality("rosDeniesChestPain")],
  rosRedFlags: [electrolyteAbnormality("rfSyncopeConcern"), electrolyteAbnormality("rfSevereWeakness")],
  physicalExam: { general: [electrolyteAbnormality("examNeuroStatusIfDocumented"), electrolyteAbnormality("examHydrationIfDocumented"), electrolyteAbnormality("examCardiacRhythmIfDocumented"), electrolyteAbnormality("examGeneralAppearance")] },
  mdmWorkingAssessment: [electrolyteAbnormality("mdmElectrolyteAbnormalityPresentation")],
  mdmDifferentialSynthesis: [electrolyteAbnormality("diffElectrolyteMetabolicAbnormality"), electrolyteAbnormality("diffRenalDisease"), electrolyteAbnormality("diffMedicationEffect"), electrolyteAbnormality("diffGiLosses")],
  mdmDataReviewed: [electrolyteAbnormality("mdmLabsEkgReviewedIfObtained")],
  mdmClinicalRationale: [electrolyteAbnormality("mdmReplacementPlanIfGiven"), electrolyteAbnormality("mdmNephrologyFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [electrolyteAbnormality("mdmObservationIfHighRisk")],
  reassessment: [electrolyteAbnormality("reassessWeaknessPalpitations")],
  followUpDisposition: [electrolyteAbnormality("dispReturnPalpitationsFaintingWeakness")],
});

export const THYROID_SYMPTOMS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [thyroidSymptoms("hpiPalpitationsWeightChange"), thyroidSymptoms("hpiHeatColdIntoleranceTremor"), thyroidSymptoms("hpiFatigueNeckSwelling"), thyroidSymptoms("hpiMedicationAdherencePriorThyroidDisease")],
  rosImportantPositives: [thyroidSymptoms("rosPalpitations"), thyroidSymptoms("rosFatigue"), thyroidSymptoms("rosWeightChange")],
  rosImportantNegatives: [thyroidSymptoms("rosDeniesChestPain")],
  rosRedFlags: [thyroidSymptoms("rfSeverePalpitations"), thyroidSymptoms("rfSyncopeConcern")],
  physicalExam: { general: [thyroidSymptoms("examThyroidNeckFindingsIfDocumented"), thyroidSymptoms("examTremorIfDocumented"), thyroidSymptoms("examCardiacExamIfDocumented"), thyroidSymptoms("examGeneralAppearance")] },
  mdmWorkingAssessment: [thyroidSymptoms("mdmThyroidSymptomsPresentation")],
  mdmDifferentialSynthesis: [thyroidSymptoms("diffThyroidDysfunction"), thyroidSymptoms("diffAnxietyPanic"), thyroidSymptoms("diffArrhythmia"), thyroidSymptoms("diffMedicationIssue"), thyroidSymptoms("diffInfection")],
  mdmDataReviewed: [thyroidSymptoms("mdmThyroidLabsReviewedIfObtained")],
  mdmClinicalRationale: [thyroidSymptoms("mdmMedicationPlanIfGiven"), thyroidSymptoms("mdmEndocrinologyFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [thyroidSymptoms("mdmObservationIfHighRisk")],
  reassessment: [thyroidSymptoms("reassessPalpitationsSymptoms")],
  followUpDisposition: [thyroidSymptoms("dispReturnPalpitationsChestPainSyncope")],
});

export const GENERALIZED_WEAKNESS_METABOLIC_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [generalizedWeaknessMetabolic("hpiOnsetProgressionFunctionalImpact"), generalizedWeaknessMetabolic("hpiFocalVsGeneralizedSymptoms"), generalizedWeaknessMetabolic("hpiPoorIntakeFeverVomiting"), generalizedWeaknessMetabolic("hpiGlucoseConcernsMedicationChanges")],
  rosImportantPositives: [generalizedWeaknessMetabolic("rosWeakness"), generalizedWeaknessMetabolic("rosFatigue"), generalizedWeaknessMetabolic("rosDizziness")],
  rosImportantNegatives: [generalizedWeaknessMetabolic("rosDeniesFocalWeakness")],
  rosRedFlags: [generalizedWeaknessMetabolic("rfInabilityToAmbulate"), generalizedWeaknessMetabolic("rfAlteredMentalStatus")],
  physicalExam: { general: [generalizedWeaknessMetabolic("examNeuroScreenIfDocumented"), generalizedWeaknessMetabolic("examHydrationIfDocumented"), generalizedWeaknessMetabolic("examCardiopulmonaryIfDocumented"), generalizedWeaknessMetabolic("examGeneralAppearance")] },
  mdmWorkingAssessment: [generalizedWeaknessMetabolic("mdmWeaknessMetabolicPresentation")],
  mdmDifferentialSynthesis: [generalizedWeaknessMetabolic("diffMetabolicElectrolyteAbnormality"), generalizedWeaknessMetabolic("diffInfection"), generalizedWeaknessMetabolic("diffAnemia"), generalizedWeaknessMetabolic("diffCardiac"), generalizedWeaknessMetabolic("diffNeurologic"), generalizedWeaknessMetabolic("diffDehydration")],
  mdmDataReviewed: [generalizedWeaknessMetabolic("mdmMetabolicLabsReviewedIfObtained")],
  mdmClinicalRationale: [generalizedWeaknessMetabolic("mdmFunctionalStatusAssessed"), generalizedWeaknessMetabolic("mdmEndocrinologyPcpFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [generalizedWeaknessMetabolic("mdmAdmissionIfIndicated")],
  reassessment: [generalizedWeaknessMetabolic("reassessFunctionalStatusWeakness")],
  followUpDisposition: [generalizedWeaknessMetabolic("dispReturnWorseningWeaknessInabilityToAmbulate")],
});

export const NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL = buildNauseaVomitingMetabolicComplaintV1Intel(
  nauseaVomitingMetabolic
);

export const ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS = [
  "hyperglycemia_complaint_v1",
  "hypoglycemia_complaint_v1",
  "diabetes_sick_day_complaint_v1",
  "insulin_medication_issue_complaint_v1",
  "polyuria_polydipsia_complaint_v1",
  "dehydration_metabolic_complaint_v1",
  "electrolyte_abnormality_complaint_v1",
  "thyroid_symptoms_complaint_v1",
  "generalized_weakness_metabolic_complaint_v1",
  "nausea_vomiting_metabolic_complaint_v1"
] as const;

export const ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  hyperglycemia_complaint_v1: HYPERGLYCEMIA_COMPLAINT_V1_INTEL,
  hypoglycemia_complaint_v1: HYPOGLYCEMIA_COMPLAINT_V1_INTEL,
  diabetes_sick_day_complaint_v1: DIABETES_SICK_DAY_COMPLAINT_V1_INTEL,
  insulin_medication_issue_complaint_v1: INSULIN_MEDICATION_ISSUE_COMPLAINT_V1_INTEL,
  polyuria_polydipsia_complaint_v1: POLYURIA_POLYDYPSIA_COMPLAINT_V1_INTEL,
  dehydration_metabolic_complaint_v1: DEHYDRATION_METABOLIC_COMPLAINT_V1_INTEL,
  electrolyte_abnormality_complaint_v1: ELECTROLYTE_ABNORMALITY_COMPLAINT_V1_INTEL,
  thyroid_symptoms_complaint_v1: THYROID_SYMPTOMS_COMPLAINT_V1_INTEL,
  generalized_weakness_metabolic_complaint_v1: GENERALIZED_WEAKNESS_METABOLIC_COMPLAINT_V1_INTEL,
  nausea_vomiting_metabolic_complaint_v1: NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL,
} as const;
/** Phase 19MDM.5 — GU / renal complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildPelvicPainComplaintV1Intel,
  buildVaginalBleedingComplaintV1Intel,
  buildVaginalDischargeComplaintV1Intel,
} from "./providerDocumentationFemalePelvicGynComplaintIntelGoldStandard";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const dysuria = (key: string) => `providerDocumentationComplaintIntel.dysuriaComplaintV1.${key}`;
const hematuria = (key: string) => `providerDocumentationComplaintIntel.hematuriaComplaintV1.${key}`;
const flankPainRenal = (key: string) => `providerDocumentationComplaintIntel.flankPainRenalComplaintV1.${key}`;
const urinaryRetention = (key: string) => `providerDocumentationComplaintIntel.urinaryRetentionComplaintV1.${key}`;
const testicularPain = (key: string) => `providerDocumentationComplaintIntel.testicularPainComplaintV1.${key}`;
const pelvicPain = (key: string) => `providerDocumentationComplaintIntel.pelvicPainComplaintV1.${key}`;
const vaginalBleeding = (key: string) => `providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.${key}`;
const vaginalDischarge = (key: string) => `providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.${key}`;
const renalFailureSymptoms = (key: string) => `providerDocumentationComplaintIntel.renalFailureSymptomsComplaintV1.${key}`;

export const DYSURIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [dysuria("hpiOnsetFrequencyUrgency"), dysuria("hpiSuprapubicPain"), dysuria("hpiFeverFlankHematuria"), dysuria("hpiDischargeStiExposure"), dysuria("hpiPregnancyPossibilityIfApplicable")],
  rosImportantPositives: [dysuria("rosDysuria"), dysuria("rosFrequency"), dysuria("rosSuprapubicPain")],
  rosImportantNegatives: [dysuria("rosDeniesFlankPain")],
  rosRedFlags: [dysuria("rfFeverConcern"), dysuria("rfUrinaryRetentionConcern")],
  physicalExam: { abdomen: [dysuria("examAbdominalCvaTenderness"), dysuria("examHydrationIfDocumented"), dysuria("examGuExamIfPerformed")], general: [dysuria("examGeneralAppearance")] },
  mdmWorkingAssessment: [dysuria("mdmDysuriaPresentation")],
  mdmDifferentialSynthesis: [dysuria("diffCystitis"), dysuria("diffPyelonephritis"), dysuria("diffStiUrethritis"), dysuria("diffProstatitis"), dysuria("diffStoneDisease"), dysuria("diffVaginitis")],
  mdmDataReviewed: [dysuria("mdmUaCultureReviewedIfObtained")],
  mdmClinicalRationale: [dysuria("mdmAntibioticPlanIfGiven"), dysuria("mdmUrologyObGynFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [dysuria("mdmObservationIfHighRisk")],
  reassessment: [dysuria("reassessUrinarySymptomsPain")],
  followUpDisposition: [dysuria("dispReturnFeverFlankRetention")],
});

export const HEMATURIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [hematuria("hpiGrossVsMicroscopic"), hematuria("hpiClotsTraumaAnticoagulants"), hematuria("hpiFlankPainUrinarySymptoms"), hematuria("hpiFeverRetentionSymptoms")],
  rosImportantPositives: [hematuria("rosHematuria"), hematuria("rosFlankPain"), hematuria("rosDysuria")],
  rosImportantNegatives: [hematuria("rosDeniesTrauma")],
  rosRedFlags: [hematuria("rfClotRetentionConcern"), hematuria("rfHeavyBleedingConcern")],
  physicalExam: { abdomen: [hematuria("examAbdominalCvaTenderness"), hematuria("examGuFindingsIfExamined")], general: [hematuria("examGeneralAppearance")] },
  mdmWorkingAssessment: [hematuria("mdmHematuriaPresentation")],
  mdmDifferentialSynthesis: [hematuria("diffStoneDisease"), hematuria("diffInfection"), hematuria("diffMalignancyConcern"), hematuria("diffTrauma"), hematuria("diffAnticoagulationBleeding"), hematuria("diffObstruction")],
  mdmDataReviewed: [hematuria("mdmUaImagingLabsReviewedIfObtained")],
  mdmClinicalRationale: [hematuria("mdmUrologyConsultIfIndicated"), hematuria("mdmAnticoagulationReviewIfApplicable")],
  mdmAdmitObserveDischarge: [hematuria("mdmAdmissionIfHighRisk")],
  reassessment: [hematuria("reassessBleedingRetention")],
  followUpDisposition: [hematuria("dispReturnWorseningBleedingRetention")],
});

export const FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [flankPainRenal("hpiUnilateralBilateralPain"), flankPainRenal("hpiRadiationNauseaVomiting"), flankPainRenal("hpiFeverUrinarySymptoms"), flankPainRenal("hpiHematuriaPregnancyRisk")],
  rosImportantPositives: [flankPainRenal("rosFlankPain"), flankPainRenal("rosNausea"), flankPainRenal("rosDysuria")],
  rosImportantNegatives: [flankPainRenal("rosDeniesFever")],
  rosRedFlags: [flankPainRenal("rfSeverePainVomiting"), flankPainRenal("rfObstructionConcern")],
  physicalExam: { abdomen: [flankPainRenal("examCvaTenderness"), flankPainRenal("examAbdominalTenderness"), flankPainRenal("examHydrationIfDocumented")], general: [flankPainRenal("examGeneralAppearance")] },
  mdmWorkingAssessment: [flankPainRenal("mdmFlankPainPresentation")],
  mdmDifferentialSynthesis: [flankPainRenal("diffRenalColic"), flankPainRenal("diffPyelonephritis"), flankPainRenal("diffObstruction"), flankPainRenal("diffVascularCause"), flankPainRenal("diffMskPain"), flankPainRenal("diffGynecologicCause")],
  mdmDataReviewed: [flankPainRenal("mdmCtUltrasoundLabsReviewedIfObtained")],
  mdmClinicalRationale: [flankPainRenal("mdmAnalgesiaPlanIfGiven"), flankPainRenal("mdmUrologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [flankPainRenal("mdmObservationIfPersistentPain")],
  reassessment: [flankPainRenal("reassessPainControlVomiting")],
  followUpDisposition: [flankPainRenal("dispReturnFeverObstructionConcern")],
});

export const URINARY_RETENTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [urinaryRetention("hpiInabilityToVoid"), urinaryRetention("hpiSuprapubicFullnessPain"), urinaryRetention("hpiNeuroSymptomsMedTriggers"), urinaryRetention("hpiProstateHistory")],
  rosImportantPositives: [urinaryRetention("rosUrinaryRetention"), urinaryRetention("rosSuprapubicPain"), urinaryRetention("rosWeakness")],
  rosImportantNegatives: [urinaryRetention("rosDeniesFever")],
  rosRedFlags: [urinaryRetention("rfBladderDistentionConcern"), urinaryRetention("rfNeuroDeficitConcern")],
  physicalExam: { abdomen: [urinaryRetention("examBladderDistentionIfDocumented"), urinaryRetention("examNeuroFindingsIfDocumented")], general: [urinaryRetention("examGeneralAppearance")] },
  mdmWorkingAssessment: [urinaryRetention("mdmRetentionPresentation")],
  mdmDifferentialSynthesis: [urinaryRetention("diffObstruction"), urinaryRetention("diffBph"), urinaryRetention("diffNeurogenicBladder"), urinaryRetention("diffMedicationRelated"), urinaryRetention("diffInfection")],
  mdmDataReviewed: [urinaryRetention("mdmBladderScanCatheterReviewedIfObtained")],
  mdmClinicalRationale: [urinaryRetention("mdmCatheterPlanIfPerformed"), urinaryRetention("mdmUrologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [urinaryRetention("mdmAdmissionIfUnableToVoid")],
  reassessment: [urinaryRetention("reassessVoidingStatus")],
  followUpDisposition: [urinaryRetention("dispReturnInabilityToVoidFollowUp")],
});

export const TESTICULAR_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [testicularPain("hpiOnsetSuddenVsGradual"), testicularPain("hpiSwellingTraumaUrinarySymptoms"), testicularPain("hpiFeverStiExposure"), testicularPain("hpiPriorTorsionHistory")],
  rosImportantPositives: [testicularPain("rosTesticularPain"), testicularPain("rosScrotalSwelling"), testicularPain("rosDysuria")],
  rosImportantNegatives: [testicularPain("rosDeniesTrauma")],
  rosRedFlags: [testicularPain("rfSuddenSeverePain"), testicularPain("rfVomitingConcern")],
  physicalExam: { abdomen: [testicularPain("examScrotalSwellingTenderness"), testicularPain("examCremastericReflexIfDocumented"), testicularPain("examGuFindingsIfExamined")], general: [testicularPain("examGeneralAppearance")] },
  mdmWorkingAssessment: [testicularPain("mdmTesticularPainPresentation")],
  mdmDifferentialSynthesis: [testicularPain("diffTorsion"), testicularPain("diffEpididymitis"), testicularPain("diffOrchitis"), testicularPain("diffHernia"), testicularPain("diffHydroceleVaricocele"), testicularPain("diffTrauma")],
  mdmDataReviewed: [testicularPain("mdmUltrasoundReviewedIfObtained")],
  mdmClinicalRationale: [testicularPain("mdmUrgentUrologyConsultIfIndicated"), testicularPain("mdmSurgicalConsultIfConcern")],
  mdmAdmitObserveDischarge: [testicularPain("mdmAdmissionIfHighRisk")],
  reassessment: [testicularPain("reassessPainSwelling")],
  followUpDisposition: [testicularPain("dispReturnWorseningPainSwellingFever")],
});

export const PELVIC_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPelvicPainComplaintV1Intel(pelvicPain);

export const VAGINAL_BLEEDING_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildVaginalBleedingComplaintV1Intel(vaginalBleeding);

export const VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildVaginalDischargeComplaintV1Intel(vaginalDischarge);

export const RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [renalFailureSymptoms("hpiDecreasedUrineOutput"), renalFailureSymptoms("hpiEdemaWeaknessNausea"), renalFailureSymptoms("hpiDyspneaDialysisHistory"), renalFailureSymptoms("hpiMedicationComplianceWeightChanges")],
  rosImportantPositives: [renalFailureSymptoms("rosEdema"), renalFailureSymptoms("rosWeakness"), renalFailureSymptoms("rosDyspnea")],
  rosImportantNegatives: [renalFailureSymptoms("rosDeniesChestPain")],
  rosRedFlags: [renalFailureSymptoms("rfVolumeOverloadConcern"), renalFailureSymptoms("rfAlteredMentalStatus")],
  physicalExam: { abdomen: [renalFailureSymptoms("examEdemaIfDocumented"), renalFailureSymptoms("examPerfusionIfDocumented"), renalFailureSymptoms("examRespiratoryFindingsIfDocumented")], general: [renalFailureSymptoms("examGeneralAppearance")] },
  mdmWorkingAssessment: [renalFailureSymptoms("mdmRenalFailureSymptomsPresentation")],
  mdmDifferentialSynthesis: [renalFailureSymptoms("diffAki"), renalFailureSymptoms("diffCkdProgression"), renalFailureSymptoms("diffElectrolyteDerangement"), renalFailureSymptoms("diffVolumeOverload"), renalFailureSymptoms("diffDehydration")],
  mdmDataReviewed: [renalFailureSymptoms("mdmRenalLabsElectrolytesImagingIfObtained")],
  mdmClinicalRationale: [renalFailureSymptoms("mdmDialysisPlanIfApplicable"), renalFailureSymptoms("mdmNephrologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [renalFailureSymptoms("mdmAdmissionIfIndicated")],
  reassessment: [renalFailureSymptoms("reassessVolumeRespiratoryStatus")],
  followUpDisposition: [renalFailureSymptoms("dispReturnWorseningEdemaSob")],
});

export const GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS = [
  "dysuria_complaint_v1",
  "hematuria_complaint_v1",
  "flank_pain_renal_complaint_v1",
  "urinary_retention_complaint_v1",
  "testicular_pain_complaint_v1",
  "pelvic_pain_complaint_v1",
  "vaginal_bleeding_complaint_v1",
  "vaginal_discharge_complaint_v1",
  "renal_failure_symptoms_complaint_v1"
] as const;

export const GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  dysuria_complaint_v1: DYSURIA_COMPLAINT_V1_INTEL,
  hematuria_complaint_v1: HEMATURIA_COMPLAINT_V1_INTEL,
  flank_pain_renal_complaint_v1: FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL,
  urinary_retention_complaint_v1: URINARY_RETENTION_COMPLAINT_V1_INTEL,
  testicular_pain_complaint_v1: TESTICULAR_PAIN_COMPLAINT_V1_INTEL,
  pelvic_pain_complaint_v1: PELVIC_PAIN_COMPLAINT_V1_INTEL,
  vaginal_bleeding_complaint_v1: VAGINAL_BLEEDING_COMPLAINT_V1_INTEL,
  vaginal_discharge_complaint_v1: VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL,
  renal_failure_symptoms_complaint_v1: RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL,
} as const;
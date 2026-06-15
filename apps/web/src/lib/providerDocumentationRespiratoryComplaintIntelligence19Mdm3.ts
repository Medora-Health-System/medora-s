/** Phase 19MDM.3 — Respiratory / ENT complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { buildSoreThroatComplaintIntel } from "./providerDocumentationSoreThroatComplaintIntelGoldStandard";
import {
  buildAsthmaWheezingComplaintV1Intel,
  buildCopdExacerbationComplaintV1Intel,
  buildPneumoniaSymptomsComplaintV1Intel,
  buildHemoptysisComplaintV1Intel,
} from "./providerDocumentationShortnessOfBreathComplaintIntelGoldStandard";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const cough = (key: string) => `providerDocumentationComplaintIntel.coughComplaintV1.${key}`;
const uriCongestion = (key: string) => `providerDocumentationComplaintIntel.uriCongestionComplaintV1.${key}`;
const soreThroat = (key: string) => `providerDocumentationComplaintIntel.soreThroatComplaintV1.${key}`;
const asthmaWheezing = (key: string) => `providerDocumentationComplaintIntel.asthmaWheezingComplaintV1.${key}`;
const copdExacerbation = (key: string) => `providerDocumentationComplaintIntel.copdExacerbationComplaintV1.${key}`;
const pneumoniaSymptoms = (key: string) => `providerDocumentationComplaintIntel.pneumoniaSymptomsComplaintV1.${key}`;
const hemoptysis = (key: string) => `providerDocumentationComplaintIntel.hemoptysisComplaintV1.${key}`;
const chestCongestion = (key: string) => `providerDocumentationComplaintIntel.chestCongestionComplaintV1.${key}`;
const fluLikeIllness = (key: string) => `providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.${key}`;

export const COUGH_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [cough("hpiOnsetDuration"), cough("hpiProductiveVsDry"), cough("hpiSputumCharacter"), cough("hpiAssocFeverChestPain"), cough("hpiAssocSobWheezeHemoptysis"), cough("hpiSickContactsSmokingHistory"), cough("hpiImmunocompromisedStatus")],
  rosImportantPositives: [cough("rosCough"), cough("rosFever"), cough("rosSob"), cough("rosChestPain")],
  rosImportantNegatives: [cough("rosDeniesHemoptysis")],
  rosRedFlags: [cough("rfRespiratoryDistress"), cough("rfSignificantHemoptysis")],
  physicalExam: { respiratory: [cough("examWorkOfBreathing"), cough("examLungSounds"), cough("examOxygenRequirement")], general: [cough("examGeneralAppearance")] },
  mdmWorkingAssessment: [cough("mdmCoughPresentation")],
  mdmDifferentialSynthesis: [cough("diffUri"), cough("diffBronchitis"), cough("diffPneumonia"), cough("diffAsthmaCopd"), cough("diffChf"), cough("diffPeAcsWhenRelevant")],
  mdmDataReviewed: [cough("mdmCxrReviewedIfObtained"), cough("mdmLabsReviewedIfObtained")],
  mdmClinicalRationale: [cough("mdmRespiratoryReassessment")],
  mdmAdmitObserveDischarge: [cough("mdmObservationIfIndicated")],
  reassessment: [cough("reassessWorkOfBreathing"), cough("reassessOxygenation")],
  followUpDisposition: [cough("dispReturnWorseningBreathing"), cough("dispDispositionReflectsRespiratoryCourse")],
});

export const URI_CONGESTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [uriCongestion("hpiCongestionRhinorrhea"), uriCongestion("hpiSoreThroatCough"), uriCongestion("hpiFeverSinusSymptoms"), uriCongestion("hpiBreathingDifficultyDehydration")],
  rosImportantPositives: [uriCongestion("rosCongestion"), uriCongestion("rosSoreThroat"), uriCongestion("rosCough"), uriCongestion("rosFever")],
  rosImportantNegatives: [uriCongestion("rosDeniesSevereSob")],
  rosRedFlags: [uriCongestion("rfDehydration"), uriCongestion("rfRespiratoryDistress")],
  physicalExam: { respiratory: [uriCongestion("examEntFindings"), uriCongestion("examLungExam"), uriCongestion("examHydration")], general: [uriCongestion("examGeneralAppearance")]},
  mdmWorkingAssessment: [uriCongestion("mdmUriPresentation")],
  mdmDifferentialSynthesis: [uriCongestion("diffViralUri"), uriCongestion("diffSinusitis"), uriCongestion("diffAllergicRhinitis"), uriCongestion("diffInfluenzaLike"), uriCongestion("diffPneumoniaWhenLowerRespiratory")],
  mdmDataReviewed: [uriCongestion("mdmViralTestingIfIndicated")],
  mdmClinicalRationale: [uriCongestion("mdmSymptomaticCarePlan")],
  mdmAdmitObserveDischarge: [uriCongestion("mdmObservationIfHighRisk")],
  reassessment: [uriCongestion("reassessRespiratoryStatus")],
  followUpDisposition: [uriCongestion("dispReturnWorseningBreathingFever")],
});

export const SORE_THROAT_COMPLAINT_V1_INTEL = buildSoreThroatComplaintIntel(soreThroat);

export const ASTHMA_WHEEZING_COMPLAINT_V1_INTEL = buildAsthmaWheezingComplaintV1Intel(asthmaWheezing);

export const COPD_EXACERBATION_COMPLAINT_V1_INTEL = buildCopdExacerbationComplaintV1Intel(copdExacerbation);

export const PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL = buildPneumoniaSymptomsComplaintV1Intel(pneumoniaSymptoms);

export const HEMOPTYSIS_COMPLAINT_V1_INTEL = buildHemoptysisComplaintV1Intel(hemoptysis);

export const CHEST_CONGESTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [chestCongestion("hpiCongestionDuration"), chestCongestion("hpiSputumFeverWheezing"), chestCongestion("hpiSobAsthmaCopdChfHistory"), chestCongestion("hpiSickContactsSmoking")],
  rosImportantPositives: [chestCongestion("rosCongestion"), chestCongestion("rosCough"), chestCongestion("rosWheezing")],
  rosImportantNegatives: [chestCongestion("rosDeniesChestPain")],
  rosRedFlags: [chestCongestion("rfRespiratoryDistress"), chestCongestion("rfChestPainConcern")],
  physicalExam: { respiratory: [chestCongestion("examLungSounds"), chestCongestion("examWorkOfBreathing"), chestCongestion("examHydration")], general: [chestCongestion("examGeneralAppearance")]},
  mdmWorkingAssessment: [chestCongestion("mdmChestCongestionPresentation")],
  mdmDifferentialSynthesis: [chestCongestion("diffUri"), chestCongestion("diffBronchitis"), chestCongestion("diffPneumonia"), chestCongestion("diffAsthmaCopd"), chestCongestion("diffChf")],
  mdmDataReviewed: [chestCongestion("mdmCxrIfObtained")],
  mdmClinicalRationale: [chestCongestion("mdmSymptomaticTreatmentPlan")],
  mdmAdmitObserveDischarge: [chestCongestion("mdmObservationIfIndicated")],
  reassessment: [chestCongestion("reassessBreathingStatus")],
  followUpDisposition: [chestCongestion("dispReturnWorseningBreathingChestPain")],
});

export const FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [fluLikeIllness("hpiFeverChillsMyalgias"), fluLikeIllness("hpiCoughSoreThroatHeadache"), fluLikeIllness("hpiDehydrationSobChestPain"), fluLikeIllness("hpiHighRiskConditions")],
  rosImportantPositives: [fluLikeIllness("rosFever"), fluLikeIllness("rosMyalgias"), fluLikeIllness("rosCough"), fluLikeIllness("rosSoreThroat")],
  rosImportantNegatives: [fluLikeIllness("rosDeniesSevereSob")],
  rosRedFlags: [fluLikeIllness("rfDehydration"), fluLikeIllness("rfRespiratoryDistress")],
  physicalExam: { respiratory: [fluLikeIllness("examHydration"), fluLikeIllness("examRespiratoryEntFindings")], general: [fluLikeIllness("examGeneralAppearance")]},
  mdmWorkingAssessment: [fluLikeIllness("mdmFluLikeIllnessPresentation")],
  mdmDifferentialSynthesis: [fluLikeIllness("diffInfluenzaLike"), fluLikeIllness("diffCovidLike"), fluLikeIllness("diffViralSyndrome"), fluLikeIllness("diffPneumonia"), fluLikeIllness("diffDehydration")],
  mdmDataReviewed: [fluLikeIllness("mdmViralTestingIfIndicated"), fluLikeIllness("mdmLabsIfObtained")],
  mdmClinicalRationale: [fluLikeIllness("mdmHydrationSymptomaticCare")],
  mdmAdmitObserveDischarge: [fluLikeIllness("mdmObservationIfHighRisk")],
  reassessment: [fluLikeIllness("reassessHydrationFever")],
  followUpDisposition: [fluLikeIllness("dispReturnPersistentFeverBreathing")],
});

export const RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS = [
  "cough_complaint_v1",
  "uri_congestion_complaint_v1",
  "sore_throat_complaint_v1",
  "asthma_wheezing_complaint_v1",
  "copd_exacerbation_complaint_v1",
  "pneumonia_symptoms_complaint_v1",
  "hemoptysis_complaint_v1",
  "chest_congestion_complaint_v1",
  "flu_like_illness_complaint_v1"
] as const;

export const RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  cough_complaint_v1: COUGH_COMPLAINT_V1_INTEL,
  uri_congestion_complaint_v1: URI_CONGESTION_COMPLAINT_V1_INTEL,
  sore_throat_complaint_v1: SORE_THROAT_COMPLAINT_V1_INTEL,
  asthma_wheezing_complaint_v1: ASTHMA_WHEEZING_COMPLAINT_V1_INTEL,
  copd_exacerbation_complaint_v1: COPD_EXACERBATION_COMPLAINT_V1_INTEL,
  pneumonia_symptoms_complaint_v1: PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL,
  hemoptysis_complaint_v1: HEMOPTYSIS_COMPLAINT_V1_INTEL,
  chest_congestion_complaint_v1: CHEST_CONGESTION_COMPLAINT_V1_INTEL,
  flu_like_illness_complaint_v1: FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
} as const;
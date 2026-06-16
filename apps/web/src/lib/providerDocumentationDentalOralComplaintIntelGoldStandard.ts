/** ME.2Q-R Track C — chart-ready dental / oral complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function dentalOralHpi(d: (key: string) => string): string[] {
  return [
    d("hpiDentalPainBeganToday"),
    d("hpiDentalPainBeganThisMorning"),
    d("hpiDentalPainBeganOvernight"),
    d("hpiSymptomsForSeveralDays"),
    d("hpiGradualOnsetDentalPain"),
    d("hpiWorseningDentalPain"),
    d("hpiRecurrentDentalPain"),
    d("hpiToothPain"),
    d("hpiUpperToothPain"),
    d("hpiLowerToothPain"),
    d("hpiRightSidedDentalPain"),
    d("hpiLeftSidedDentalPain"),
    d("hpiGumPain"),
    d("hpiJawPain"),
    d("hpiThrobbingPain"),
    d("hpiPainWithChewing"),
    d("hpiPainWithTemperatureChanges"),
    d("hpiFacialSwelling"),
    d("hpiGumSwelling"),
    d("hpiOralSwelling"),
    d("hpiDrainageFromTooth"),
    d("hpiFoulTasteInMouth"),
    d("hpiPusDrainage"),
    d("hpiVisibleDentalAbscess"),
    d("hpiFever"),
    d("hpiChills"),
    d("hpiDifficultySwallowing"),
    d("hpiPainfulSwallowing"),
    d("hpiTrismus"),
    d("hpiDecreasedOralIntake"),
    d("hpiNausea"),
    d("hpiBrokenTooth"),
    d("hpiDentalCaries"),
    d("hpiPoorDentition"),
    d("hpiRecentDentalProcedure"),
    d("hpiRecentToothExtraction"),
    d("hpiUnableToSeeDentist"),
    d("hpiHistoryOfDentalInfection"),
    d("hpiDeniesFever"),
    d("hpiDeniesFacialSwelling"),
    d("hpiDeniesDifficultySwallowing"),
    d("hpiDeniesShortnessOfBreath"),
    d("hpiDeniesTongueSwelling"),
    d("hpiDeniesNeckSwelling"),
    d("hpiDeniesTrismus"),
  ];
}

function sharedRos(d: (key: string) => string) {
  return {
    rosImportantPositives: [
      d("rosDentalPain"),
      d("rosGumPain"),
      d("rosFacialSwelling"),
      d("rosOralSwelling"),
      d("rosDrainage"),
      d("rosFever"),
      d("rosChills"),
      d("rosPainfulSwallowing"),
      d("rosDifficultySwallowing"),
      d("rosTrismus"),
    ],
    rosImportantNegatives: [
      d("rosDeniesFever"),
      d("rosDeniesFacialSwelling"),
      d("rosDeniesTongueSwelling"),
      d("rosDeniesNeckSwelling"),
      d("rosDeniesDifficultySwallowing"),
      d("rosDeniesShortnessOfBreath"),
      d("rosDeniesTrismus"),
    ],
    rosRedFlags: [
      d("rfAirwayConcern"),
      d("rfTongueSwelling"),
      d("rfFloorOfMouthSwelling"),
      d("rfNeckSwelling"),
      d("rfTrismus"),
      d("rfDrooling"),
      d("rfInabilityToSwallow"),
      d("rfDeepSpaceInfectionConcern"),
      d("rfSepsisConcern"),
    ],
  };
}

function sharedExam(d: (key: string) => string) {
  return {
    general: [
      d("examWellAppearing"),
      d("examUncomfortableAppearing"),
      d("examMildlyIllAppearing"),
      d("examNonToxicAppearing"),
      d("examToxicAppearing"),
      d("examAfebrile"),
      d("examFebrile"),
      d("examHemodynamicallyStable"),
    ],
    heent: [
      d("examDentalCariesPresent"),
      d("examPoorDentition"),
      d("examDentalTendernessPresent"),
      d("examGingivalSwellingPresent"),
      d("examVisibleDentalAbscess"),
      d("examPurulentDrainagePresent"),
      d("examFracturedToothPresent"),
      d("examNoOralSwelling"),
      d("examOralSwellingPresent"),
      d("examAirwayPatent"),
      d("examNoDrooling"),
      d("examNoStridor"),
      d("examNoTongueSwelling"),
      d("examFloorOfMouthSoft"),
      d("examFloorOfMouthSwellingPresent"),
      d("examTrismusPresent"),
      d("examNoTrismus"),
    ],
    skin: [
      d("examFacialSwellingPresent"),
      d("examNoFacialSwelling"),
      d("examNeckSwellingPresent"),
      d("examCervicalLymphadenopathyPresent"),
    ],
  };
}

function sharedMdmGoldStandard(d: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      d("waSuspectedDentalInfection"),
      d("waSuspectedDentalAbscess"),
      d("waSuspectedDentalCaries"),
      d("waSuspectedGingivitis"),
      d("waDentalPainUnclearEtiology"),
      d("waLowSuspicionDeepSpaceInfection"),
      d("waConcernDeepSpaceInfection"),
      d("waConcernAirwayInvolvement"),
    ],
    mdmDifferentialSynthesis: [
      d("diffDentalCaries"),
      d("diffDentalAbscess"),
      d("diffGingivitis"),
      d("diffPulpitis"),
      d("diffFracturedTooth"),
      d("diffPostExtractionPain"),
      d("diffFacialCellulitis"),
      d("diffDeepSpaceInfection"),
      d("diffOsteomyelitis"),
      d("diffSepsis"),
      d("diffLudwigAngina"),
      d("diffDeepNeckSpaceInfection"),
      d("diffAirwayCompromise"),
      d("diffNecrotizingSoftTissueInfection"),
      d("diffMandibularOsteomyelitis"),
    ],
    mdmDataReviewed: [
      d("mdmCbcReviewed"),
      d("mdmCmpReviewed"),
      d("mdmCtFaceReviewed"),
      d("mdmCtNeckReviewed"),
      d("mdmDentalImagingReviewed"),
      d("mdmBloodCultureReviewed"),
    ],
    mdmRiskStratification: [
      d("riskLocalizedDentalPain"),
      d("riskNoFacialSwelling"),
      d("riskNoAirwaySymptoms"),
      d("riskStableOutpatientDentalFollowUp"),
      d("riskFacialSwellingPresent"),
      d("riskAntibioticsAdministered"),
      d("riskImagingObtained"),
      d("riskObservationRequired"),
      d("riskAirwayConcern"),
      d("riskFloorOfMouthSwelling"),
      d("riskDeepSpaceInfectionConcern"),
      d("riskSepsisConcern"),
      d("riskAdmissionRecommended"),
      d("riskOralSurgeryConsultationObtained"),
    ],
    mdmClinicalRationale: [
      d("reasoningConsistentWithDentalInfection"),
      d("reasoningLowSuspicionDeepSpaceInfection"),
      d("reasoningNoEvidenceAirwayCompromise"),
      d("reasoningFloorOfMouthRemainsSoft"),
      d("reasoningOutpatientDentalFollowUpAppropriate"),
      d("reasoningImagingObtainedForSwellingInfection"),
    ],
    clinicalImpression: [
      d("impDentalPain"),
      d("impDentalInfection"),
      d("impDentalAbscess"),
      d("impDentalCaries"),
      d("impGingivitis"),
      d("impFacialSwelling"),
      d("impOralInfection"),
    ],
    mdmPlanSummary: [
      d("planAntibioticsPrescribed"),
      d("planPainControlProvided"),
      d("planDentalFollowUpRecommended"),
      d("planOralSurgeryFollowUpRecommended"),
      d("planOralHygieneDiscussed"),
      d("planSoftDietDiscussed"),
      d("planReturnPrecautionsDiscussed"),
      d("planEdReturnAdvisedSwellingFeverDysphagia"),
    ],
  };
}

function sharedReassessment(d: (key: string) => string) {
  return {
    reassessment: [
      d("reassessPainImproved"),
      d("reassessSwellingImproved"),
      d("reassessFeverImproved"),
      d("reassessToleratingOralIntake"),
      d("reassessRemainsHemodynamicallyStable"),
      d("reassessAirwayRemainsPatent"),
      d("reassessNoClinicalDeterioration"),
      d("reassessSymptomsImprovedAfterTreatment"),
    ],
  };
}

export function buildDentalPainInfectionComplaintV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: dentalOralHpi(d),
    ...sharedRos(d),
    physicalExam: sharedExam(d),
    ...sharedMdmGoldStandard(d),
    ...sharedReassessment(d),
  });
}

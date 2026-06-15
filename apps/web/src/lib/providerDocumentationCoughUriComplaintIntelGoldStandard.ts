/** ME.2F-R Track C — chart-ready cough / URI complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function coughUriHpi(cu: (key: string) => string): string[] {
  return [
    cu("hpiBeganToday"),
    cu("hpiBeganThisMorning"),
    cu("hpiBeganOvernight"),
    cu("hpiSymptomsForSeveralDays"),
    cu("hpiGradualOnset"),
    cu("hpiWorseningSymptoms"),
    cu("hpiImprovingSymptoms"),
    cu("hpiDryCough"),
    cu("hpiProductiveCough"),
    cu("hpiFrequentCough"),
    cu("hpiPersistentCough"),
    cu("hpiNocturnalCough"),
    cu("hpiBarkingCough"),
    cu("hpiCoughingFits"),
    cu("hpiNasalCongestion"),
    cu("hpiRunnyNose"),
    cu("hpiPostnasalDrainage"),
    cu("hpiSoreThroat"),
    cu("hpiHoarseVoice"),
    cu("hpiSinusPressure"),
    cu("hpiFever"),
    cu("hpiChills"),
    cu("hpiBodyAches"),
    cu("hpiFatigue"),
    cu("hpiHeadache"),
    cu("hpiEarPain"),
    cu("hpiSickContacts"),
    cu("hpiRecentTravel"),
    cu("hpiRecentViralExposure"),
    cu("hpiDeniesChestPain"),
    cu("hpiDeniesShortnessOfBreath"),
    cu("hpiDeniesHemoptysis"),
    cu("hpiDeniesWheezing"),
  ];
}

function sharedRos(cu: (key: string) => string) {
  return {
    rosImportantPositives: [
      cu("rosCough"),
      cu("rosCongestion"),
      cu("rosSoreThroat"),
      cu("rosFever"),
      cu("rosFatigue"),
      cu("rosBodyAches"),
      cu("rosRhinorrhea"),
    ],
    rosImportantNegatives: [
      cu("rosDeniesChestPain"),
      cu("rosDeniesShortnessOfBreath"),
      cu("rosDeniesHemoptysis"),
      cu("rosDeniesVomiting"),
    ],
    rosRedFlags: [
      cu("rfRespiratoryDistress"),
      cu("rfHypoxia"),
      cu("rfPersistentHighFever"),
      cu("rfAlteredMentalStatus"),
      cu("rfDehydration"),
    ],
  };
}

function sharedExam(cu: (key: string) => string) {
  return {
    general: [cu("examWellAppearing"), cu("examMildlyIllAppearing"), cu("examNonToxicAppearing")],
    heent: [
      cu("examNasalCongestionPresent"),
      cu("examRhinorrheaPresent"),
      cu("examPosteriorPharyngealErythema"),
      cu("examPostnasalDrainage"),
    ],
    respiratory: [
      cu("examLungsClearBilaterally"),
      cu("examScatteredWheezing"),
      cu("examRhonchiPresent"),
      cu("examNormalRespiratoryEffort"),
      cu("examNoRespiratoryDistress"),
    ],
    cardiovascular: [cu("examRegularRateAndRhythm")],
  };
}

function sharedMdmGoldStandard(cu: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      cu("waViralUpperRespiratoryInfection"),
      cu("waAcuteBronchitis"),
      cu("waViralSyndrome"),
      cu("waUriUnclearEtiology"),
      cu("waLowSuspicionBacterialPneumonia"),
    ],
    mdmDifferentialSynthesis: [
      cu("diffViralUri"),
      cu("diffAcuteBronchitis"),
      cu("diffAllergicRhinitis"),
      cu("diffSinusitis"),
      cu("diffPneumonia"),
      cu("diffInfluenza"),
      cu("diffCovid19"),
      cu("diffAsthmaExacerbation"),
      cu("diffCopdExacerbation"),
      cu("diffSepsis"),
      cu("diffBacterialPneumonia"),
      cu("diffRespiratoryFailure"),
      cu("diffPulmonaryEmbolism"),
    ],
    mdmDataReviewed: [
      cu("mdmChestXrayReviewed"),
      cu("mdmViralTestingReviewed"),
      cu("mdmCbcReviewed"),
      cu("mdmCmpReviewed"),
      cu("mdmRespiratoryPathogenPanelReviewed"),
      cu("mdmPulseOximetryReviewed"),
    ],
    mdmRiskStratification: [
      cu("riskSymptomsConsistentViralIllnessLow"),
      cu("riskReassuringRespiratoryExaminationLow"),
      cu("riskBronchodilatorTreatmentRequiredModerate"),
      cu("riskObservationRequiredModerate"),
      cu("riskHypoxiaPresentHigh"),
      cu("riskAdmissionRecommendedHigh"),
      cu("riskRespiratoryFailureConcernHigh"),
    ],
    mdmClinicalRationale: [
      cu("reasoningSymptomsMostConsistentViralUri"),
      cu("reasoningLowSuspicionPneumonia"),
      cu("reasoningNoEvidenceRespiratoryDistress"),
      cu("reasoningNoEvidenceSepsis"),
    ],
    clinicalImpression: [
      cu("impViralUri"),
      cu("impAcuteBronchitis"),
      cu("impViralSyndrome"),
      cu("impUpperRespiratoryInfection"),
    ],
    mdmPlanSummary: [
      cu("planSupportiveCareDiscussed"),
      cu("planOralHydrationEncouraged"),
      cu("planCoughSuppressantPrescribed"),
      cu("planBronchodilatorPrescribed"),
      cu("planPcpFollowUpRecommended"),
      cu("planReturnPrecautionsDiscussed"),
    ],
  };
}

function sharedReassessment(cu: (key: string) => string) {
  return {
    reassessment: [
      cu("reassessCoughImproved"),
      cu("reassessBreathingImproved"),
      cu("reassessFeverImproved"),
      cu("reassessSymptomsImprovedAfterTreatment"),
      cu("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      cu("dispReturnWorseningBreathing"),
      cu("dispReturnPersistentFever"),
      cu("dispPcpFollowUpRecommended"),
      cu("dispReturnPrecautionsDiscussed"),
    ],
  };
}

function buildCoughUriGoldStandardIntel(cu: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: coughUriHpi(cu),
    ...sharedRos(cu),
    physicalExam: sharedExam(cu),
    ...sharedMdmGoldStandard(cu),
    mdmAdmitObserveDischarge: [cu("dispObservation"), cu("dispAdmission"), cu("dispDischarge")],
    ...sharedReassessment(cu),
  });
}

export function buildCoughComplaintIntel(cu: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildCoughUriGoldStandardIntel(cu);
}

export function buildUriRespiratoryComplaintIntel(
  cu: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildCoughUriGoldStandardIntel(cu);
}

export function buildCoughComplaintV1Intel(cu: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildCoughUriGoldStandardIntel(cu);
}

export function buildUriCongestionComplaintV1Intel(
  cu: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildCoughUriGoldStandardIntel(cu);
}

export function buildChestCongestionComplaintV1Intel(
  cu: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildCoughUriGoldStandardIntel(cu);
}

export function buildFluLikeIllnessComplaintV1Intel(
  cu: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildCoughUriGoldStandardIntel(cu);
}

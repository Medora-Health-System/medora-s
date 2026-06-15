/** ME.2E-R Track C — chart-ready shortness of breath complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function adultSobHpi(sob: (key: string) => string): string[] {
  return [
    sob("hpiShortnessOfBreathBeganToday"),
    sob("hpiShortnessOfBreathBeganOvernight"),
    sob("hpiSuddenOnsetShortnessOfBreath"),
    sob("hpiGradualWorseningShortnessOfBreath"),
    sob("hpiSymptomsSeveralDays"),
    sob("hpiIntermittentShortnessOfBreath"),
    sob("hpiConstantShortnessOfBreath"),
    sob("hpiShortnessOfBreathAtRest"),
    sob("hpiShortnessOfBreathWithExertion"),
    sob("hpiDifficultyTakingDeepBreath"),
    sob("hpiIncreasedWorkOfBreathing"),
    sob("hpiUnableToCatchBreath"),
    sob("hpiWorseningShortnessOfBreath"),
    sob("hpiImprovingShortnessOfBreath"),
    sob("hpiCough"),
    sob("hpiProductiveCough"),
    sob("hpiDryCough"),
    sob("hpiWheezing"),
    sob("hpiChestTightness"),
    sob("hpiOrthopnea"),
    sob("hpiParoxysmalNocturnalDyspnea"),
    sob("hpiIncreasedSputumProduction"),
    sob("hpiHemoptysis"),
    sob("hpiFever"),
    sob("hpiChills"),
    sob("hpiRecentViralIllness"),
    sob("hpiSickContacts"),
    sob("hpiRecentTravel"),
    sob("hpiHistoryOfAsthma"),
    sob("hpiHistoryOfCopd"),
    sob("hpiHistoryOfHeartFailure"),
    sob("hpiHistoryOfPulmonaryEmbolism"),
    sob("hpiHistoryOfDvt"),
    sob("hpiRecentSurgery"),
    sob("hpiProlongedImmobilization"),
    sob("hpiTobaccoUse"),
    sob("hpiDeniesChestPain"),
    sob("hpiDeniesSyncope"),
    sob("hpiDeniesLegSwelling"),
    sob("hpiDeniesHemoptysis"),
    sob("hpiDeniesFever"),
    sob("hpiDeniesRecentTravel"),
  ];
}

function sharedRos(sob: (key: string) => string) {
  return {
    rosImportantPositives: [
      sob("rosShortnessOfBreath"),
      sob("rosCough"),
      sob("rosWheezing"),
      sob("rosChestTightness"),
      sob("rosFever"),
      sob("rosFatigue"),
      sob("rosOrthopnea"),
      sob("rosLegSwelling"),
    ],
    rosImportantNegatives: [
      sob("rosDeniesChestPain"),
      sob("rosDeniesHemoptysis"),
      sob("rosDeniesSyncope"),
      sob("rosDeniesCalfPain"),
      sob("rosDeniesFever"),
    ],
    rosRedFlags: [
      sob("rfRespiratoryDistress"),
      sob("rfCyanosis"),
      sob("rfAlteredMentalStatus"),
      sob("rfSevereShortnessOfBreath"),
      sob("rfHypoxia"),
      sob("rfHemoptysis"),
      sob("rfStridor"),
      sob("rfInabilityToSpeakFullSentences"),
    ],
  };
}

function sharedExam(sob: (key: string) => string) {
  return {
    general: [
      sob("examWellAppearing"),
      sob("examMildRespiratoryDistress"),
      sob("examModerateRespiratoryDistress"),
      sob("examSevereRespiratoryDistress"),
      sob("examNonToxicAppearing"),
      sob("examAlertOriented"),
      sob("examNoFocalNeurologicDeficit"),
    ],
    respiratory: [
      sob("examTachypnea"),
      sob("examNormalRespiratoryEffort"),
      sob("examIncreasedWorkOfBreathing"),
      sob("examDiffuseWheezing"),
      sob("examExpiratoryWheezing"),
      sob("examDiminishedBreathSounds"),
      sob("examCracklesAtLungBases"),
      sob("examRhonchiPresent"),
      sob("examStridorPresent"),
      sob("examNormalOxygenSaturation"),
      sob("examHypoxiaPresent"),
    ],
    cardiovascular: [
      sob("examTachycardiaPresent"),
      sob("examRegularRhythm"),
      sob("examNoLowerExtremityEdema"),
      sob("examBilateralLowerExtremityEdema"),
      sob("examUnilateralLegSwelling"),
    ],
  };
}

function sharedMdmGoldStandard(sob: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      sob("waSuspectedAsthmaExacerbation"),
      sob("waSuspectedCopdExacerbation"),
      sob("waSuspectedViralRespiratoryIllness"),
      sob("waSuspectedPneumonia"),
      sob("waSuspectedHeartFailureExacerbation"),
      sob("waDyspneaUnclearEtiology"),
      sob("waLowSuspicionPulmonaryEmbolism"),
      sob("waLowSuspicionAcuteCoronarySyndrome"),
    ],
    mdmDifferentialSynthesis: [
      sob("diffAsthmaExacerbation"),
      sob("diffCopdExacerbation"),
      sob("diffViralUpperRespiratoryInfection"),
      sob("diffBronchitis"),
      sob("diffPneumonia"),
      sob("diffPulmonaryEmbolism"),
      sob("diffHeartFailureExacerbation"),
      sob("diffAcuteCoronarySyndrome"),
      sob("diffPleuralEffusion"),
      sob("diffRespiratoryFailure"),
      sob("diffMassivePulmonaryEmbolism"),
      sob("diffTensionPneumothorax"),
      sob("diffSepsis"),
      sob("diffAnaphylaxis"),
      sob("diffAcutePulmonaryEdema"),
    ],
    mdmDataReviewed: [
      sob("mdmCbcReviewed"),
      sob("mdmCmpReviewed"),
      sob("mdmTroponinReviewed"),
      sob("mdmBnpReviewed"),
      sob("mdmDimerReviewed"),
      sob("mdmCovidTestingReviewed"),
      sob("mdmInfluenzaTestingReviewed"),
      sob("mdmChestXrayReviewed"),
      sob("mdmCtAngiographyReviewed"),
      sob("mdmEkgReviewed"),
    ],
    mdmRiskStratification: [
      sob("riskReassuringExaminationLow"),
      sob("riskNormalOxygenationLow"),
      sob("riskStableOutpatientManagementLow"),
      sob("riskObservationRequiredModerate"),
      sob("riskMultipleNebulizerTreatmentsModerate"),
      sob("riskSupplementalOxygenRequiredModerate"),
      sob("riskRespiratoryFailureConcernHigh"),
      sob("riskAdmissionRecommendedHigh"),
      sob("riskIcuLevelCareHigh"),
      sob("riskSpecialtyConsultationHigh"),
    ],
    mdmClinicalRationale: [
      sob("reasoningMostConsistentWithAsthmaExacerbation"),
      sob("reasoningMostConsistentWithViralRespiratoryIllness"),
      sob("reasoningLowSuspicionPulmonaryEmbolism"),
      sob("reasoningLowSuspicionAcuteCoronarySyndrome"),
      sob("reasoningNoEvidenceRespiratoryFailure"),
      sob("reasoningNoEvidenceSepsis"),
    ],
    clinicalImpression: [
      sob("impShortnessOfBreath"),
      sob("impAsthmaExacerbation"),
      sob("impCopdExacerbation"),
      sob("impViralRespiratoryIllness"),
      sob("impPneumonia"),
      sob("impHeartFailureExacerbation"),
    ],
    mdmPlanSummary: [
      sob("planAlbuterolAdministered"),
      sob("planBronchodilatorTherapyAdministered"),
      sob("planCorticosteroidsPrescribed"),
      sob("planAntibioticsPrescribed"),
      sob("planSupplementalOxygenAdministered"),
      sob("planReturnPrecautionsDiscussed"),
      sob("planPcpFollowUpRecommended"),
      sob("planPulmonologyFollowUpRecommended"),
      sob("planEdReturnAdvisedForWorseningSymptoms"),
    ],
  };
}

function sharedReassessment(sob: (key: string) => string) {
  return {
    reassessment: [
      sob("reassessShortnessOfBreathImproved"),
      sob("reassessWheezingImproved"),
      sob("reassessImprovedAirMovement"),
      sob("reassessOxygenSaturationImproved"),
      sob("reassessRespiratoryDistressResolved"),
      sob("reassessSymptomsImprovedAfterTreatment"),
      sob("reassessRemainsHemodynamicallyStable"),
      sob("reassessRepeatLungExaminationImproved"),
    ],
    followUpDisposition: [
      sob("dispReturnWorseningBreathing"),
      sob("dispReturnChestPainOrSyncope"),
      sob("dispPcpFollowUpRecommended"),
      sob("dispPulmonologyFollowUpRecommended"),
    ],
  };
}

export function buildAdultSobComplaintIntel(sob: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: adultSobHpi(sob),
    ...sharedRos(sob),
    physicalExam: sharedExam(sob),
    ...sharedMdmGoldStandard(sob),
    mdmAdmitObserveDischarge: [sob("dispObservation"), sob("dispAdmission"), sob("dispDischarge")],
    ...sharedReassessment(sob),
  });
}

export function buildPediatricAsthmaSobComplaintIntel(
  ped: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ped("hpiCaregiverPresent"),
      ped("hpiParentReportsBreathingDifficulty"),
      ped("hpiWheezing"),
      ped("hpiCough"),
      ped("hpiShortnessOfBreathWithExertion"),
      ped("hpiIncreasedWorkOfBreathing"),
      ped("hpiDecreasedActivity"),
      ped("hpiPoorOralIntake"),
      ped("hpiStillDrinkingFluids"),
      ped("hpiFever"),
      ped("hpiDeniesChestPain"),
    ],
    ...sharedRos(ped),
    physicalExam: sharedExam(ped),
    mdmWorkingAssessment: [
      ped("waSuspectedAsthmaExacerbation"),
      ped("waSuspectedViralRespiratoryIllness"),
      ped("waLowSuspicionPulmonaryEmbolism"),
    ],
    mdmDifferentialSynthesis: [
      ped("diffAsthmaExacerbation"),
      ped("diffViralWheezing"),
      ped("diffBronchiolitis"),
      ped("diffPneumonia"),
      ped("diffForeignBodyAspiration"),
      ped("diffRespiratoryFailure"),
      ped("diffAnaphylaxis"),
    ],
    mdmDataReviewed: [ped("mdmChestXrayReviewed"), ped("mdmInfluenzaTestingReviewed")],
    mdmRiskStratification: [
      ped("riskReassuringExaminationLow"),
      ped("riskSupplementalOxygenRequiredModerate"),
      ped("riskRespiratoryFailureConcernHigh"),
    ],
    mdmClinicalRationale: [
      ped("reasoningMostConsistentWithAsthmaExacerbation"),
      ped("reasoningNoEvidenceRespiratoryFailure"),
    ],
    clinicalImpression: [ped("impAsthmaExacerbation"), ped("impShortnessOfBreath")],
    mdmPlanSummary: [
      ped("planBronchodilatorTherapyAdministered"),
      ped("planSupplementalOxygenAdministered"),
      ped("planReturnPrecautionsDiscussed"),
    ],
    mdmAdmitObserveDischarge: [ped("dispObservation"), ped("dispAdmission"), ped("dispDischarge")],
    ...sharedReassessment(ped),
  });
}

export function buildAsthmaWheezingComplaintV1Intel(
  sob: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildAdultSobComplaintIntel(sob);
}

export function buildCopdExacerbationComplaintV1Intel(
  sob: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      sob("hpiShortnessOfBreathBeganToday"),
      sob("hpiWorseningShortnessOfBreath"),
      sob("hpiIncreasedWorkOfBreathing"),
      sob("hpiProductiveCough"),
      sob("hpiIncreasedSputumProduction"),
      sob("hpiWheezing"),
      sob("hpiHistoryOfCopd"),
      sob("hpiTobaccoUse"),
      sob("hpiFever"),
      sob("hpiDeniesChestPain"),
    ],
    ...sharedRos(sob),
    physicalExam: sharedExam(sob),
    mdmWorkingAssessment: [
      sob("waSuspectedCopdExacerbation"),
      sob("waSuspectedPneumonia"),
      sob("waLowSuspicionPulmonaryEmbolism"),
    ],
    mdmDifferentialSynthesis: [
      sob("diffCopdExacerbation"),
      sob("diffPneumonia"),
      sob("diffHeartFailureExacerbation"),
      sob("diffPulmonaryEmbolism"),
      sob("diffAcuteCoronarySyndrome"),
      sob("diffRespiratoryFailure"),
      sob("diffSepsis"),
    ],
    mdmDataReviewed: [
      sob("mdmChestXrayReviewed"),
      sob("mdmCmpReviewed"),
      sob("mdmEkgReviewed"),
    ],
    mdmRiskStratification: [
      sob("riskSupplementalOxygenRequiredModerate"),
      sob("riskObservationRequiredModerate"),
      sob("riskAdmissionRecommendedHigh"),
      sob("riskRespiratoryFailureConcernHigh"),
    ],
    mdmClinicalRationale: [
      sob("reasoningMostConsistentWithViralRespiratoryIllness"),
      sob("reasoningLowSuspicionPulmonaryEmbolism"),
      sob("reasoningNoEvidenceRespiratoryFailure"),
    ],
    clinicalImpression: [sob("impCopdExacerbation"), sob("impShortnessOfBreath")],
    mdmPlanSummary: [
      sob("planBronchodilatorTherapyAdministered"),
      sob("planSupplementalOxygenAdministered"),
      sob("planCorticosteroidsPrescribed"),
      sob("planReturnPrecautionsDiscussed"),
    ],
    mdmAdmitObserveDischarge: [sob("dispObservation"), sob("dispAdmission"), sob("dispDischarge")],
    ...sharedReassessment(sob),
  });
}

export function buildPneumoniaSymptomsComplaintV1Intel(
  sob: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      sob("hpiShortnessOfBreathBeganToday"),
      sob("hpiProductiveCough"),
      sob("hpiFever"),
      sob("hpiChills"),
      sob("hpiWorseningShortnessOfBreath"),
      sob("hpiChestTightness"),
      sob("hpiDeniesHemoptysis"),
    ],
    ...sharedRos(sob),
    physicalExam: sharedExam(sob),
    mdmWorkingAssessment: [sob("waSuspectedPneumonia"), sob("waSuspectedViralRespiratoryIllness")],
    mdmDifferentialSynthesis: [
      sob("diffPneumonia"),
      sob("diffBronchitis"),
      sob("diffViralUpperRespiratoryInfection"),
      sob("diffHeartFailureExacerbation"),
      sob("diffPulmonaryEmbolism"),
      sob("diffSepsis"),
      sob("diffRespiratoryFailure"),
    ],
    mdmDataReviewed: [sob("mdmChestXrayReviewed"), sob("mdmCbcReviewed"), sob("mdmCmpReviewed")],
    mdmRiskStratification: [
      sob("riskObservationRequiredModerate"),
      sob("riskAdmissionRecommendedHigh"),
      sob("riskRespiratoryFailureConcernHigh"),
    ],
    mdmClinicalRationale: [sob("reasoningNoEvidenceSepsis"), sob("reasoningNoEvidenceRespiratoryFailure")],
    clinicalImpression: [sob("impPneumonia"), sob("impShortnessOfBreath")],
    mdmPlanSummary: [
      sob("planAntibioticsPrescribed"),
      sob("planSupplementalOxygenAdministered"),
      sob("planReturnPrecautionsDiscussed"),
    ],
    mdmAdmitObserveDischarge: [sob("dispObservation"), sob("dispAdmission"), sob("dispDischarge")],
    ...sharedReassessment(sob),
  });
}

export function buildHemoptysisComplaintV1Intel(
  sob: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      sob("hpiHemoptysis"),
      sob("hpiShortnessOfBreathBeganToday"),
      sob("hpiWorseningShortnessOfBreath"),
      sob("hpiCough"),
      sob("hpiChestTightness"),
      sob("hpiFever"),
      sob("hpiDeniesChestPain"),
    ],
    ...sharedRos(sob),
    physicalExam: sharedExam(sob),
    mdmWorkingAssessment: [sob("waDyspneaUnclearEtiology"), sob("waSuspectedPneumonia")],
    mdmDifferentialSynthesis: [
      sob("diffPneumonia"),
      sob("diffBronchitis"),
      sob("diffPulmonaryEmbolism"),
      sob("diffMassivePulmonaryEmbolism"),
      sob("diffRespiratoryFailure"),
      sob("diffSepsis"),
    ],
    mdmDataReviewed: [sob("mdmChestXrayReviewed"), sob("mdmCtAngiographyReviewed"), sob("mdmCbcReviewed")],
    mdmRiskStratification: [
      sob("riskObservationRequiredModerate"),
      sob("riskAdmissionRecommendedHigh"),
      sob("riskRespiratoryFailureConcernHigh"),
    ],
    mdmClinicalRationale: [sob("reasoningLowSuspicionPulmonaryEmbolism")],
    clinicalImpression: [sob("impShortnessOfBreath"), sob("impPneumonia")],
    mdmPlanSummary: [
      sob("planSupplementalOxygenAdministered"),
      sob("planReturnPrecautionsDiscussed"),
      sob("planEdReturnAdvisedForWorseningSymptoms"),
    ],
    mdmAdmitObserveDischarge: [sob("dispObservation"), sob("dispAdmission"), sob("dispDischarge")],
    ...sharedReassessment(sob),
  });
}

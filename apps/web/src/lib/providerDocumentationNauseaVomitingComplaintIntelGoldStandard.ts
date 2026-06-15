/** ME.2C-R Track C — chart-ready nausea / vomiting complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function adultHpi(nv: (key: string) => string): string[] {
  return [
    nv("hpiBeganToday"),
    nv("hpiBeganThisMorning"),
    nv("hpiBeganOvernight"),
    nv("hpiSuddenOnset"),
    nv("hpiGradualOnset"),
    nv("hpiSymptomsSeveralDays"),
    nv("hpiRecurrentSymptoms"),
    nv("hpiIntermittentSymptoms"),
    nv("hpiSingleEpisodeVomiting"),
    nv("hpiMultipleEpisodesVomiting"),
    nv("hpiPersistentVomiting"),
    nv("hpiNonBloodyEmesis"),
    nv("hpiBiliousEmesis"),
    nv("hpiDryHeaving"),
    nv("hpiUnableToKeepFoodDown"),
    nv("hpiUnableToKeepLiquidsDown"),
    nv("hpiSymptomsImproving"),
    nv("hpiSymptomsWorsening"),
    nv("hpiNausea"),
    nv("hpiDiarrhea"),
    nv("hpiAbdominalPain"),
    nv("hpiAbdominalCramping"),
    nv("hpiBloating"),
    nv("hpiConstipation"),
    nv("hpiDecreasedAppetite"),
    nv("hpiToleratingOralIntake"),
    nv("hpiDecreasedOralIntake"),
    nv("hpiUnableToTolerateOralIntake"),
    nv("hpiNormalUrineOutput"),
    nv("hpiDecreasedUrineOutput"),
    nv("hpiConcernForDehydration"),
    nv("hpiSickContactsAtHome"),
    nv("hpiRecentTravel"),
    nv("hpiQuestionableFoodExposure"),
    nv("hpiRecentRestaurantMeal"),
    nv("hpiRecentViralIllness"),
    nv("hpiDeniesFever"),
    nv("hpiDeniesAbdominalPain"),
    nv("hpiDeniesDiarrhea"),
    nv("hpiDeniesBloodInEmesis"),
    nv("hpiDeniesBloodyStool"),
    nv("hpiDeniesMelena"),
    nv("hpiDeniesUrinarySymptoms"),
    nv("hpiDeniesChestPain"),
    nv("hpiDeniesShortnessOfBreath"),
  ];
}

function sharedRos(nv: (key: string) => string) {
  return {
    rosImportantPositives: [
      nv("rosNausea"),
      nv("rosVomiting"),
      nv("rosDiarrhea"),
      nv("rosAbdominalPain"),
      nv("rosDizziness"),
      nv("rosWeakness"),
      nv("rosFever"),
      nv("rosDecreasedOralIntake"),
    ],
    rosImportantNegatives: [
      nv("rosDeniesHematemesis"),
      nv("rosDeniesBloodyStool"),
      nv("rosDeniesMelena"),
      nv("rosDeniesSyncope"),
      nv("rosDeniesSevereAbdominalPain"),
      nv("rosDeniesRash"),
      nv("rosDeniesUrinaryComplaints"),
    ],
    rosRedFlags: [
      nv("rfSevereAbdominalPain"),
      nv("rfPersistentVomiting"),
      nv("rfUnableToTolerateOralIntake"),
      nv("rfDehydrationConcern"),
      nv("rfAlteredMentalStatus"),
      nv("rfSyncope"),
      nv("rfBiliousEmesis"),
      nv("rfBloodyEmesis"),
      nv("rfBloodyStool"),
    ],
  };
}

function sharedExam(nv: (key: string) => string) {
  return {
    general: [
      nv("examWellAppearing"),
      nv("examMildlyIllAppearing"),
      nv("examUncomfortableAppearing"),
      nv("examNonToxicAppearing"),
      nv("examActivelyVomiting"),
      nv("examAppearsDehydrated"),
    ],
    heent: [
      nv("examMoistMucousMembranes"),
      nv("examMildlyDryMucousMembranes"),
      nv("examDryMucousMembranes"),
      nv("examCapillaryRefillNormal"),
      nv("examCapillaryRefillDelayed"),
    ],
    abdomen: [
      nv("examMildDiffuseTenderness"),
      nv("examEpigastricTenderness"),
      nv("examGeneralizedAbdominalTenderness"),
      nv("examMildAbdominalDistention"),
      nv("examHyperactiveBowelSounds"),
      nv("examAbdomenSoft"),
      nv("examNonTenderAbdomen"),
      nv("examNoReboundTenderness"),
      nv("examNoGuarding"),
      nv("examNoRigidity"),
      nv("examNoFocalPeritonealSigns"),
    ],
    neuroPsych: [
      nv("examAlertOriented"),
      nv("examAgeAppropriateBehavior"),
      nv("examNoFocalNeurologicDeficit"),
    ],
  };
}

function sharedMdmGoldStandard(nv: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      nv("waSuspectedViralGastroenteritis"),
      nv("waSuspectedFoodborneIllness"),
      nv("waMildDehydration"),
      nv("waNauseaVomitingUnclearEtiology"),
      nv("waLowSuspicionSurgicalAbdomen"),
      nv("waLowSuspicionBowelObstruction"),
      nv("waLowSuspicionAppendicitis"),
      nv("waLowSuspicionIntracranialProcess"),
    ],
    mdmDifferentialSynthesis: [
      nv("diffGastroenteritis"),
      nv("diffFoodPoisoning"),
      nv("diffGastritis"),
      nv("diffGerd"),
      nv("diffAppendicitis"),
      nv("diffBowelObstruction"),
      nv("diffCholecystitis"),
      nv("diffPancreatitis"),
      nv("diffPregnancyRelatedNausea"),
      nv("diffDiabeticKetoacidosis"),
      nv("diffSepsis"),
      nv("diffSevereDehydration"),
      nv("diffIntracranialProcess"),
      nv("diffPregnancyComplication"),
    ],
    mdmDataReviewed: [
      nv("mdmCbcReviewed"),
      nv("mdmCmpReviewed"),
      nv("mdmLipaseReviewed"),
      nv("mdmUrinalysisReviewed"),
      nv("mdmPregnancyTestReviewed"),
      nv("mdmCtAbdomenPelvisReviewed"),
    ],
    mdmRiskStratification: [
      nv("riskSelfLimitedIllnessLow"),
      nv("riskReassuringAbdominalExamLow"),
      nv("riskToleratingOralIntakeLow"),
      nv("riskNoSevereDehydrationLow"),
      nv("riskIvFluidsRequiredModerate"),
      nv("riskAntiemeticAdministeredModerate"),
      nv("riskObservationRequiredModerate"),
      nv("riskSurgicalAbdomenConcernHigh"),
      nv("riskBowelObstructionConcernHigh"),
      nv("riskAdmissionRecommendedHigh"),
      nv("riskSpecialtyConsultationHigh"),
    ],
    mdmClinicalRationale: [
      nv("reasoningMostConsistentWithViralGastroenteritis"),
      nv("reasoningLowSuspicionAppendicitis"),
      nv("reasoningLowSuspicionBowelObstruction"),
      nv("reasoningLowSuspicionIntracranialProcess"),
    ],
    clinicalImpression: [
      nv("impViralGastroenteritis"),
      nv("impNauseaAndVomiting"),
      nv("impMildDehydration"),
      nv("impFoodborneIllness"),
      nv("impGastritis"),
      nv("impGastroenteritisWithDehydration"),
    ],
    mdmPlanSummary: [
      nv("planIvFluidsAdministered"),
      nv("planOndansetronPrescribed"),
      nv("planOralHydrationEncouraged"),
      nv("planBratDietDiscussed"),
      nv("planReturnPrecautionsDiscussed"),
      nv("planPcpFollowUpRecommended"),
      nv("planEdReturnAdvisedForWorseningSymptoms"),
    ],
  };
}

function sharedReassessment(nv: (key: string) => string) {
  return {
    reassessment: [
      nv("reassessSymptomsImprovedAfterTreatment"),
      nv("reassessNauseaImproved"),
      nv("reassessVomitingResolved"),
      nv("reassessToleratingOralChallenge"),
      nv("reassessSuccessfullyToleratedPoChallenge"),
      nv("reassessAbdominalPainImproved"),
      nv("reassessHydrationStatusImproved"),
      nv("reassessRepeatAbdominalExamBenign"),
      nv("reassessRemainsHemodynamicallyStable"),
      nv("reassessNoAdditionalVomitingObserved"),
    ],
    followUpDisposition: [
      nv("dispReturnPersistentVomiting"),
      nv("dispReturnSevereAbdominalPain"),
      nv("dispReturnBloodInVomitOrStool"),
      nv("dispReturnInabilityToTolerateOralIntake"),
      nv("dispPcpFollowUpRecommended"),
    ],
  };
}

export function buildAdultNauseaVomitingComplaintIntel(nv: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: adultHpi(nv),
    ...sharedRos(nv),
    physicalExam: sharedExam(nv),
    ...sharedMdmGoldStandard(nv),
    mdmAdmitObserveDischarge: [nv("dispObservation"), nv("dispAdmission"), nv("dispDischarge")],
    ...sharedReassessment(nv),
  });
}

export function buildPediatricNauseaVomitingComplaintIntel(
  ped: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ped("hpiCaregiverPresent"),
      ped("hpiParentReportsVomiting"),
      ped("hpiBeganToday"),
      ped("hpiMultipleEpisodesVomiting"),
      ped("hpiUnableToTolerateOralIntake"),
      ped("hpiDiarrhea"),
      ped("hpiFever"),
      ped("hpiDecreasedActivity"),
      ped("hpiStillMakingWetDiapers"),
      ped("hpiDecreasedWetDiapers"),
      ped("hpiToleratingSomeFluids"),
      ped("hpiRefusingOralIntake"),
      ped("hpiConcernForDehydration"),
      ped("hpiSickContactsAtHome"),
      ped("hpiBiliousEmesis"),
      ped("hpiDeniesBloodyStool"),
    ],
    ...sharedRos(ped),
    physicalExam: sharedExam(ped),
    ...sharedMdmGoldStandard(ped),
    mdmAdmitObserveDischarge: [ped("dispObservation"), ped("dispAdmission"), ped("dispDischarge")],
    ...sharedReassessment(ped),
  });
}

export function buildNauseaVomitingComplaintV1Intel(nv: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildAdultNauseaVomitingComplaintIntel(nv);
}

export function buildNauseaVomitingMetabolicComplaintV1Intel(
  nv: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      nv("hpiBeganToday"),
      nv("hpiMultipleEpisodesVomiting"),
      nv("hpiUnableToTolerateOralIntake"),
      nv("hpiAbdominalPain"),
      nv("hpiConcernForDehydration"),
      nv("hpiDiabetesHistory"),
      nv("hpiPregnancyPossibility"),
      nv("hpiMedicationExposure"),
    ],
    ...sharedRos(nv),
    physicalExam: sharedExam(nv),
    mdmWorkingAssessment: [
      nv("waSuspectedViralGastroenteritis"),
      nv("waMildDehydration"),
      nv("waLowSuspicionSurgicalAbdomen"),
      nv("waMetabolicDerangementSuspected"),
    ],
    mdmDifferentialSynthesis: [
      nv("diffGastroenteritis"),
      nv("diffFoodPoisoning"),
      nv("diffGastritis"),
      nv("diffDiabeticKetoacidosis"),
      nv("diffElectrolyteAbnormality"),
      nv("diffBowelObstruction"),
      nv("diffAppendicitis"),
      nv("diffSepsis"),
      nv("diffSevereDehydration"),
      nv("diffPregnancyComplication"),
      nv("diffIntracranialProcess"),
    ],
    mdmDataReviewed: [
      nv("mdmCbcReviewed"),
      nv("mdmCmpReviewed"),
      nv("mdmGlucoseReviewed"),
      nv("mdmUrinalysisReviewed"),
      nv("mdmPregnancyTestReviewed"),
      nv("mdmCtAbdomenPelvisReviewed"),
    ],
    mdmRiskStratification: [
      nv("riskSelfLimitedIllnessLow"),
      nv("riskIvFluidsRequiredModerate"),
      nv("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      nv("reasoningMostConsistentWithViralGastroenteritis"),
      nv("reasoningLowSuspicionDka"),
      nv("reasoningLowSuspicionBowelObstruction"),
    ],
    clinicalImpression: [
      nv("impNauseaAndVomiting"),
      nv("impMildDehydration"),
      nv("impViralGastroenteritis"),
    ],
    mdmPlanSummary: [
      nv("planIvFluidsAdministered"),
      nv("planOndansetronPrescribed"),
      nv("planOralHydrationEncouraged"),
      nv("planReturnPrecautionsDiscussed"),
      nv("planEdReturnAdvisedForWorseningSymptoms"),
    ],
    mdmAdmitObserveDischarge: [nv("dispObservation"), nv("dispAdmission"), nv("dispDischarge")],
    ...sharedReassessment(nv),
  });
}

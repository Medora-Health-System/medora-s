/** ME.2B-R Track C — chart-ready diarrhea complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function onsetTimingHpi(d: (key: string) => string): string[] {
  return [
    d("hpiDiarrheaBeganToday"),
    d("hpiDiarrheaBeganThisMorning"),
    d("hpiDiarrheaBeganOvernight"),
    d("hpiSymptomsSeveralDays"),
    d("hpiSuddenOnsetDiarrhea"),
    d("hpiGradualOnsetDiarrhea"),
    d("hpiIntermittentDiarrhea"),
    d("hpiWorseningDiarrhea"),
    d("hpiImprovingDiarrhea"),
  ];
}

function stoolCharacteristicsHpi(d: (key: string) => string): string[] {
  return [
    d("hpiLooseStools"),
    d("hpiWateryDiarrhea"),
    d("hpiFrequentDiarrhea"),
    d("hpiMultipleEpisodesDiarrhea"),
    d("hpiPersistentDiarrhea"),
    d("hpiMucusInStool"),
    d("hpiBloodInStool"),
    d("hpiBlackStool"),
    d("hpiFoulSmellingStool"),
  ];
}

function associatedGiHpi(d: (key: string) => string): string[] {
  return [
    d("hpiAbdominalCramping"),
    d("hpiAbdominalPain"),
    d("hpiNausea"),
    d("hpiVomiting"),
    d("hpiBloating"),
    d("hpiDecreasedAppetite"),
    d("hpiRectalUrgency"),
  ];
}

function hydrationIntakeHpi(d: (key: string) => string): string[] {
  return [
    d("hpiToleratingOralIntake"),
    d("hpiDecreasedOralIntake"),
    d("hpiUnableToTolerateOralIntake"),
    d("hpiNormalUrineOutput"),
    d("hpiDecreasedUrineOutput"),
    d("hpiConcernForDehydration"),
  ];
}

function exposureRiskHpi(d: (key: string) => string): string[] {
  return [
    d("hpiSickContacts"),
    d("hpiRecentTravel"),
    d("hpiQuestionableFoodExposure"),
    d("hpiRecentRestaurantMeal"),
    d("hpiRecentAntibioticUse"),
    d("hpiRecentHospitalization"),
    d("hpiCDifficileExposure"),
    d("hpiImmunocompromisedHistory"),
  ];
}

function importantNegativesHpi(d: (key: string) => string): string[] {
  return [
    d("hpiDeniesFever"),
    d("hpiDeniesVomiting"),
    d("hpiDeniesAbdominalPain"),
    d("hpiDeniesBloodInStool"),
    d("hpiDeniesBlackStool"),
    d("hpiDeniesRecentAntibiotics"),
    d("hpiDeniesRecentTravel"),
    d("hpiDeniesUrinarySymptoms"),
  ];
}

function pediatricHpi(d: (key: string) => string): string[] {
  return [
    d("hpiCaregiverPresent"),
    d("hpiParentReportsDiarrhea"),
    d("hpiDecreasedActivity"),
    d("hpiStillMakingWetDiapers"),
    d("hpiDecreasedWetDiapers"),
    d("hpiToleratingSomeFluids"),
    d("hpiRefusingOralIntake"),
  ];
}

function diarrheaRos(d: (key: string) => string) {
  return {
    rosImportantPositives: [
      d("rosDiarrhea"),
      d("rosAbdominalCramping"),
      d("rosAbdominalPain"),
      d("rosNausea"),
      d("rosVomiting"),
      d("rosFever"),
      d("rosChills"),
      d("rosDecreasedOralIntake"),
      d("rosDizziness"),
      d("rosWeakness"),
    ],
    rosImportantNegatives: [
      d("rosDeniesVomiting"),
      d("rosDeniesFever"),
      d("rosDeniesSevereAbdominalPain"),
      d("rosDeniesBloodInStool"),
      d("rosDeniesBlackStool"),
      d("rosDeniesSyncope"),
      d("rosDeniesUrinaryComplaints"),
    ],
    rosRedFlags: [
      d("rfBloodyDiarrhea"),
      d("rfMelena"),
      d("rfSevereAbdominalPain"),
      d("rfPersistentVomiting"),
      d("rfDehydrationConcern"),
      d("rfAlteredMentalStatus"),
      d("rfSyncope"),
      d("rfFeverWithDiarrhea"),
      d("rfImmunocompromisedDiarrhea"),
      d("rfCDifficileConcern"),
    ],
  };
}

function diarrheaExam(d: (key: string) => string) {
  return {
    general: [
      d("examWellAppearing"),
      d("examMildlyIllAppearing"),
      d("examUncomfortableAppearing"),
      d("examNonToxicAppearing"),
      d("examAppearsDehydrated"),
      d("examAlertAndOriented"),
      d("examAgeAppropriateBehavior"),
      d("examNoFocalNeurologicDeficit"),
    ],
    heent: [
      d("examMoistMucousMembranes"),
      d("examMildlyDryMucousMembranes"),
      d("examDryMucousMembranes"),
      d("examCapillaryRefillNormal"),
      d("examCapillaryRefillDelayed"),
    ],
    abdomen: [
      d("examAbdomenSoft"),
      d("examNonTenderAbdomen"),
      d("examMildDiffuseTenderness"),
      d("examGeneralizedAbdominalTenderness"),
      d("examHyperactiveBowelSounds"),
      d("examMildAbdominalDistention"),
      d("examNoGuarding"),
      d("examNoReboundTenderness"),
      d("examNoRigidity"),
      d("examNoFocalPeritonealSigns"),
    ],
  };
}

function diarrheaMdmCannotMiss(d: (key: string) => string): string[] {
  return [
    d("diffToxicMegacolon"),
    d("diffIschemicColitis"),
    d("diffSepsis"),
    d("diffSevereDehydration"),
    d("diffHemolyticUremicSyndrome"),
    d("diffAppendicitis"),
    d("diffBowelObstruction"),
  ];
}

function diarrheaMdmFull(d: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      d("waSuspectedViralGastroenteritis"),
      d("waSuspectedFoodborneIllness"),
      d("waDiarrheaUnclearEtiology"),
      d("waMildDehydration"),
      d("waLowSuspicionSurgicalAbdomen"),
      d("waConcernForInfectiousColitis"),
      d("waConcernForCDifficileColitis"),
    ],
    mdmDifferentialSynthesis: [
      d("diffViralGastroenteritis"),
      d("diffFoodborneIllness"),
      d("diffMedicationRelatedDiarrhea"),
      d("diffAntibioticAssociatedDiarrhea"),
      d("diffIrritableBowelSyndrome"),
      d("diffInfectiousColitis"),
      d("diffCDifficileColitis"),
      d("diffInflammatoryBowelDiseaseFlare"),
      d("diffDiverticulitis"),
      d("diffDehydration"),
      ...diarrheaMdmCannotMiss(d),
    ],
    mdmDataReviewed: [
      d("mdmCbcReviewed"),
      d("mdmCmpReviewed"),
      d("mdmStoolStudiesReviewed"),
      d("mdmCDifficileTestingReviewed"),
      d("mdmUrinalysisReviewed"),
      d("mdmPregnancyTestReviewed"),
      d("mdmCtAbdomenPelvisReviewed"),
    ],
    mdmRiskStratification: [
      d("riskSelfLimitedIllnessLow"),
      d("riskReassuringAbdominalExamLow"),
      d("riskToleratingOralIntakeLow"),
      d("riskNoSevereDehydrationLow"),
      d("riskIvFluidsAdministeredModerate"),
      d("riskAntiemeticTherapyModerate"),
      d("riskStoolTestingObtainedModerate"),
      d("riskObservationRequiredModerate"),
      d("riskSevereDehydrationConcernHigh"),
      d("riskBloodyDiarrheaConcernHigh"),
      d("riskToxicMegacolonConcernHigh"),
      d("riskSepsisConcernHigh"),
      d("riskAdmissionRecommendedHigh"),
      d("riskGiConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      d("reasoningMostConsistentViralGastroenteritis"),
      d("reasoningLowSuspicionSurgicalAbdomen"),
      d("reasoningNoPeritonealSigns"),
      d("reasoningLowSuspicionCDifficileColitis"),
      d("reasoningNoSevereDehydration"),
      d("reasoningOutpatientManagementAppropriate"),
    ],
    clinicalImpression: [
      d("impDiarrhea"),
      d("impViralGastroenteritis"),
      d("impFoodborneIllness"),
      d("impMildDehydration"),
      d("impInfectiousColitis"),
      d("impGastroenteritisWithDehydration"),
    ],
    mdmPlanSummary: [
      d("planOralHydrationEncouraged"),
      d("planIvFluidsAdministered"),
      d("planAntiemeticPrescribed"),
      d("planStoolTestingOrdered"),
      d("planBratDietDiscussed"),
      d("planAntibioticsPrescribedWhenIndicated"),
      d("planPcpFollowUpRecommended"),
      d("planGiFollowUpRecommended"),
      d("planReturnPrecautionsDiscussed"),
      d("planEdReturnAdvisedWorseningSymptoms"),
    ],
  };
}

function diarrheaReassessment(d: (key: string) => string) {
  return {
    reassessment: [
      d("reassessDiarrheaImproved"),
      d("reassessAbdominalCrampingImproved"),
      d("reassessNauseaImproved"),
      d("reassessVomitingResolved"),
      d("reassessToleratingOralIntake"),
      d("reassessHydrationStatusImproved"),
      d("reassessRepeatAbdominalExamBenign"),
      d("reassessRemainsHemodynamicallyStable"),
      d("reassessNoAdditionalDiarrheaObserved"),
      d("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [
      d("dispReturnBloodyStool"),
      d("dispReturnWorseningAbdominalPain"),
      d("dispReturnDehydrationSymptoms"),
      d("dispReturnPersistentVomiting"),
      d("dispPcpFollowUpRecommended"),
      d("dispDischargeHydrationInstructions"),
    ],
  };
}

function adultDiarrheaHpi(d: (key: string) => string): string[] {
  return [
    ...onsetTimingHpi(d),
    ...stoolCharacteristicsHpi(d),
    ...associatedGiHpi(d),
    ...hydrationIntakeHpi(d),
    ...exposureRiskHpi(d),
    ...importantNegativesHpi(d),
  ];
}

export function buildAdultDiarrheaComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: adultDiarrheaHpi(d),
    ...diarrheaRos(d),
    physicalExam: diarrheaExam(d),
    ...diarrheaMdmFull(d),
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    ...diarrheaReassessment(d),
  });
}

export function buildPediatricDiarrheaComplaintIntel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...onsetTimingHpi(d),
      ...stoolCharacteristicsHpi(d),
      ...associatedGiHpi(d),
      ...hydrationIntakeHpi(d),
      ...exposureRiskHpi(d),
      ...importantNegativesHpi(d),
      ...pediatricHpi(d),
    ],
    ...diarrheaRos(d),
    physicalExam: diarrheaExam(d),
    ...diarrheaMdmFull(d),
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    ...diarrheaReassessment(d),
  });
}

export function buildDiarrheaComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildAdultDiarrheaComplaintIntel(d);
}

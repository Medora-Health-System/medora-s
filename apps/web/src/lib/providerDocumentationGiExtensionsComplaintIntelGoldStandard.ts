/** ME.2AA-R Track C — chart-ready GI extensions complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

const constipation = (key: string) => `providerDocumentationComplaintIntel.constipationComplaintV1.${key}`;
const giBleed = (key: string) => `providerDocumentationComplaintIntel.giBleedComplaintV1.${key}`;
const hernia = (key: string) => `providerDocumentationComplaintIntel.herniaComplaintV1.${key}`;
const rectalPain = (key: string) => `providerDocumentationComplaintIntel.rectalPainComplaintV1.${key}`;
const dysphagia = (key: string) => `providerDocumentationComplaintIntel.dysphagiaComplaintV1.${key}`;

function giSharedMdmDataReviewed(d: (key: string) => string): string[] {
  return [
    d("mdmCbcReviewed"),
    d("mdmCmpReviewed"),
    d("mdmLipaseReviewed"),
    d("mdmLiverEnzymesReviewed"),
    d("mdmBilirubinReviewed"),
    d("mdmCoagulationStudiesReviewed"),
    d("mdmHemoglobinReviewed"),
    d("mdmCtAbdomenPelvisReviewed"),
    d("mdmAbdominalUltrasoundReviewed"),
    d("mdmStoolTestingReviewed"),
  ];
}

export function buildConstipationComplaintV1Intel(
  constipationFn: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      constipationFn("hpiConstipationForFourDays"),
      constipationFn("hpiNoBowelMovementSeveralDays"),
      constipationFn("hpiHardStools"),
      constipationFn("hpiStrainingWithBowelMovements"),
      constipationFn("hpiDecreasedBowelFrequency"),
      constipationFn("hpiAbdominalBloating"),
      constipationFn("hpiAbdominalCramping"),
      constipationFn("hpiNausea"),
      constipationFn("hpiVomiting"),
      constipationFn("hpiPassingFlatus"),
      constipationFn("hpiDeniesVomiting"),
      constipationFn("hpiDeniesAbdominalPain"),
      constipationFn("hpiDeniesRectalBleeding"),
      constipationFn("hpiOpioidUse"),
      constipationFn("hpiRecentSurgery"),
      constipationFn("hpiPriorConstipationHistory"),
      constipationFn("hpiLaxativeUse"),
      constipationFn("hpiSymptomsWorsening"),
    ],
    rosImportantPositives: [
      constipationFn("rosConstipation"),
      constipationFn("rosAbdominalBloating"),
      constipationFn("rosAbdominalCramping"),
      constipationFn("rosNausea"),
      constipationFn("rosVomiting"),
    ],
    rosImportantNegatives: [
      constipationFn("rosDeniesFever"),
      constipationFn("rosDeniesRectalBleeding"),
      constipationFn("rosDeniesSevereAbdominalPain"),
      constipationFn("rosDeniesChestPain"),
    ],
    rosRedFlags: [
      constipationFn("rfObstructionConcern"),
      constipationFn("rfRectalBleeding"),
      constipationFn("rfPersistentVomiting"),
      constipationFn("rfSevereAbdominalDistension"),
    ],
    physicalExam: {
      general: [
        constipationFn("examNoAcuteDistress"),
        constipationFn("examWellAppearing"),
        constipationFn("examMildlyUncomfortable"),
        constipationFn("examAppearsDehydrated"),
      ],
      abdomen: [
        constipationFn("examAbdomenSoftNonTender"),
        constipationFn("examMildAbdominalDistention"),
        constipationFn("examHypoactiveBowelSounds"),
        constipationFn("examNoGuarding"),
        constipationFn("examNoReboundTenderness"),
        constipationFn("examRectalExamPerformed"),
      ],
    },
    mdmWorkingAssessment: [
      constipationFn("waConstipationPresentation"),
      constipationFn("waFunctionalConstipationLikely"),
      constipationFn("waLowSuspicionBowelObstruction"),
      constipationFn("waConcernForImpaction"),
      constipationFn("waLowSuspicionSurgicalAbdomen"),
    ],
    mdmDifferentialSynthesis: [
      constipationFn("diffFunctionalConstipation"),
      constipationFn("diffHemorrhoids"),
      constipationFn("diffBowelObstruction"),
      constipationFn("diffPerforatedViscus"),
      constipationFn("diffAppendicitis"),
      constipationFn("diffActiveGiBleeding"),
      constipationFn("diffIschemicBowel"),
      constipationFn("diffSepsis"),
    ],
    mdmDataReviewed: giSharedMdmDataReviewed(constipationFn),
    mdmRiskStratification: [
      constipationFn("riskMildConstipationLow"),
      constipationFn("riskStableVitalsLow"),
      constipationFn("riskModerateConstipationModerate"),
      constipationFn("riskObstructionConcernModerate"),
      constipationFn("riskSurgicalAbdomenConcernHigh"),
      constipationFn("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      constipationFn("reasoningLowSuspicionBowelObstruction"),
      constipationFn("reasoningImagingForObstructionConcern"),
      constipationFn("reasoningLaxativesAndBowelRegimen"),
      constipationFn("reasoningOutpatientManagementAppropriate"),
    ],
    clinicalImpression: [
      constipationFn("impConstipation"),
      constipationFn("impFunctionalConstipation"),
      constipationFn("impFecalImpaction"),
      constipationFn("impConstipationUnclearEtiology"),
    ],
    mdmPlanSummary: [
      constipationFn("planLaxativesPrescribed"),
      constipationFn("planEnemaAdministered"),
      constipationFn("planBowelRegimenCounseling"),
      constipationFn("planDisimpactionPerformed"),
      constipationFn("planAdmissionArranged"),
    ],
    reassessment: [
      constipationFn("reassessBowelMovementAfterTreatment"),
      constipationFn("reassessAbdominalDistentionImproved"),
      constipationFn("reassessToleratingOralIntake"),
      constipationFn("reassessRepeatAbdominalExamBenign"),
    ],
    followUpDisposition: [
      constipationFn("dispDischargedHome"),
      constipationFn("dispPcpFollowUpArranged"),
      constipationFn("dispReturnWorseningAbdominalPainVomiting"),
      constipationFn("dispReturnRectalBleeding"),
    ],
    mdmAdmitObserveDischarge: [
      constipationFn("dispObservationInEd"),
      constipationFn("dispAdmissionArranged"),
    ],
  });
}

export function buildGiBleedComplaintV1Intel(
  giBleedFn: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      giBleedFn("hpiBrightRedBloodPerRectum"),
      giBleedFn("hpiBlackTarryStools"),
      giBleedFn("hpiHematemesis"),
      giBleedFn("hpiLargeVolumeBleed"),
      giBleedFn("hpiSmallVolumeBleed"),
      giBleedFn("hpiAnticoagulantUse"),
      giBleedFn("hpiAspirinUse"),
      giBleedFn("hpiDizzinessSyncope"),
      giBleedFn("hpiAbdominalPain"),
      giBleedFn("hpiDeniesChestPain"),
      giBleedFn("hpiDeniesHematemesis"),
      giBleedFn("hpiPriorGiBleedHistory"),
      giBleedFn("hpiAlcoholUseHistory"),
      giBleedFn("hpiSymptomsBeganToday"),
      giBleedFn("hpiSymptomsSeveralDays"),
    ],
    rosImportantPositives: [
      giBleedFn("rosMelena"),
      giBleedFn("rosHematochezia"),
      giBleedFn("rosDizziness"),
      giBleedFn("rosWeakness"),
      giBleedFn("rosAbdominalPain"),
    ],
    rosImportantNegatives: [
      giBleedFn("rosDeniesChestPain"),
      giBleedFn("rosDeniesHematemesis"),
      giBleedFn("rosDeniesSyncope"),
      giBleedFn("rosDeniesFever"),
    ],
    rosRedFlags: [
      giBleedFn("rfHemodynamicInstability"),
      giBleedFn("rfLargeVolumeBleed"),
      giBleedFn("rfSyncope"),
      giBleedFn("rfAlteredMentalStatus"),
    ],
    physicalExam: {
      general: [
        giBleedFn("examNoAcuteDistress"),
        giBleedFn("examPale"),
        giBleedFn("examDiaphoretic"),
        giBleedFn("examIllAppearing"),
      ],
      cardiovascular: [
        giBleedFn("examTachycardic"),
        giBleedFn("examHypotensive"),
        giBleedFn("examRegularRateAndRhythm"),
      ],
      abdomen: [
        giBleedFn("examAbdomenSoftNonTender"),
        giBleedFn("examEpigastricTenderness"),
        giBleedFn("examRectalExamPerformed"),
        giBleedFn("examGuaiacPositiveStool"),
        giBleedFn("examGuaiacNegativeStool"),
      ],
    },
    mdmWorkingAssessment: [
      giBleedFn("waGiBleedPresentation"),
      giBleedFn("waSuspectedUpperGiBleed"),
      giBleedFn("waSuspectedLowerGiBleed"),
      giBleedFn("waLowSuspicionActiveBleeding"),
      giBleedFn("waHemodynamicallyStable"),
    ],
    mdmDifferentialSynthesis: [
      giBleedFn("diffUpperGiBleed"),
      giBleedFn("diffLowerGiBleed"),
      giBleedFn("diffActiveGiBleeding"),
      giBleedFn("diffPerforatedViscus"),
      giBleedFn("diffBowelObstruction"),
      giBleedFn("diffAcuteCholecystitis"),
      giBleedFn("diffIschemicBowel"),
      giBleedFn("diffSepsis"),
    ],
    mdmDataReviewed: giSharedMdmDataReviewed(giBleedFn),
    mdmRiskStratification: [
      giBleedFn("riskMinorBleedLow"),
      giBleedFn("riskStableHemoglobinLow"),
      giBleedFn("riskModerateBleedModerate"),
      giBleedFn("riskTransfusionRequirementModerate"),
      giBleedFn("riskActiveBleedingHigh"),
      giBleedFn("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      giBleedFn("reasoningHemoglobinTrendForBleedEvaluation"),
      giBleedFn("reasoningPpiForUpperGiBleed"),
      giBleedFn("reasoningGiConsultForSignificantBleed"),
      giBleedFn("reasoningLowSuspicionActiveBleeding"),
    ],
    clinicalImpression: [
      giBleedFn("impGiBleed"),
      giBleedFn("impUpperGiBleed"),
      giBleedFn("impLowerGiBleed"),
      giBleedFn("impGiBleedUnclearSource"),
    ],
    mdmPlanSummary: [
      giBleedFn("planPpiAdministered"),
      giBleedFn("planTransfusionGiven"),
      giBleedFn("planGiConsulted"),
      giBleedFn("planHemoglobinMonitoring"),
      giBleedFn("planAdmissionArranged"),
    ],
    reassessment: [
      giBleedFn("reassessNoRepeatBleeding"),
      giBleedFn("reassessHemoglobinStable"),
      giBleedFn("reassessHemodynamicallyStable"),
      giBleedFn("reassessRepeatRectalExamStable"),
    ],
    followUpDisposition: [
      giBleedFn("dispDischargedHome"),
      giBleedFn("dispGiFollowUpArranged"),
      giBleedFn("dispReturnWorseningBleeding"),
      giBleedFn("dispReturnSyncopeDizziness"),
    ],
    mdmAdmitObserveDischarge: [
      giBleedFn("dispObservationInEd"),
      giBleedFn("dispAdmissionArranged"),
    ],
  });
}

export function buildHerniaComplaintV1Intel(
  herniaFn: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      herniaFn("hpiGroinBulge"),
      herniaFn("hpiUmbilicalBulge"),
      herniaFn("hpiBulgeSeveralDays"),
      herniaFn("hpiSuddenOnsetPain"),
      herniaFn("hpiPainWithLifting"),
      herniaFn("hpiPreviouslyReducible"),
      herniaFn("hpiNowNonreducible"),
      herniaFn("hpiNausea"),
      herniaFn("hpiVomiting"),
      herniaFn("hpiConstipation"),
      herniaFn("hpiDeniesFever"),
      herniaFn("hpiPriorHerniaRepair"),
      herniaFn("hpiSymptomsWorsening"),
    ],
    rosImportantPositives: [
      herniaFn("rosGroinPain"),
      herniaFn("rosAbdominalPain"),
      herniaFn("rosNausea"),
      herniaFn("rosVomiting"),
      herniaFn("rosConstipation"),
    ],
    rosImportantNegatives: [
      herniaFn("rosDeniesFever"),
      herniaFn("rosDeniesChestPain"),
      herniaFn("rosDeniesRectalBleeding"),
    ],
    rosRedFlags: [
      herniaFn("rfIncarcerationConcern"),
      herniaFn("rfStrangulationConcern"),
      herniaFn("rfPersistentVomiting"),
      herniaFn("rfOverlyingSkinChanges"),
    ],
    physicalExam: {
      general: [
        herniaFn("examNoAcuteDistress"),
        herniaFn("examUncomfortableAppearing"),
        herniaFn("examWellAppearing"),
      ],
      abdomen: [
        herniaFn("examGroinHerniaPresent"),
        herniaFn("examHerniaReducible"),
        herniaFn("examHerniaNonreducible"),
        herniaFn("examAbdominalSoftNonTender"),
        herniaFn("examMildAbdominalDistention"),
        herniaFn("examOverlyingErythema"),
      ],
    },
    mdmWorkingAssessment: [
      herniaFn("waHerniaPresentation"),
      herniaFn("waReducibleHernia"),
      herniaFn("waConcernForIncarceratedHernia"),
      herniaFn("waLowSuspicionStrangulation"),
      herniaFn("waLowSuspicionBowelObstruction"),
    ],
    mdmDifferentialSynthesis: [
      herniaFn("diffIncarceratedHernia"),
      herniaFn("diffStrangulatedHernia"),
      herniaFn("diffBowelObstruction"),
      herniaFn("diffPerforatedViscus"),
      herniaFn("diffAppendicitis"),
      herniaFn("diffIschemicBowel"),
      herniaFn("diffSepsis"),
    ],
    mdmDataReviewed: giSharedMdmDataReviewed(herniaFn),
    mdmRiskStratification: [
      herniaFn("riskReducibleHerniaLow"),
      herniaFn("riskStableExamLow"),
      herniaFn("riskIncarcerationConcernModerate"),
      herniaFn("riskStrangulationConcernHigh"),
      herniaFn("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      herniaFn("reasoningLowSuspicionStrangulation"),
      herniaFn("reasoningSurgicalConsultForIncarceration"),
      herniaFn("reasoningImagingForObstructionConcern"),
      herniaFn("reasoningOutpatientFollowUpForReducibleHernia"),
    ],
    clinicalImpression: [
      herniaFn("impInguinalHernia"),
      herniaFn("impUmbilicalHernia"),
      herniaFn("impIncarceratedHernia"),
      herniaFn("impHerniaUnclearType"),
    ],
    mdmPlanSummary: [
      herniaFn("planManualReductionAttempted"),
      herniaFn("planSurgicalConsulted"),
      herniaFn("planPainControlAdministered"),
      herniaFn("planAdmissionArranged"),
    ],
    reassessment: [
      herniaFn("reassessHerniaReducibleAfterReduction"),
      herniaFn("reassessPainImproved"),
      herniaFn("reassessNoVomiting"),
      herniaFn("reassessRepeatAbdominalExamBenign"),
    ],
    followUpDisposition: [
      herniaFn("dispDischargedHome"),
      herniaFn("dispSurgicalFollowUpArranged"),
      herniaFn("dispReturnWorseningPainVomiting"),
      herniaFn("dispReturnNonreducibleBulge"),
    ],
    mdmAdmitObserveDischarge: [
      herniaFn("dispObservationInEd"),
      herniaFn("dispAdmissionArranged"),
    ],
  });
}

export function buildRectalPainComplaintV1Intel(
  rectalPainFn: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      rectalPainFn("hpiRectalPainOnDefecation"),
      rectalPainFn("hpiRectalPainConstant"),
      rectalPainFn("hpiBrightRedBloodOnToiletPaper"),
      rectalPainFn("hpiConstipation"),
      rectalPainFn("hpiPerianalDrainage"),
      rectalPainFn("hpiPerianalSwelling"),
      rectalPainFn("hpiSymptomsSeveralDays"),
      rectalPainFn("hpiImmunocompromised"),
      rectalPainFn("hpiDeniesAbdominalPain"),
      rectalPainFn("hpiDeniesFever"),
      rectalPainFn("hpiDeniesLargeVolumeBleeding"),
    ],
    rosImportantPositives: [
      rectalPainFn("rosRectalPain"),
      rectalPainFn("rosBleeding"),
      rectalPainFn("rosConstipation"),
      rectalPainFn("rosPerianalSwelling"),
      rectalPainFn("rosFever"),
    ],
    rosImportantNegatives: [
      rectalPainFn("rosDeniesAbdominalDistension"),
      rectalPainFn("rosDeniesSevereAbdominalPain"),
      rectalPainFn("rosDeniesChestPain"),
    ],
    rosRedFlags: [
      rectalPainFn("rfAbscessConcern"),
      rectalPainFn("rfSignificantBleeding"),
      rectalPainFn("rfFeverWithPerianalPain"),
      rectalPainFn("rfImmunocompromisedPerianalPain"),
    ],
    physicalExam: {
      general: [
        rectalPainFn("examNoAcuteDistress"),
        rectalPainFn("examUncomfortableAppearing"),
        rectalPainFn("examWellAppearing"),
      ],
      abdomen: [
        rectalPainFn("examAbdomenSoftNonTender"),
        rectalPainFn("examNoAbdominalDistention"),
        rectalPainFn("examExternalHemorrhoidsPresent"),
        rectalPainFn("examAnalFissurePresent"),
        rectalPainFn("examRectalExamPerformed"),
        rectalPainFn("examPerianalAbscessSuspected"),
      ],
    },
    mdmWorkingAssessment: [
      rectalPainFn("waRectalPainPresentation"),
      rectalPainFn("waHemorrhoidLikely"),
      rectalPainFn("waAnalFissureLikely"),
      rectalPainFn("waLowSuspicionAbscess"),
      rectalPainFn("waLowSuspicionActiveGiBleeding"),
    ],
    mdmDifferentialSynthesis: [
      rectalPainFn("diffHemorrhoid"),
      rectalPainFn("diffAnalFissure"),
      rectalPainFn("diffActiveGiBleeding"),
      rectalPainFn("diffPerforatedViscus"),
      rectalPainFn("diffBowelObstruction"),
      rectalPainFn("diffSepsis"),
    ],
    mdmDataReviewed: giSharedMdmDataReviewed(rectalPainFn),
    mdmRiskStratification: [
      rectalPainFn("riskMinorRectalPainLow"),
      rectalPainFn("riskStableExamLow"),
      rectalPainFn("riskAbscessConcernModerate"),
      rectalPainFn("riskSignificantBleedingHigh"),
      rectalPainFn("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      rectalPainFn("reasoningStoolSoftenersForFissure"),
      rectalPainFn("reasoningIncisionDrainageForAbscess"),
      rectalPainFn("reasoningLowSuspicionActiveGiBleeding"),
      rectalPainFn("reasoningOutpatientManagementAppropriate"),
    ],
    clinicalImpression: [
      rectalPainFn("impRectalPain"),
      rectalPainFn("impHemorrhoids"),
      rectalPainFn("impAnalFissure"),
      rectalPainFn("impPerianalAbscess"),
    ],
    mdmPlanSummary: [
      rectalPainFn("planStoolSoftenersPrescribed"),
      rectalPainFn("planTopicalAnalgesiaPrescribed"),
      rectalPainFn("planIncisionDrainagePerformed"),
      rectalPainFn("planSurgicalConsulted"),
      rectalPainFn("planAdmissionArranged"),
    ],
    reassessment: [
      rectalPainFn("reassessPainImproved"),
      rectalPainFn("reassessBleedingResolved"),
      rectalPainFn("reassessToleratingOralIntake"),
      rectalPainFn("reassessNoPerianalFluctuance"),
    ],
    followUpDisposition: [
      rectalPainFn("dispDischargedHome"),
      rectalPainFn("dispSurgicalFollowUpArranged"),
      rectalPainFn("dispReturnFeverDrainage"),
      rectalPainFn("dispReturnWorseningBleeding"),
    ],
    mdmAdmitObserveDischarge: [
      rectalPainFn("dispObservationInEd"),
      rectalPainFn("dispAdmissionArranged"),
    ],
  });
}

export function buildDysphagiaComplaintV1Intel(
  dysphagiaFn: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      dysphagiaFn("hpiDifficultySwallowingSolids"),
      dysphagiaFn("hpiDifficultySwallowingLiquids"),
      dysphagiaFn("hpiFoodBoltingSensation"),
      dysphagiaFn("hpiChokingEpisode"),
      dysphagiaFn("hpiDrooling"),
      dysphagiaFn("hpiOdynophagia"),
      dysphagiaFn("hpiWeightLoss"),
      dysphagiaFn("hpiRegurgitation"),
      dysphagiaFn("hpiSymptomsSeveralDays"),
      dysphagiaFn("hpiSymptomsBeganToday"),
      dysphagiaFn("hpiDeniesFocalWeakness"),
      dysphagiaFn("hpiDeniesChestPain"),
    ],
    rosImportantPositives: [
      dysphagiaFn("rosDysphagia"),
      dysphagiaFn("rosOdynophagia"),
      dysphagiaFn("rosRegurgitation"),
      dysphagiaFn("rosWeightLoss"),
      dysphagiaFn("rosHeartburn"),
    ],
    rosImportantNegatives: [
      dysphagiaFn("rosDeniesFocalWeakness"),
      dysphagiaFn("rosDeniesChestPain"),
      dysphagiaFn("rosDeniesFever"),
    ],
    rosRedFlags: [
      dysphagiaFn("rfAirwayCompromise"),
      dysphagiaFn("rfFoodImpaction"),
      dysphagiaFn("rfInabilityToSwallowSecretions"),
      dysphagiaFn("rfProgressiveWeightLoss"),
    ],
    physicalExam: {
      general: [
        dysphagiaFn("examNoAcuteDistress"),
        dysphagiaFn("examDroolingPresent"),
        dysphagiaFn("examWellAppearing"),
      ],
      heent: [
        dysphagiaFn("examAirwayPatent"),
        dysphagiaFn("examOropharynxErythema"),
        dysphagiaFn("examNoOropharyngealMass"),
        dysphagiaFn("examNeckSupple"),
      ],
      abdomen: [dysphagiaFn("examAbdomenSoftNonTender")],
    },
    mdmWorkingAssessment: [
      dysphagiaFn("waDysphagiaPresentation"),
      dysphagiaFn("waEsophagitisLikely"),
      dysphagiaFn("waFoodImpactionConcern"),
      dysphagiaFn("waLowSuspicionPerforation"),
      dysphagiaFn("waAirwayStable"),
    ],
    mdmDifferentialSynthesis: [
      dysphagiaFn("diffEsophagealImpaction"),
      dysphagiaFn("diffEsophagitis"),
      dysphagiaFn("diffPerforatedViscus"),
      dysphagiaFn("diffAcuteCholecystitis"),
      dysphagiaFn("diffSepsis"),
    ],
    mdmDataReviewed: giSharedMdmDataReviewed(dysphagiaFn),
    mdmRiskStratification: [
      dysphagiaFn("riskMildDysphagiaLow"),
      dysphagiaFn("riskStableAirwayLow"),
      dysphagiaFn("riskEsophagitisModerate"),
      dysphagiaFn("riskImpactionModerate"),
      dysphagiaFn("riskAirwayCompromiseHigh"),
      dysphagiaFn("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      dysphagiaFn("reasoningNpoForImpactionOrEsophagitis"),
      dysphagiaFn("reasoningGiConsultForImpaction"),
      dysphagiaFn("reasoningLowSuspicionPerforation"),
      dysphagiaFn("reasoningOutpatientGiFollowUpAppropriate"),
    ],
    clinicalImpression: [
      dysphagiaFn("impDysphagia"),
      dysphagiaFn("impEsophagitis"),
      dysphagiaFn("impEsophagealFoodImpaction"),
      dysphagiaFn("impDysphagiaUnclearEtiology"),
    ],
    mdmPlanSummary: [
      dysphagiaFn("planNpoMaintained"),
      dysphagiaFn("planIvFluidsAdministered"),
      dysphagiaFn("planGiConsulted"),
      dysphagiaFn("planEndoscopyArranged"),
      dysphagiaFn("planAdmissionArranged"),
    ],
    reassessment: [
      dysphagiaFn("reassessSwallowingTrialSuccessful"),
      dysphagiaFn("reassessToleratingOralIntake"),
      dysphagiaFn("reassessAirwayStable"),
      dysphagiaFn("reassessPainImproved"),
    ],
    followUpDisposition: [
      dysphagiaFn("dispDischargedHome"),
      dysphagiaFn("dispGiFollowUpArranged"),
      dysphagiaFn("dispReturnChokingDrooling"),
      dysphagiaFn("dispReturnChestPain"),
    ],
    mdmAdmitObserveDischarge: [
      dysphagiaFn("dispObservationInEd"),
      dysphagiaFn("dispAdmissionArranged"),
    ],
  });
}

export const GI_EXTENSIONS_TEMPLATE_IDS = [
  "constipation_complaint_v1",
  "gi_bleed_complaint_v1",
  "hernia_complaint_v1",
  "rectal_pain_complaint_v1",
  "dysphagia_complaint_v1",
] as const;
